#!/usr/bin/env python3
"""Validate JSON locale files against their English source files.

The checker is read-only. It preserves literal dotted keys, so a flat key such
as ``A.B`` is not confused with a nested path ``A -> B``.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Interpolation forms used by the locale resources. Numeric placeholders use
# the single-digit %1..%9 convention; literals such as %100 are not tokens.
PLACEHOLDER_PATTERN = re.compile(
    r"\$\{[^{}]+\}"
    r"|\{\{[^{}]+\}\}"
    r"|(?<![${])\{\d+\}"
    r"|(?<![%\d])%[1-9](?!\d)"
    r"|(?<!%)%[sd]"
)
PathKey = tuple[str, ...]


@dataclass
class LocaleResult:
    """Results for one English/locale pair."""

    english_keys: int = 0
    locale_keys: int = 0
    missing: list[str] = field(default_factory=list)
    stale: list[str] = field(default_factory=list)
    empty: list[str] = field(default_factory=list)
    identical: list[str] = field(default_factory=list)
    placeholder_mismatches: list[str] = field(default_factory=list)
    invalid_values: list[str] = field(default_factory=list)
    invalid_english_values: list[str] = field(default_factory=list)
    invalid_structure: list[str] = field(default_factory=list)

    @property
    def failures(self) -> list[str]:
        return (
            self.missing
            + self.empty
            + self.placeholder_mismatches
            + self.invalid_values
            + self.invalid_english_values
            + self.invalid_structure
        )


def load_json(path: Path) -> Any:
    """Load JSON and require an object at the document root."""
    with path.open(encoding="utf-8") as stream:
        value = json.load(stream)
    if not isinstance(value, dict):
        raise ValueError("locale root must be a JSON object")
    return value


def flatten(value: dict[str, Any], prefix: PathKey = ()) -> dict[PathKey, Any]:
    """Flatten nested objects without splitting literal dotted keys."""
    result: dict[PathKey, Any] = {}
    for key, child in value.items():
        path = prefix + (key,)
        if isinstance(child, dict):
            result.update(flatten(child, path))
        else:
            result[path] = child
    return result


def object_paths(value: Any, prefix: PathKey = ()) -> set[PathKey]:
    """Return paths whose value is an object, including the root path."""
    if not isinstance(value, dict):
        return set()
    paths = {prefix}
    for key, child in value.items():
        paths.update(object_paths(child, prefix + (key,)))
    return paths


def display_path(path: PathKey) -> str:
    """Render a tuple path for human-readable reports."""
    return ".".join(path)


def placeholders(value: Any) -> list[str]:
    """Extract and sort interpolation tokens from a locale value."""
    return sorted(PLACEHOLDER_PATTERN.findall(str(value)))


def structure_conflicts(
    english: dict[str, Any], locale: dict[str, Any]
) -> list[str]:
    """Find flat-vs-nested paths that have the same dotted spelling.

    ``{"A.B": "x"}`` and ``{"A": {"B": "x"}}`` must fail even though a
    conventional string-based flattening would make them look identical.
    """
    english_leaves = flatten(english)
    locale_leaves = flatten(locale)
    english_by_spelling = {
        display_path(path): path for path in english_leaves
    }
    locale_by_spelling = {
        display_path(path): path for path in locale_leaves
    }
    conflicts = []
    for spelling in sorted(english_by_spelling.keys() & locale_by_spelling):
        if english_by_spelling[spelling] != locale_by_spelling[spelling]:
            conflicts.append(spelling)
    return conflicts


def validate(english_path: Path, locale_path: Path) -> LocaleResult:
    """Validate one EN/locale pair. JSON errors are intentionally propagated."""
    english = load_json(english_path)
    locale = load_json(locale_path)
    english_flat = flatten(english)
    locale_flat = flatten(locale)
    common = english_flat.keys() & locale_flat.keys()
    result = LocaleResult(
        english_keys=len(english_flat),
        locale_keys=len(locale_flat),
        missing=sorted(map(display_path, english_flat.keys() - locale_flat.keys())),
        stale=sorted(map(display_path, locale_flat.keys() - english_flat.keys())),
        invalid_structure=structure_conflicts(english, locale),
        invalid_english_values=[
            display_path(key)
            for key, value in english_flat.items()
            if not isinstance(value, str)
        ],
    )

    english_objects = object_paths(english)
    locale_objects = object_paths(locale)
    # Compare object paths as well as leaves. This catches an empty object
    # omitted from one locale, while the root object is ignored.
    for path in sorted((english_objects ^ locale_objects) - {()}):
        result.invalid_structure.append(display_path(path))
    # Also catch a path represented as an object on one side and a leaf on the
    # other, even when the dotted spelling happens to be the same.
    result.invalid_structure.extend(structure_conflicts(english, locale))
    result.invalid_structure = sorted(set(result.invalid_structure))

    for key in sorted(common):
        value = locale_flat[key]
        name = display_path(key)
        if not isinstance(value, str):
            result.invalid_values.append(name)
            continue
        if not value.strip():
            result.empty.append(name)
        if isinstance(english_flat[key], str):
            if value == english_flat[key] and value.strip():
                result.identical.append(name)
            if placeholders(english_flat[key]) != placeholders(value):
                result.placeholder_mismatches.append(name)

    return result


def locale_pairs(root: Path, language: str) -> list[tuple[Path, Path]]:
    """Find every locale source and pair it with the requested language."""
    pairs = []
    for english_path in sorted(root.glob("apps/**/en.json")):
        if not {"locale", "formula-lang", "functions"}.intersection(
            english_path.parts
        ):
            continue
        pairs.append((english_path, english_path.with_name(f"{language}.json")))
    return pairs


def print_items(label: str, items: list[str]) -> None:
    for item in items:
        print(f"  {label}: {item}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--language", default="pl", help="locale filename stem")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument(
        "--fail-on-stale",
        action="store_true",
        help="also fail when the locale contains keys absent from English",
    )
    parser.add_argument(
        "--report-identical",
        action="store_true",
        help="print values identical to English",
    )
    args = parser.parse_args(argv)

    pairs = locale_pairs(args.root.resolve(), args.language)
    if not pairs:
        print("No English locale files found.", file=sys.stderr)
        return 2

    failures = 0
    missing_locale_count = 0
    passed = 0
    for english_path, locale_path in pairs:
        if not locale_path.exists():
            print(f"FAIL {english_path}: missing locale file {locale_path.name}")
            failures += 1
            missing_locale_count += 1
            continue
        try:
            result = validate(english_path, locale_path)
        except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as error:
            print(f"FAIL {english_path}: invalid locale pair: {error}")
            failures += 1
            continue

        blocking = list(result.failures)
        if args.fail_on_stale:
            blocking += result.stale
        status = "PASS" if not blocking else "FAIL"
        if status == "PASS":
            passed += 1
        else:
            failures += 1
        print(
            f"{status} {english_path} "
            f"EN={result.english_keys} {args.language.upper()}={result.locale_keys} "
            f"missing={len(result.missing)} stale={len(result.stale)} "
            f"empty={len(result.empty)} invalid_values={len(result.invalid_values)} "
            f"invalid_english_values={len(result.invalid_english_values)} "
            f"invalid_structure={len(result.invalid_structure)} "
            f"placeholder_mismatches={len(result.placeholder_mismatches)} "
            f"identical={len(result.identical)}"
        )
        for label in (
            "missing",
            "empty",
            "invalid_values",
            "invalid_english_values",
            "invalid_structure",
            "placeholder_mismatches",
        ):
            print_items(label, getattr(result, label))
        if args.fail_on_stale:
            print_items("stale", result.stale)
        if args.report_identical:
            print_items("identical", result.identical)

    print(
        f"SUMMARY pairs={len(pairs)} passed={passed} failed={failures} "
        f"missing_locale_files={missing_locale_count}"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

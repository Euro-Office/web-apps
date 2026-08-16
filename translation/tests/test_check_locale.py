import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))
import check_locale


class LocaleCheckerTests(unittest.TestCase):
    def write_pair(self, english, locale):
        directory = Path(tempfile.mkdtemp())
        english_path = directory / "en.json"
        locale_path = directory / "pl.json"
        english_path.write_text(json.dumps(english), encoding="utf-8")
        locale_path.write_text(json.dumps(locale), encoding="utf-8")
        return english_path, locale_path

    def test_nested_missing_empty_stale_and_identical(self):
        english_path, locale_path = self.write_pair(
            {"A": {"translated": "Hello", "required": "Required"}},
            {"A": {"translated": "Hello", "empty": ""}},
        )
        result = check_locale.validate(english_path, locale_path)
        self.assertEqual(result.missing, ["A.required"])
        self.assertEqual(result.stale, ["A.empty"])
        self.assertEqual(result.empty, [])
        self.assertEqual(result.identical, ["A.translated"])

    def test_literal_dotted_key_and_nested_path_are_not_equivalent(self):
        english_path, locale_path = self.write_pair(
            {"DE.Controllers.ApplicationController.foo": "Foo"},
            {
                "DE": {
                    "Controllers": {
                        "ApplicationController": {"foo": "Foo"}
                    }
                }
            },
        )
        result = check_locale.validate(english_path, locale_path)
        self.assertEqual(
            result.missing, ["DE.Controllers.ApplicationController.foo"]
        )
        self.assertEqual(
            result.stale, ["DE.Controllers.ApplicationController.foo"]
        )
        self.assertIn("DE.Controllers.ApplicationController.foo", result.invalid_structure)

    def test_nested_object_vs_leaf_is_invalid_structure(self):
        english_path, locale_path = self.write_pair(
            {"A": {"B": "value"}},
            {"A": "value"},
        )
        result = check_locale.validate(english_path, locale_path)
        self.assertIn("A", result.invalid_structure)
        self.assertIn("A.B", result.missing)

    def test_placeholder_conventions(self):
        english_path, locale_path = self.write_pair(
            {"x": "{0} %1 %s %d ${name} {{token}}"},
            {"x": "{0} %2 %s %d ${name} {{token}}"},
        )
        result = check_locale.validate(english_path, locale_path)
        self.assertEqual(result.placeholder_mismatches, ["x"])

    def test_percent_number_literal_is_not_a_placeholder(self):
        english_path, locale_path = self.write_pair(
            {"x": "Discount %100 and %1"},
            {"x": "Rabat 100% i %1"},
        )
        result = check_locale.validate(english_path, locale_path)
        self.assertEqual(result.placeholder_mismatches, [])


    def test_empty_and_non_string_values(self):
        english_path, locale_path = self.write_pair(
            {"empty": "value", "number": "value"},
            {"empty": "  ", "number": 7},
        )
        result = check_locale.validate(english_path, locale_path)
        self.assertEqual(result.empty, ["empty"])
        self.assertEqual(result.invalid_values, ["number"])

    def test_malformed_json_is_rejected(self):
        directory = Path(tempfile.mkdtemp())
        english_path = directory / "en.json"
        locale_path = directory / "pl.json"
        english_path.write_text('{"x":"ok"}', encoding="utf-8")
        locale_path.write_text('{"x":', encoding="utf-8")
        with self.assertRaises(json.JSONDecodeError):
            check_locale.validate(english_path, locale_path)

    def test_missing_locale_file_is_a_failure(self):
        root = Path(tempfile.mkdtemp())
        locale_dir = root / "apps" / "demo" / "main" / "locale"
        locale_dir.mkdir(parents=True)
        (locale_dir / "en.json").write_text('{"x":"ok"}', encoding="utf-8")
        pairs = check_locale.locale_pairs(root, "pl")
        self.assertEqual(len(pairs), 1)
        self.assertFalse(pairs[0][1].exists())

        output = StringIO()
        with redirect_stdout(output):
            exit_code = check_locale.main(["--root", str(root)])
        self.assertEqual(exit_code, 1)
        self.assertIn("missing locale file pl.json", output.getvalue())
        self.assertIn("SUMMARY pairs=1", output.getvalue())

    def test_fail_on_stale_is_optional_but_supported(self):
        root = Path(tempfile.mkdtemp())
        locale_dir = root / "apps" / "demo" / "main" / "locale"
        locale_dir.mkdir(parents=True)
        (locale_dir / "en.json").write_text('{"x":"ok"}', encoding="utf-8")
        (locale_dir / "pl.json").write_text('{"x":"Dobrze", "old":"Stare"}', encoding="utf-8")
        self.assertEqual(check_locale.main(["--root", str(root)]), 0)
        self.assertEqual(check_locale.main(["--root", str(root), "--fail-on-stale"]), 1)

    def test_real_eurooffice_files_are_parseable_without_count_invariants(self):
        root = Path(__file__).parents[2]
        for relative in (
            "apps/documenteditor/mobile/locale/en.json",
            "apps/documenteditor/mobile/locale/pl.json",
        ):
            value = check_locale.load_json(root / relative)
            self.assertIsInstance(value, dict)
            self.assertTrue(value)

    def test_small_realistic_fixture(self):
        fixture_root = Path(__file__).parent / "fixtures"
        result = check_locale.validate(
            fixture_root / "en.json", fixture_root / "pl.json"
        )
        self.assertEqual(result.missing, ["Common.textMissing"])
        self.assertEqual(result.placeholder_mismatches, [])


if __name__ == "__main__":
    unittest.main()

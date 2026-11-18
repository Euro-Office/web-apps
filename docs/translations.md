<!--
SPDX-FileCopyrightText: 2026 Euro-Office contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

# Translations

The editor UI is translated on [Hosted Weblate](https://hosted.weblate.org/projects/euro-office/). Please translate there instead of opening pull requests against the locale files.

## Translate a string

1. Sign in on [hosted.weblate.org](https://hosted.weblate.org/) and open the [Euro-Office project](https://hosted.weblate.org/projects/euro-office/).
2. To find a string you saw in the editor, search the whole project for its English text, for example [`Tab style`](https://hosted.weblate.org/search/euro-office/?q=source%3A%22Tab+style%22). The result shows the component (for example *Document Editor* or *Spreadsheet Editor (mobile)*) and the key.
3. Pick your language and save the translation. A language that is missing can be added from the component page.

Weblate commits translations after 24 hours and opens or updates a single `chore(l10n): update translations` pull request here. Once it is merged the translation ships in the next build.

## What lives where

| What | Files | Where to change it |
|---|---|---|
| Editor UI (desktop, mobile, embed, forms, PDF, Visio) | `apps/*/{main,mobile,embed,forms}/locale/<lang>.json` | Weblate |
| English source strings | `apps/*/*/locale/en.json` | Pull request together with the code that uses them |
| Spreadsheet function names and descriptions | `apps/spreadsheeteditor/main/resources/formula-lang/*.json` | Pull request (not on Weblate) |
| Help pages | `apps/*/main/resources/help/` | Pull request (not on Weblate) |

## For developers

- Add new keys to `en.json` only. Weblate picks them up from `main` and offers them to translators.
- Don't edit other languages' files for keys that are on Weblate: Weblate would overwrite the change or the next translations pull request would conflict.
- The locale files use 2-space indentation, Weblate writes the same.

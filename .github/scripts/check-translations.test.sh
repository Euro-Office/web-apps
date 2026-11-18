#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Euro-Office contributors
# SPDX-License-Identifier: AGPL-3.0-only

# Self-check of check-translations.sh: each line is the expected exit code and a changed path

cd "$(dirname "$0")" || exit 1
failed=0
check() {
  local want=$1 got
  shift
  printf "%s\n" "$@" | ./check-translations.sh >/dev/null
  got=$?
  if [[ $got != "$want" ]]; then
    echo "FAIL: expected exit $want, got $got for: $*"
    failed=1
  fi
}

while read -r want file; do
  check "$want" "$file"
done <<EOF
1 apps/documenteditor/main/locale/de.json
1 apps/documenteditor/embed/locale/pt-BR.json
1 apps/documenteditor/forms/locale/zh.json
1 apps/pdfeditor/main/locale/fr.json
1 apps/spreadsheeteditor/mobile/locale/it.json
1 apps/visioeditor/mobile/locale/sr-Latn-RS.json
0 apps/documenteditor/main/locale/en.json
0 apps/presentationeditor/mobile/locale/en.json
0 apps/spreadsheeteditor/main/resources/formula-lang/de.json
0 apps/spreadsheeteditor/main/resources/formula-lang/de_desc.json
0 apps/spreadsheeteditor/mobile/locale/l10n/functions/de.json
0 apps/documenteditor/main/app/view/FileMenu.js
0 apps/documenteditor/main/locale/de.json.bak
EOF

# a violation among allowed files fails, no changes pass
check 1 apps/documenteditor/main/locale/en.json apps/documenteditor/main/locale/de.json
check 0 ''

(( failed )) || echo ok
exit $failed

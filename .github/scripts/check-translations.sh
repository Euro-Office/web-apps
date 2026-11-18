#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Euro-Office contributors
# SPDX-License-Identifier: AGPL-3.0-only

# Reads changed paths from stdin and checks them against the translations Weblate manages
# (https://hosted.weblate.org/projects/euro-office/).
# Default: fails on a changed translation, a PR changes only the English source.
# --only-translations: fails unless every path is a translation, used to auto-approve Weblate's PRs.

managed='^apps/[^/]+/(main|embed|forms|mobile)/locale/[^/]+\.json$'
source='/en\.json$'

only_translations=0
[[ ${1:-} == --only-translations ]] && only_translations=1

failed=0
count=0
while IFS= read -r file; do
  [[ -z $file ]] && continue
  count=$((count + 1))
  if [[ $file =~ $managed && ! $file =~ $source ]]; then
    if (( ! only_translations )); then
      echo "::error file=$file::$file is translated on Weblate, change only the English source"
      failed=1
    fi
  elif (( only_translations )); then
    echo "$file is not a translation managed on Weblate"
    failed=1
  fi
done
(( only_translations && count == 0 )) && failed=1
exit $failed

import sys
import json
import os.path
from pathlib import Path

lost_key_count, sum_key_count = 0, 0

merge_dicts = True
verbose_out = False
report_untranslated = False
#path_to_compare = "../apps/documenteditor/mobile/locale"
path_to_compare = "../apps"
#json_pattern = f'{path_to_compare}/en.json'

cmd_args = sys.argv[1:]
for i in cmd_args:
    if i == '--check':
	    merge_dicts = False
    elif i == '--verbose':
        verbose_out = True
    elif i == '--untranslated':
        merge_dicts = False
        report_untranslated = True
    elif i[:2] != '--' and os.path.isdir(i):
        path_to_compare = i
        #json_pattern = f'{path_to_compare}/en.json'

def flattenDict(d, prefix=''):
    items = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            items.update(flattenDict(v, key))
        else:
            items[key] = v
    return items

def countUntranslated(master_dict, locale_path):
    with open(locale_path, 'r', encoding='utf-8') as f:
        locale_dict = json.load(f)

    en_flat = flattenDict(master_dict)
    loc_flat = flattenDict(locale_dict)

    total = len(en_flat)
    untranslated = 0
    untranslated_keys = []

    for key, en_val in en_flat.items():
        if key in loc_flat and loc_flat[key] == en_val:
            untranslated += 1
            untranslated_keys.append(key)

    return total, untranslated, untranslated_keys

def compareDicts(keypath, dict1, dict2):
    global lost_key_count, sum_key_count

    for k, v in dict1.items():
        k_path = f'{keypath}{"." if len(keypath) else ""}{k}'
        if isinstance(v, dict):
            if k not in dict2:
                dict2[k] = {}

            dict2[k] = compareDicts(k_path, v, dict2[k])
        else:
            sum_key_count += 1
            if not k.startswith("del_") and k not in dict2:
                lost_key_count += 1
                dict2[k] = v
                if verbose_out: print(f'  key {k_path} not exists')
    return dict2

def compareFile(mjson, path):
    with open(path, 'r+', encoding='utf-8') as cf:
        res_dict = compareDicts('', mjson, json.load(cf))

        if merge_dicts and lost_key_count:
            cf.seek(0)
            cf.write(json.dumps(res_dict, indent = 2, ensure_ascii=False))
            cf.truncate()

def compareJsonInFolder(path):
    global lost_key_count, sum_key_count

    cwd = os.path.dirname(path)
    with open(path, 'r', encoding="utf-8") as pf:
        master_dict = json.load(pf)

        results = {}
        files = [f for f in os.listdir(cwd) if os.path.isfile(os.path.join(cwd, f))]
        for f in files:
            lang = Path(f).stem
            if lang != 'en' and Path(f).suffix == '.json':
                locale_path = f'{cwd}/{f}'

                if report_untranslated:
                    total, untranslated, keys = countUntranslated(master_dict, locale_path)
                    results[lang] = {'lost': 0, 'from': total, 'untranslated': untranslated, 'untranslated_keys': keys}
                    if verbose_out and keys:
                        print(f'{f}:')
                        for k in keys:
                            print(f'  {k}')
                else:
                    if verbose_out: print(f'{f} is processing...')
                    lost_key_count, sum_key_count = 0, 0
                    compareFile(master_dict, locale_path)
                    results[lang] = {'lost': lost_key_count, 'from': sum_key_count}

        return results

def print_table(editor, results, max_width=120):
    if not results:
        return

    from_vals = set(r['from'] for r in results.values())
    total_keys = from_vals.pop() if len(from_vals) == 1 else None

    langs = sorted(results.keys())
    show_untranslated = 'untranslated' in next(iter(results.values()))

    # Header
    if show_untranslated:
        total_untrans = sum(r['untranslated'] for r in results.values())
        total_possible = sum(r['from'] for r in results.values())
        pct = (total_untrans / total_possible * 100) if total_possible else 0
        print(f'{editor} — untranslated keys by locale ({total_keys} keys, {pct:.1f}% untranslated)')
    else:
        total_lost = sum(r['lost'] for r in results.values())
        total_possible = sum(r['from'] for r in results.values())
        pct = (total_lost / total_possible * 100) if total_possible else 0
        print(f'{editor} — Translation keys by locale ({total_keys} keys, {total_lost} untranslated, {pct:.1f}%)')

    # Inline format: lang: value (%), lang: value (%), ... sorted by worst first
    if show_untranslated:
        langs = sorted(langs, key=lambda l: results[l]['untranslated'], reverse=True)
        entries = []
        for l in langs:
            r = results[l]
            pct = (r['untranslated'] / r['from'] * 100) if r['from'] else 0
            entries.append(f'{l}: {r["untranslated"]} ({pct:.0f}%)')
        _print_wrapped(entries, max_width, indent=2)
    else:
        langs = sorted(langs, key=lambda l: results[l]['lost'], reverse=True)
        entries = []
        for l in langs:
            r = results[l]
            pct = (r['lost'] / r['from'] * 100) if r['from'] else 0
            entries.append(f'{l}: {r["lost"]} ({pct:.0f}%)')
        _print_wrapped(entries, max_width, indent=2)

    print()

def _print_wrapped(entries, max_width, indent=2):
    prefix = ' ' * indent
    line = prefix
    for i, entry in enumerate(entries):
        addition = entry if i == 0 else ', ' + entry
        if len(line) + len(addition) > max_width:
            print(line + ',')
            line = prefix + entry
        else:
            line += addition
    if line.strip():
        print(line)


if os.path.exists(f'{path_to_compare}/en.json'):
    results = compareJsonInFolder(f'{path_to_compare}/en.json')
    editor = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(f'{path_to_compare}/en.json'))))
    print_table(editor, results)
else:
    for editor in ['documenteditor','spreadsheeteditor','presentationeditor','pdfeditor','visioeditor']:
        path = f'{path_to_compare}/{editor}/main/locale/en.json'
        if os.path.exists(path):
            results = compareJsonInFolder(path)
            print_table(editor, results)
        else: print(f'wrong path: {path}')

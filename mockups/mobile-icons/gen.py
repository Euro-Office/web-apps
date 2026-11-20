import re, os, glob, base64, html

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = SRC = HERE
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))

sym = {}
for e in ['common', 'documenteditor', 'presentationeditor', 'spreadsheeteditor']:
    s = open(f'{REPO}/apps/{e}/main/resources/img/toolbar/icons.svg').read()
    for m in re.finditer(r'<symbol\b[^>]*>.*?</symbol>', s, re.S):
        t = m.group(0)
        sym.setdefault(re.search(r'id="([^"]+)"', t).group(1), t)

used = set()
def ic(i, size=32, cls=''):
    used.add(i)
    return f'<svg class="icon {cls}" width="{size}" height="{size}"><use href="#{i}"/></svg>'

def b64(path, mime='image/png'):
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()

crop = lambda n: f'<img class="crop" src="{b64(f"{SRC}/crops/{n}.png")}">'

BRAND = {'light': {'de': '#446995', 'pe': '#BE664F', 'sse': '#40865C'},
         'dark': {'de': '#208BFF', 'pe': '#FE8C33', 'sse': '#34C759'}}

def bar(platform, editor, theme, mode='edit'):
    c = BRAND[theme][editor]
    if platform == 'ios':
        style = f'--fg:{c};--bg:{"#fff" if theme == "light" else "#232323"}'
        lead = '<span class="btn txt">OK</span>' if editor == 'de' else f'<span class="btn">{ic("btn-goback")}</span>'
        more = 'btn-more'
    else:
        style = f'--fg:{"#fff" if theme == "light" else c};--bg:{c if theme == "light" else "#232323"}'
        lead = f'<span class="btn">{ic("btn-goback")}</span>'
        more = 'btn-more-vertical'
    right = (['btn-play'] if editor == 'pe' else []) + ['btn-edit', 'btn-zoomup', 'btn-users-share', more]
    dis = ' dis' if editor == 'sse' and platform == 'ios' else ''
    btns = ''.join(f'<span class="btn{dis if i == "btn-zoomup" else ""}">{ic(i)}</span>' for i in right)
    return (f'<div class="bar {platform}" style="{style}">{lead}'
            f'<span class="btn dis">{ic("btn-undo")}</span><span class="btn dis">{ic("btn-redo")}</span>'
            f'<span class="sp"></span>{btns}</div>')

def tabs(theme, editor='de'):
    c = BRAND[theme][editor]
    bg = '#fff' if theme == 'light' else '#232323'
    on = '#fff' if theme == 'light' else '#000'
    return (f'<div class="tabs" style="--fg:{c};--bg:{bg};--on:{on}"><div class="seg">'
            f'<span>{ic("btn-menu-table")}</span><span>{ic("btn-menu-shape")}</span><span class="act">{ic("btn-more")}</span>'
            f'</div><span class="btn">{ic("btn-arrow-down")}</span></div>')

def rows(items, theme, editor, platform, chev=(), twotone=False):
    c = BRAND[theme][editor]
    cls = 'list ' + platform + (' twotone' if twotone else '')
    out = f'<div class="{cls} {theme}" style="--fg:{c}">'
    for label, i in items:
        glyph = ic(i) if i else '<span class="gap" title="no web icon"></span>'
        out += f'<div class="row"><span class="li">{glyph}</span><span class="lt">{label}</span>{"<span class=chev>›</span>" if label in chev else ""}</div>'
    return out + '</div>'

SETTINGS = [('', 'btn-goback'), ('Find and Replace', 'btn-menu-search'), ('Spreadsheet Settings', 'btn-menu-table'),
            ('Application Settings', 'btn-settings'), ('Version History', 'btn-version-history'),
            ('Download', 'btn-download'), ('Print', 'btn-print'), ('Spreadsheet Info', 'btn-properties'),
            ('Help', 'btn-help'), ('About', 'btn-menu-about'), ('Feedback &amp; Support', 'btn-menu-support')]
SET_CHEV = ('Spreadsheet Settings', 'Application Settings', 'Download', 'Spreadsheet Info', 'About')
ADD = [('Comment', 'btn-menu-comments'), ('Image', 'btn-menu-image'), ('Link', 'btn-inserthyperlink'),
       ('Page Number', 'btn-pagenum'), ('Break', 'btn-pagebreak'), ('Table of Contents', 'btn-contents'),
       ('Footnote', None), ('Drawing', 'btn-pen-tool')]
ADD_CHEV = ('Image', 'Link', 'Page Number', 'Break', 'Table of Contents', 'Footnote')

def settings_screen(theme='light', twotone=False):
    c = BRAND[theme]['sse']
    head = f'<div class="appbar" style="--bg:{c}"><span>protected.xlsx</span><span>Done</span></div>'
    return head + rows(SETTINGS, theme, 'sse', 'android', SET_CHEV, twotone)

# ---- mapping: mobile icon (folder/name without -rtl) -> (web id or None, note)
MAP = {
 'accept-changes': 'btn-review-save', 'reject-changes': 'btn-review-deny',
 'add-image': 'btn-insertimage', 'add-other': 'btn-more', 'add-shape': 'btn-menu-shape', 'add-table': 'btn-menu-table',
 'close': 'btn-close', 'close-comment': 'btn-close', 'edit': 'btn-edit', 'edit-settings': 'btn-edit',
 'expand-down': 'btn-arrow-down', 'expand-up': 'btn-arrow-up', 'feedback': 'btn-email',
 'hide-password': 'btn-hide-password', 'image-library': 'btn-insertimage', 'insert-comment': 'btn-add-comment',
 'link': 'btn-inserthyperlink', 'next': 'btn-nextitem', 'prev': 'btn-previtem',
 'next-change': 'btn-review-next', 'prev-change': 'btn-review-prev', 'pagebreak': 'btn-pagebreak',
 'pagenumber': 'btn-pagenum', 'plus': 'btn-zoomup', 'redo': 'btn-redo', 'undo': 'btn-undo',
 'resolve-comment': 'btn-resolve-all', 'return': 'btn-goback', 'review': 'btn-ic-review', 'review-changes': 'btn-ic-review',
 'ios/settings': 'btn-more', 'android/settings': 'btn-more-vertical', 'android/menu-comment': 'btn-more-vertical',
 'ios/menu-comment': 'btn-more',
 'about': 'btn-menu-about', 'app-settings': 'btn-settings', 'bullets': 'btn-setmarkers', 'collaboration': 'btn-users-share',
 'copy': 'btn-copy', 'cut': 'btn-cut', 'paste': 'btn-paste', 'de-indent': 'btn-decoffset', 'in-indent': 'btn-incoffset',
 'distribute-columns': 'btn-distribute-columns', 'distribute-rows': 'btn-distribute-rows', 'download': 'btn-download',
 'export': 'btn-share', 'help': 'btn-help', 'image': 'btn-menu-image', 'image-storage': 'btn-open', 'info': 'btn-properties',
 'linespacing': 'btn-linespace', 'move-background': 'btn-arrange-back', 'move-backward': 'btn-arrange-backward',
 'move-foreground': 'btn-arrange-front', 'move-forward': 'btn-arrange-forward', 'numbers': 'btn-numbering',
 'print': 'btn-print', 'remove-style': 'btn-clearstyle', 'search': 'btn-menu-search', 'common/settings': 'btn-properties',
 'sharing-settings': 'btn-ic-sharing', 'spellcheck': 'btn-ic-docspell',
 'table-borders-all': 'btn-border-all', 'table-borders-bottom': 'btn-border-bottom', 'table-borders-center': 'btn-border-insidevert',
 'table-borders-inner': 'btn-border-inside', 'table-borders-left': 'btn-border-left', 'table-borders-middle': 'btn-border-insidehor',
 'table-borders-none': 'btn-border-no', 'table-borders-outer': 'btn-border-out', 'table-borders-right': 'btn-border-right',
 'table-borders-top': 'btn-border-top',
 'text-align-center': 'btn-align-center', 'text-align-just': 'btn-align-just', 'text-align-left': 'btn-align-left',
 'text-align-right': 'btn-align-right', 'text-bold': 'btn-bold', 'text-italic': 'btn-italic', 'text-underline': 'btn-underline',
 'text-strikethrough': 'btn-strikeout', 'text-color': 'btn-fontcolor', 'text-direction-context': 'btn-context',
 'text-direction-ltr': 'btn-ltr', 'text-direction-rtl': 'btn-rtl', 'text-orientation-angleclock': 'btn-text-orient-cw',
 'text-orientation-anglecount': 'btn-text-orient-ccw', 'text-orientation-horizontal': 'btn-text-orient-hor',
 'text-orientation-rotatedown': 'btn-text-orient-rdown', 'text-orientation-rotateup': 'btn-text-orient-rup',
 'text-orientation-vertical': 'btn-text-orient-vertical', 'text-valign-bottom': 'btn-align-bottom',
 'text-valign-middle': 'btn-align-middle', 'text-valign-top': 'btn-align-top', 'users': 'btn-users-share',
 'version-history': 'btn-version-history',
 'draw': 'btn-pen-tool', 'draw-pen': 'btn-pen-tool', 'draw-highlighter': 'btn-highlighter-tool', 'clear-all': 'btn-clear-all',
 'clear-object': 'btn-eraser', 'scroll': 'btn-hand-tool', 'switch-desktop': 'btn-switch-mobile', 'versions': 'btn-ic-history',
}
GAPS = {
 'Plain checkmark (done, resolve)': ['check', 'done', 'done-disabled', 'done-comment', 'done-comment-white', 'resolve-comment-check', 'burger'],
 'Breaks': ['sectionbreak', 'stringbreak'],
 'Table rows and columns': ['table-add-column-left', 'table-add-column-right', 'table-add-row-above', 'table-add-row-below', 'table-remove-column', 'table-remove-row'],
 'List style presets': [f'numbers{i}' for i in range(1, 8)],
 'Misc': ['show-password', 'goto', 'cancellation', 'reader', 'text-additional', 'text-selection'],
 'File formats': ['pdf', 'pdfa'],
}
gapnames = {n for v in GAPS.values() for n in v}

M = REPO + '/apps/common/mobile/resources/icons'
files = sorted(glob.glob(M + '/**/*.svg', recursive=True))
def key(f):
    rel = os.path.relpath(f, M).replace('.svg', '').replace('icon-', '')
    return rel, rel.split('/')[-1].replace('-rtl', '')
mapped, gaps_files, unmapped = [], [], []
for f in files:
    rel, base = key(f)
    folder = rel.split('/')[0]
    name = rel.split('/')[-1]
    if name in MAP:
        base = name
    w = MAP.get(f'{folder}/{base}') or MAP.get(base)
    if base in gapnames:
        gaps_files.append(rel)
    elif w:
        mapped.append((rel, w))
    else:
        unmapped.append(rel)
assert not unmapped, unmapped
for i in set(MAP.values()):
    assert i in sym, i

PATH = {key(f)[0]: f for f in files}
mpath = PATH.__getitem__

def mimg(rel):
    return f'<img src="{b64(mpath(rel), "image/svg+xml")}" width="24" height="24">'

# mapping table, one row per non-rtl mobile icon, dedupe identical ios/android names
seen = {}
for rel, w in mapped:
    if rel.endswith('-rtl'):
        continue
    base = rel.split('/')[-1]
    seen.setdefault((base, w), []).append(rel)
map_rows = ''.join(
    f'<tr><td>{"".join(mimg(r) for r in rels)}</td><td>{", ".join(rels)}</td><td>{ic(w, 24, "tt")}</td><td><code>{w}</code></td></tr>'
    for (base, w), rels in sorted(seen.items()))
gap_rows = ''.join(
    f'<tr><td>{g}</td><td>{"".join(mimg(r) for r in sorted({x for x in gaps_files if x.split("/")[-1].replace("-rtl","") in names and not x.endswith("-rtl")}))}</td>'
    f'<td>{", ".join(names)}</td></tr>' for g, names in GAPS.items())
n_files = len(files)
n_gap_files = len(gaps_files)
n_gap_unique = len({g.split('/')[-1].replace('-rtl', '') for g in gaps_files})

# ---- sections
before_after = f'''
<section id="before-after"><h1>Option 1: web editor icons on mobile <small>left: today, right: mockup</small></h1>
<div class="pair"><div><h2>Today</h2>{crop("ios-de-bar")}{crop("ios-pe-bar")}{crop("android-sse-bar")}{crop("ios-add-tabs")}{crop("android-settings")}</div>
<div><h2>Web icons</h2>{bar("ios","de","light")}{bar("ios","pe","light")}{bar("android","sse","light")}{tabs("light")}<div class="screen">{settings_screen()}</div></div></div>
</section>'''

def variant(platform, theme):
    t = 'iOS' if platform == 'ios' else 'Android'
    bars = ''.join(bar(platform, e, theme) for e in ('de', 'pe', 'sse'))
    lst = rows(SETTINGS[1:7], theme, 'de' if platform == 'ios' else 'sse', platform)
    return f'<div class="var {theme}"><h2>{t}, {theme}</h2>{bars}{tabs(theme)}{lst}</div>'

variants = f'''
<section id="variants"><h1>Variants <small>44px targets on iOS, 48px on Android, web symbols drawn at 32px (glyph about 20px), colours from the mobile theme tokens</small></h1>
<div class="grid">{variant("ios","light")}{variant("ios","dark")}{variant("android","light")}{variant("android","dark")}</div></section>'''

STRIP = ['btn-undo', 'btn-edit', 'btn-zoomup', 'btn-users-share', 'btn-menu-search', 'btn-download', 'btn-print', 'btn-help']
size_strip = ''.join(
    f'<div class="srow"><span class="slab">{lab}</span>' + ''.join(ic(i, sz, cls) for i in STRIP) + '</div>'
    for lab, sz, cls in [('24px as in the web sprite, 1px stroke', 24, ''), ('32px, stroke scales to 1.33px (used above)', 32, ''),
                         ('32px, stroke kept at 1px', 32, 'nss')])
size_strip = f'<div class="srow"><span class="slab">Today (mobile set, 24px)</span>' + ''.join(
    mimg(r).replace('<img', '<img class="mob"') for r in ['ios/undo', 'ios/edit-settings', 'ios/plus', 'common/collaboration',
                     'common/search', 'common/download', 'common/print', 'common/help']) + '</div>' + size_strip

lists = f'''
<section id="lists"><h1>Lists <small>Add panel and settings menu</small></h1>
<div class="pair4"><div><div class="pair4"><div><h2>Today</h2>{crop("ios-add-list")}</div><div><h2>Web icons, brand colour</h2>{rows(ADD,"light","de","ios",ADD_CHEV)}</div>
<div><h2>Web icons, web two-tone</h2>{rows(ADD,"light","de","ios",ADD_CHEV,True)}</div></div>
<h2 style="margin-top:20px">Size and stroke</h2><div class="sizes">{size_strip}</div></div>
<div><h2>Settings, web two-tone</h2><div class="screen">{settings_screen("light", True)}</div></div></div>
<p class="note">Dashed box: no web icon yet (Footnote). Spreadsheet Info uses <code>btn-properties</code>, the web set has no document info icon.</p></section>'''

mapping = f'''
<section id="mapping"><h1>Mapping <small>{n_files} mobile SVGs ({len(mapped)} mapped, {n_gap_files} without a web equivalent, {n_gap_unique} unique names after folding ios/android/rtl)</small></h1>
<h2>No web equivalent yet</h2><table>{gap_rows}</table>
<h2>Mobile icon to web symbol</h2><table class="map"><tr><th>Mobile</th><th>File (rtl variants folded)</th><th>Web</th><th>Symbol id</th></tr>{map_rows}</table></section>'''

css = open(SRC + '/iconcss.css').read()
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mobile icon mockup</title><style>{css}
body{{margin:0;padding:24px;background:#f5f5f5;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#222}}
h1{{font-size:18px;margin:0 0 12px}} h1 small{{font-weight:400;color:#666;font-size:13px;margin-left:8px}} h2{{font-size:13px;color:#555;margin:0 0 6px;font-weight:600}}
section{{margin-bottom:40px}} .crop{{display:block;margin-bottom:12px}}
.pair{{display:flex;gap:32px}} .pair>div{{width:412px}} .pair4{{display:flex;gap:24px;align-items:flex-start}} .pair4>div{{width:412px}} .pair4>div:has(>.pair4){{width:auto}}
/* web icons take the bar colour: both tones map to --fg */
.bar,.tabs,.list:not(.twotone){{--icon-gray-primary:var(--fg);--icon-blue-primary:var(--fg);--icon-blue-secondary:var(--fg)}}
.bar svg.icon,.tabs svg.icon,.list svg.icon{{color:var(--icon-gray-primary)}}
.bar{{display:flex;align-items:center;background:var(--bg);margin-bottom:12px}}
.bar.ios{{height:44px;width:393px}} .bar.ios .btn{{width:44px;height:44px}}
.bar.android{{height:56px;width:412px;padding-right:10px;box-sizing:border-box}} .bar.android .btn{{width:48px;height:48px;margin-left:2px}} .bar.android .btn:first-child{{margin-left:0}}
.btn{{display:inline-flex;align-items:center;justify-content:center;flex:none}} .btn.dis{{opacity:.4}} .sp{{flex:1}}
.btn.txt{{color:var(--fg);font-size:17px}}
.tabs{{display:flex;align-items:center;width:393px;height:44px;background:var(--bg);padding-left:8px;box-sizing:border-box;margin-bottom:12px}}
.seg{{display:flex;width:342px;height:32px;border:1px solid var(--fg);border-radius:6px;overflow:hidden;box-sizing:border-box}}
.seg span{{flex:1;display:flex;align-items:center;justify-content:center;border-left:1px solid var(--fg)}} .seg span:first-child{{border-left:0}}
.seg .act{{background:var(--fg);--icon-gray-primary:var(--on);--icon-blue-primary:var(--on)}}
.list{{background:#fff;width:393px;margin-bottom:12px}} .list.android{{width:412px}}
.list.dark{{background:#232323;color:rgba(255,255,255,.87)}}
.row{{display:flex;align-items:center;height:44px;position:relative}} .list.android .row{{height:48px}}
.row+.row:after{{content:"";position:absolute;left:56px;right:0;top:0;border-top:1px solid rgba(60,60,67,.15)}}
.list.dark .row+.row:after{{border-color:rgba(84,84,88,.5)}}
.li{{width:56px;display:flex;justify-content:center;padding-right:0;box-sizing:border-box;padding-left:0}} .li svg{{margin-left:-4px}}
.lt{{flex:1;font-size:16px}} .chev{{color:#999;font-size:24px;padding-right:14px;line-height:1}}
.gap{{display:inline-block;width:22px;height:22px;border:1.5px dashed #d33;border-radius:3px;margin-left:-4px}}
.appbar{{display:flex;justify-content:space-between;align-items:center;height:56px;background:var(--bg);color:#fff;padding:0 16px;font-size:20px;width:412px;box-sizing:border-box}}
.appbar span:last-child{{font-size:15px}}
.screen{{width:412px;background:#EFF0F5}}
.grid{{display:grid;grid-template-columns:repeat(2,436px);gap:20px}} .var{{padding:12px;background:#EFF0F5;border-radius:8px}} .var.dark{{background:#131313}} .var.dark h2{{color:#bbb}}
.var .list{{margin-bottom:0}}
table{{border-collapse:collapse;background:#fff;margin-bottom:16px;font-size:12px}} td,th{{border:1px solid #ddd;padding:3px 6px;text-align:left;vertical-align:middle}} td img{{margin-right:4px;vertical-align:middle}}
/* nss: preview with 1px stroke regardless of scale */
svg.nss path{{vector-effect:non-scaling-stroke}}
.sizes{{background:#fff;padding:8px 12px;width:max-content;--icon-gray-primary:#446995;--icon-blue-primary:#446995}}
.sizes svg.icon{{color:var(--icon-gray-primary)}}
.srow{{display:flex;align-items:center;gap:12px;height:44px}} .slab{{width:260px;font-size:12px;color:#555}}
.srow img.mob{{width:24px;height:24px;margin:0 4px;filter:invert(36%) sepia(17%) saturate(1200%) hue-rotate(176deg) brightness(92%)}}
.note{{color:#555;font-size:12px}}
body.only section{{display:none}} body.only section.on{{display:block}}
</style></head><body>
<svg width="0" height="0" style="position:absolute">{"".join(sym[i] for i in sorted(used))}</svg>
{before_after}{variants}{lists}{mapping}
<script>const h=location.hash.slice(1);if(h){{document.body.classList.add('only');document.getElementById(h).classList.add('on')}}</script>
</body></html>'''
open(OUT + '/mockup-467.html', 'w').write(page)
print('files', n_files, 'mapped', len(mapped), 'gapfiles', n_gap_files, 'gapunique', n_gap_unique, 'symbols', len(used))

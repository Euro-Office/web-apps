// Theme configuration for mobile webpack builds.
// Reads theme/meta/config.json and provides LESS globalVars and DefinePlugin overrides.
// Kept separate from webpack.config.js to minimise upstream merge conflicts.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LOAD_BEARING } from './replacements.manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// __dirname = web-apps/build/, so '..' reaches web-apps root
const rootDir = path.join(__dirname, '..');

const theme = process.env.THEME || 'euro-office';
const configPath = path.join(rootDir, 'theme', theme, 'meta', 'config.json');

let meta = {};
if (fs.existsSync(configPath)) {
  meta = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Copy theme LESS to neutral stub paths that the upstream LESS files import.
// Runs once at module load (before webpack starts). Generates an empty stub when the theme
// has no file so the @import in the upstream file always resolves.
function copyOverride(src, dst) {
  try {
    if (fs.existsSync(src)) fs.copyFileSync(src, dst);
    else fs.writeFileSync(dst, '// no theme override\n');
  } catch (e) { console.warn(`[theme.config] override copy failed (${path.basename(dst)}):`, e.message); }
}

const themeAssetsLess = path.join(rootDir, 'theme', theme, 'assets', 'less');

// Mobile overrides — imported by each mobile editor's app.less via _theme-mobile-overrides.less
copyOverride(
  path.join(themeAssetsLess, 'overrides', 'mobile-overrides.less'),
  path.join(rootDir, 'apps', 'common', 'mobile', 'resources', 'less', '_theme-mobile-overrides.less'),
);

// Desktop theme entry — imported last by each desktop editor's app.less via _theme-main.less.
// theme.less imports overrides.less which imports each override file; adding a new override
// is purely a theme concern (add file, add @import to overrides.less — no build changes needed).
// We generate a redirector stub (not a copy) so that theme.less's own relative @imports
// (e.g. overrides.less) resolve from the theme directory, not from common/main/resources/less/.
{
  const themeLess = path.join(themeAssetsLess, 'theme.less');
  const stubDst   = path.join(rootDir, 'apps', 'common', 'main', 'resources', 'less', '_theme-main.less');
  try {
    if (fs.existsSync(themeLess)) {
      const rel = path.relative(path.dirname(stubDst), themeLess).replace(/\\/g, '/');
      fs.writeFileSync(stubDst, `@import "${rel}";\n`);
    } else {
      fs.writeFileSync(stubDst, '// no theme\n');
    }
  } catch (e) { console.warn('[theme.config] _theme-main.less stub failed:', e.message); }
}

// Resolve a brand value with priority: env var > config.json > default.
// Empty string in config.json is respected (explicit "hide this"), matching
// build/Gruntfile.js _themVal semantics on the desktop side.
function themeVal(envVal, metaKey, defaultVal) {
  if (envVal != null && envVal !== '') return envVal;
  if (metaKey in meta) return meta[metaKey];
  return defaultVal;
}

/**
 * Asserts that PRODUCT_VERSION is set to a real version at build time.
 * Throws at webpack config evaluation time (before any module processing)
 * if the raw env var is missing or the sentinel value '0.0.0'.
 * Call at the top of each webpack config, before building the config object.
 */
export function assertBuildEnv() {
  const raw = process.env.PRODUCT_VERSION;
  if (!raw || raw === '0.0.0') {
    throw new Error(
      `[build] PRODUCT_VERSION is ${raw ? `"${raw}"` : 'unset'} — set it to the DS version (e.g. 9.2.1).\n` +
      '  In dev: export PRODUCT_VERSION=9.2.1'
    );
  }
}

/**
 * Returns additional LESS globalVars for theme logo paths.
 * @param {string} env - 'production' or 'development'
 * @param {string} editor - editor name (e.g. 'documenteditor')
 */
export function themeGlobalVars(env, editor) {
  const base = env === 'production'
    ? `../../../${editor}/mobile/resources/img`
    : '../../common/mobile/resources/img';

  return {
    'theme-mobile-logo-light': `${base}/header/${meta.mobile_logo_light || 'logo-ios.svg'}`,
    'theme-mobile-logo-dark': `${base}/header/${meta.mobile_logo_dark || 'logo-android.svg'}`,
    'theme-about-logo-light': `${base}/about/${meta.about_logo_light || 'logo-new.svg'}`,
    'theme-about-logo-dark': `${base}/about/${meta.about_logo_dark || 'logo-new-white.svg'}`,
  };
}

/**
 * Returns string-replace-loader 'multiple' entries for {{TOKEN}} → value substitution.
 * Handles tokens inside string literals that DefinePlugin cannot reach (it only rewrites
 * bare AST identifiers). productVersion is passed in because BUILD_NUMBER is already
 * computed in each webpack config alongside BannerPlugin.
 */
export function themeReplacements(productVersion) {
  function tok(name) { return `\\{\\{${name}\\}\\}`; }
  function tv(envVal, metaKey, def) { return themeVal(envVal, metaKey, def); }
  function lb(id) {
    const e = LOAD_BEARING.find(x => x.id === id);
    if (!e) throw new Error(`replacements.manifest: missing entry "${id}"`);
    return e;
  }
  return [
    // Inside a webpack module factory, `var` declarations are function-scoped and
    // never become window properties. Every file in this codebase that guards its
    // Common namespace uses the pattern below. Replace it with an explicit
    // window.Common reference so the property is visible across all modules.
    {
      search:  lb('common-guard').search,
      replace: 'window.Common = window.Common || {};\nvar Common = window.Common;',
      flags:   lb('common-guard').flags,
    },
    // Several files declare `var c_X = {...}` at the TOP of the file (column 0),
    // BEFORE the define() call — a legacy pattern relying on r.js top-level var
    // becoming window.* in the concatenated output. Under webpack each file is a
    // factory; these constants never reach window and consumers throw ReferenceError.
    // The `^` anchor is critical: without it, 5 indented factory-local c_* vars
    // (including 4 same-named c_oAscMathMainTypeStrings across editors) would also
    // be promoted to window, causing cross-editor clobber at runtime.
    {
      search:  lb('c_-const').search,
      replace: 'var $1 = window.$1 = {',
      flags:   lb('c_-const').flags,
    },
    // Several files declare `var ALLCAPS_NAME = value` at column 0 BEFORE define() —
    // the same legacy r.js implicit-global pattern as the c_* constants above, but for
    // non-object values (numbers). Affected: SCALE_MIN, MENU_SCALE_PART, MENU_BASE_WIDTH
    // (RightMenu.js ×4 editors), FONT_TYPE_RECENT (ComboBoxFonts.js). Viewport.js and
    // Fonts.js use these as bare globals; under webpack they are factory-local and
    // invisible to those consumers. The `^` anchor ensures indented inside-define
    // declarations (e.g. LeftMenu.js line 50: `    var SCALE_MIN`) are not promoted.
    {
      search:  lb('ALLCAPS-const').search,
      replace: 'var $1 = window.$1 = ',
      flags:   lb('ALLCAPS-const').flags,
    },
    // keymaster.js UMD export guard: bare `key` has no lexical declaration in scope;
    // assignKey is the correct local function reference (set as global.key on line 348).
    {
      search:  lb('keymaster-export').search,
      replace: "if(typeof module !== 'undefined') module.exports = assignKey;",
    },
    // keymaster.js wraps everything in (function(global){...})(this). Under a webpack
    // factory, `this` is NOT window — so global.key = assignKey never reaches window.key,
    // and all callers of window.key.* (Shortcuts.js, DocumentHolderExt.js, Toolbar.js)
    // get TypeError on undefined. Explicitly mirror the assignment to window.
    // `global.key = assignKey` is unique to keymaster.js across the entire codebase.
    {
      search:  lb('keymaster-global').search,
      replace: 'global.key = assignKey; window.key = assignKey;',
    },
    { search: tok('PRODUCT_VERSION'),         replace: productVersion,                                                                      flags: 'g' },
    { search: tok('APP_TITLE_TEXT'),           replace: tv(process.env.APP_TITLE_TEXT,           'app_title',               'Euro Office'),  flags: 'g' },
    { search: tok('COMPANY_NAME'),             replace: tv(process.env.COMPANY_NAME,             'company_name',            'ONLYOFFICE'),  flags: 'g' },
    { search: tok('PUBLISHER_NAME'),           replace: tv(process.env.PUBLISHER_NAME,           'publisher_name',          'Ascensio System SIA'), flags: 'g' },
    { search: tok('PUBLISHER_URL'),            replace: tv(process.env.PUBLISHER_URL,            'publisher_url',           'https://www.onlyoffice.com'), flags: 'g' },
    { search: tok('PUBLISHER_ADDRESS'),        replace: tv(process.env.PUBLISHER_ADDRESS,        'publisher_address',       '20A-12 Ernesta Birznieka-Upisha street, Riga, Latvia, EU, LV-1050'), flags: 'g' },
    { search: tok('PUBLISHER_PHONE'),          replace: tv(process.env.PUBLISHER_PHONE,          'publisher_phone',         '+371 633-99867'), flags: 'g' },
    { search: tok('SUPPORT_EMAIL'),            replace: tv(process.env.SUPPORT_EMAIL,            'support_email',           'support@onlyoffice.com'), flags: 'g' },
    { search: tok('SUPPORT_URL'),              replace: tv(process.env.SUPPORT_URL,              'support_url',             'https://support.onlyoffice.com'), flags: 'g' },
    { search: tok('SALES_EMAIL'),              replace: tv(process.env.SALES_EMAIL,              'sales_email',             'sales@onlyoffice.com'), flags: 'g' },
    { search: tok('ATTRIBUTION'),              replace: tv(process.env.ATTRIBUTION,              'attribution',             ''),            flags: 'g' },
    { search: tok('HELP_URL'),                 replace: tv(process.env.HELP_URL,                 'help_url',                ''),            flags: 'g' },
    { search: tok('HELP_CENTER_WEB_DE'),       replace: tv(process.env.HELP_CENTER_WEB_DE,       'help_center_web_de',      ''),            flags: 'g' },
    { search: tok('HELP_CENTER_WEB_SSE'),      replace: tv(process.env.HELP_CENTER_WEB_SSE,      'help_center_web_sse',     ''),            flags: 'g' },
    { search: tok('HELP_CENTER_WEB_PE'),       replace: tv(process.env.HELP_CENTER_WEB_PE,       'help_center_web_pe',      ''),            flags: 'g' },
    { search: tok('HELP_CENTER_WEB_VE'),       replace: tv(process.env.HELP_CENTER_WEB_VE,       'help_center_web_ve',      ''),            flags: 'g' },
    { search: tok('DEFAULT_LANG'),             replace: tv(process.env.DEFAULT_LANG,             'default_lang',            'en') || 'en', flags: 'g' },
    { search: tok('SUGGEST_URL'),              replace: tv(process.env.SUGGEST_URL,              'suggest_url',             ''),            flags: 'g' },
    { search: tok('API_URL_EDITING_CALLBACK'), replace: tv(process.env.API_URL_EDITING_CALLBACK, 'api_url_editing_callback',''),            flags: 'g' },
  ];
}

/**
 * Returns LESS globalVars for the forms logo — only set when the theme provides
 * forms_logo_light in meta/config.json. Uses absolute source paths so that
 * less-loader's data-uri() can read the files during compilation.
 */
export function themeFormVars() {
  if (!meta.forms_logo_light) return {};
  const imgDir = path.join(rootDir, 'theme', theme, 'assets', 'img', 'header');
  return {
    'theme-forms-logo-light-path': `'${path.join(imgDir, meta.forms_logo_light)}'`,
    'theme-forms-logo-dark-path':  `'${path.join(imgDir, meta.forms_logo_dark || meta.forms_logo_light)}'`,
  };
}

/**
 * Returns DefinePlugin brand value overrides.
 * Priority: env var > config.json > stock default. Empty string in config.json
 * is respected (renders nothing / hides the row in guarded views).
 */
export function themeDefines() {
  return {
    __PUBLISHER_ADDRESS__: JSON.stringify(themeVal(process.env.PUBLISHER_ADDRESS, 'publisher_address', '20A-12 Ernesta Birznieka-Upisha street, Riga, Latvia, EU, LV-1050')),
    __SUPPORT_EMAIL__:     JSON.stringify(themeVal(process.env.SUPPORT_EMAIL,     'support_email',     'support@onlyoffice.com')),
    __SUPPORT_URL__:       JSON.stringify(themeVal(process.env.SUPPORT_URL,       'support_url',       'https://support.onlyoffice.com')),
    __PUBLISHER_PHONE__:   JSON.stringify(themeVal(process.env.PUBLISHER_PHONE,   'publisher_phone',   '+371 633-99867')),
    __PUBLISHER_URL__:     JSON.stringify(themeVal(process.env.PUBLISHER_URL,     'publisher_url',     'https://www.onlyoffice.com')),
    __PUBLISHER_NAME__:    JSON.stringify(themeVal(process.env.PUBLISHER_NAME,    'publisher_name',    'Ascensio System SIA')),
    __APP_TITLE_TEXT__:    JSON.stringify(themeVal(process.env.APP_TITLE_TEXT,    'app_title',         'ONLYOFFICE')),
    __COMPANY_NAME__:      JSON.stringify(themeVal(process.env.COMPANY_NAME,      'company_name',      'ONLYOFFICE')),
    __HELP_URL__:          JSON.stringify(themeVal(process.env.HELP_URL,          'help_url',          'https://helpcenter.onlyoffice.com')),
    __SALES_EMAIL__:       JSON.stringify(themeVal(process.env.SALES_EMAIL,       'sales_email',       'sales@onlyoffice.com')),
    __ATTRIBUTION__:       JSON.stringify(themeVal(process.env.ATTRIBUTION,       'attribution',       '')),
  };
}

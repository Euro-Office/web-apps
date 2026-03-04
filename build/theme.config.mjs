// Theme configuration for mobile webpack builds.
// Reads theme/meta/config.json and provides LESS globalVars and DefinePlugin overrides.
// Kept separate from webpack.config.js to minimise upstream merge conflicts.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// __dirname = web-apps/build/, so '..' reaches web-apps root
const rootDir = path.join(__dirname, '..');

const theme = process.env.THEME || 'euro-office';
const configPath = path.join(rootDir, 'theme', theme, 'meta', 'config.json');

let meta = {};
if (fs.existsSync(configPath)) {
  meta = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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
 * Returns DefinePlugin brand value overrides.
 * Priority: env var > config.json > stock default.
 */
export function themeDefines() {
  return {
    __PUBLISHER_ADDRESS__: JSON.stringify(process.env.PUBLISHER_ADDRESS || meta.publisher_address || '20A-12 Ernesta Birznieka-Upisha street, Riga, Latvia, EU, LV-1050'),
    __SUPPORT_EMAIL__: JSON.stringify(process.env.SUPPORT_EMAIL || meta.support_email || 'support@onlyoffice.com'),
    __SUPPORT_URL__: JSON.stringify(process.env.SUPPORT_URL || meta.support_url || 'https://support.onlyoffice.com'),
    __PUBLISHER_PHONE__: JSON.stringify(process.env.PUBLISHER_PHONE || meta.publisher_phone || '+371 633-99867'),
    __PUBLISHER_URL__: JSON.stringify(process.env.PUBLISHER_URL || meta.publisher_url || 'https://www.onlyoffice.com'),
    __PUBLISHER_NAME__: JSON.stringify(process.env.PUBLISHER_NAME || meta.publisher_name || 'Ascensio System SIA'),
    __APP_TITLE_TEXT__: JSON.stringify(process.env.APP_TITLE_TEXT || meta.app_title || 'ONLYOFFICE'),
    __COMPANY_NAME__: JSON.stringify(process.env.COMPANY_NAME || meta.company_name || 'ONLYOFFICE'),
    __HELP_URL__: JSON.stringify(process.env.HELP_URL || meta.help_url || 'https://helpcenter.onlyoffice.com'),
    __SALES_EMAIL__: JSON.stringify(process.env.SALES_EMAIL || meta.sales_email || 'sales@onlyoffice.com'),
  };
}

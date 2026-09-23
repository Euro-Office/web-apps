'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_THEME = 'euro-office';

function loadThemeMeta(repoRoot, source) {
    const theme = process.env.THEME || DEFAULT_THEME;
    const configPath = path.join(repoRoot, 'theme', theme, 'meta', 'config.json');

    if (!fs.existsSync(configPath)) return { theme, meta: {} };

    try {
        return {
            theme,
            meta: JSON.parse(fs.readFileSync(configPath, 'utf8')),
        };
    } catch (error) {
        console.warn(`${source}: unable to read theme config ${configPath}: ${error.message}`);
        return { theme, meta: {} };
    }
}

function themeValue(meta, envName, metaKey, fallback) {
    const envValue = process.env[envName];
    if (envValue != null && envValue !== '') return envValue;
    if (Object.prototype.hasOwnProperty.call(meta, metaKey)) return meta[metaKey];
    return fallback;
}

module.exports = { loadThemeMeta, themeValue };

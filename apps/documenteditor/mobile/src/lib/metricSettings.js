/**
 * Resolve the user's region string from editor config options.
 *
 * @param {object} options - { location, region, lang }
 * @param {object} languageInfo - object with getLanguages() and getLocalLanguageName()
 * @param {string} navigatorLanguage - navigator.language fallback
 * @returns {string} two-letter region code (may be empty)
 */
export function resolveRegion(options, languageInfo, navigatorLanguage) {
    if (options.location) {
        return options.location;
    }

    if (options.region) {
        let val = options.region;
        if (languageInfo) {
            val = languageInfo.getLanguages().hasOwnProperty(val)
                ? languageInfo.getLocalLanguageName(val)[0]
                : val;
        }

        if (val && typeof val === 'string') {
            const arr = val.split(/[-_]/);
            if (arr.length > 1) return arr[arr.length - 1];
        }
        return '';
    }

    const arr = (options.lang || 'en').split(/[-_]/);
    if (arr.length > 1) return arr[arr.length - 1];

    const navArr = (navigatorLanguage || '').split(/[-_]/);
    if (navArr.length > 1) return navArr[navArr.length - 1];

    return '';
}

/**
 * Returns true if the region should use imperial (inch) units.
 */
export function isImperialRegion(region) {
    return /^(ca|us)$/i.test(region);
}

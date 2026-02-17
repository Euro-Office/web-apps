/**
 * Pure helpers for license-related decision logic.
 *
 * Extracted from controller/Main.jsx `applyLicense()` and `onLicenseChanged()`.
 */

/**
 * Determine whether a license-change event should be stored for later action.
 *
 * @param {number|undefined} licType      License result constant
 * @param {object} appOptions             App options from store
 * @param {object} licResult              Asc.c_oLicenseResult enum
 * @param {object} licMode                Asc.c_oLicenseMode enum
 * @returns {boolean}  true if the license type should be stored in state
 */
export function shouldStoreLicenseType(licType, appOptions, licResult, licMode) {
    if (licType === undefined) return false;

    const isEditCapable = (appOptions.canEdit || appOptions.isRestrictedEdit) &&
        appOptions.config.mode !== 'view';

    if (isEditCapable && (
        licType === licResult.Connections ||
        licType === licResult.UsersCount ||
        licType === licResult.ConnectionsOS ||
        licType === licResult.UsersCountOS ||
        (licType === licResult.SuccessLimit && (appOptions.trialMode & licMode.Limited) !== 0)
    )) {
        return true;
    }

    if (appOptions.canLiveView && (
        licType === licResult.ConnectionsLive ||
        licType === licResult.ConnectionsLiveOS ||
        licType === licResult.UsersViewCount ||
        licType === licResult.UsersViewCountOS
    )) {
        return true;
    }

    return false;
}

/**
 * @typedef {object} LicenseAction
 * @property {'opensource-warning'|'disable-live-view'|'anonymous-denied'|'license-warning'|'custom-loader-warning'|'activate'} type
 * @property {boolean} activateControls      Whether to trigger toolbar:activatecontrols
 * @property {boolean} deactivateEdit        Whether to trigger toolbar:deactivateeditcontrols + disconnect
 * @property {string}  [dialogTitle]         Dialog title (i18n-resolved)
 * @property {string}  [dialogText]          Dialog text (i18n-resolved)
 * @property {'ok'|'buy'|'contact'} [dialogButtons]  Button style to render
 * @property {boolean} disableLiveView       Whether to disable live view and set non-fast collaborative
 */

/**
 * Determine what action to take when applying a license.
 *
 * The caller is responsible for executing the side effects described in the result.
 *
 * @param {object} params
 * @param {number|false} params.licenseType   Stored license type from state (false = none)
 * @param {boolean} params.isSupportEditFeature  From EditorUIController
 * @param {object}  params.appOptions         App options from store
 * @param {object}  params.licResult          Asc.c_oLicenseResult enum
 * @param {object}  params.licMode            Asc.c_oLicenseMode enum
 * @param {string}  params.companyName        __COMPANY_NAME__ value
 * @param {object}  params.translations       Resolved translation strings from t('Main')
 * @returns {LicenseAction}
 */
export function resolveLicenseAction({
    licenseType,
    isSupportEditFeature,
    appOptions,
    licResult,
    licMode,
    companyName,
    translations: _t,
}) {
    const warnNoLicense = (_t.warnNoLicense || '').replace(/%1/g, companyName);
    const warnNoLicenseUsers = (_t.warnNoLicenseUsers || '').replace(/%1/g, companyName);
    const textNoLicenseTitle = (_t.textNoLicenseTitle || '').replace(/%1/g, companyName);

    // Branch 1: Opensource / unsupported edit feature
    if (appOptions.config.mode !== 'view' && !isSupportEditFeature) {
        return {
            type: 'opensource-warning',
            activateControls: true,
            deactivateEdit: false,
            disableLiveView: false,
            dialogTitle: _t.notcriticalErrorTitle,
            dialogText: _t.errorOpensource,
            dialogButtons: 'ok',
        };
    }

    // Branch 2: View mode with live-view license issue or anonymous
    if (appOptions.config.mode === 'view') {
        const liveViewBlocked = appOptions.canLiveView && (
            licenseType === licResult.ConnectionsLive ||
            licenseType === licResult.ConnectionsLiveOS ||
            licenseType === licResult.UsersViewCount ||
            licenseType === licResult.UsersViewCountOS ||
            (!appOptions.isAnonymousSupport && !!appOptions.config.user.anonymous)
        );
        return {
            type: liveViewBlocked ? 'disable-live-view' : 'activate',
            activateControls: true,
            deactivateEdit: false,
            disableLiveView: liveViewBlocked,
        };
    }

    // Branch 3: Anonymous user not supported
    if (!appOptions.isAnonymousSupport && !!appOptions.config.user.anonymous) {
        return {
            type: 'anonymous-denied',
            activateControls: true,
            deactivateEdit: true,
            disableLiveView: false,
            dialogTitle: _t.notcriticalErrorTitle,
            dialogText: _t.warnLicenseAnonymous,
            dialogButtons: 'ok',
        };
    }

    // Branch 4: License type requires warning
    if (licenseType) {
        let text;
        let title = textNoLicenseTitle;
        let dialogButtons = 'ok';
        const isSuccessLimitOnly = licenseType === licResult.SuccessLimit;

        if ((appOptions.trialMode & licMode.Limited) !== 0 &&
            (licenseType === licResult.SuccessLimit ||
                appOptions.permissionsLicense === licResult.SuccessLimit)
        ) {
            text = _t.warnLicenseLimitedRenewed;
        } else if (licenseType === licResult.Connections || licenseType === licResult.UsersCount) {
            title = _t.titleReadOnly;
            text = (licenseType === licResult.Connections) ? _t.tipLicenseExceeded : _t.tipLicenseUsersExceeded;
        } else {
            text = (licenseType === licResult.ConnectionsOS) ? warnNoLicense : warnNoLicenseUsers;
            dialogButtons = 'buy';
        }

        return {
            type: 'license-warning',
            activateControls: true,
            deactivateEdit: !isSuccessLimitOnly,
            disableLiveView: false,
            dialogTitle: title,
            dialogText: text,
            dialogButtons,
        };
    }

    // Branch 5: Custom loader branding without license
    const customization = appOptions.config && appOptions.config.customization;
    if (!appOptions.isDesktopApp && !appOptions.canBrandingExt &&
        customization && (customization.loaderName || customization.loaderLogo)) {
        return {
            type: 'custom-loader-warning',
            activateControls: true,
            deactivateEdit: false,
            disableLiveView: false,
            dialogTitle: _t.textPaidFeature,
            dialogText: _t.textCustomLoader,
            dialogButtons: 'contact',
        };
    }

    // Default: just activate
    return {
        type: 'activate',
        activateControls: true,
        deactivateEdit: false,
        disableLiveView: false,
    };
}

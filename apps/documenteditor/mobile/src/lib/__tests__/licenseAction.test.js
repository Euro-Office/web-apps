import { describe, it, expect } from 'vitest';
import { shouldStoreLicenseType, resolveLicenseAction } from '../licenseAction.js';

// Mirror Asc.c_oLicenseResult
const LicResult = {
    Error: 1,
    Expired: 2,
    Success: 3,
    UnknownUser: 4,
    Connections: 5,
    ExpiredTrial: 6,
    SuccessLimit: 7,
    UsersCount: 8,
    ConnectionsOS: 9,
    UsersCountOS: 10,
    ConnectionsLive: 11,
    ConnectionsLiveOS: 12,
    UsersViewCount: 13,
    UsersViewCountOS: 14,
    NotBefore: 15,
    ExpiredLimited: 16,
};

// Mirror Asc.c_oLicenseMode
const LicMode = {
    None: 0,
    Limited: 1,
};

const baseAppOptions = {
    canEdit: true,
    isRestrictedEdit: false,
    canLiveView: false,
    trialMode: 0,
    config: { mode: 'edit', user: {} },
    isAnonymousSupport: true,
    isDesktopApp: false,
    canBrandingExt: false,
    permissionsLicense: LicResult.Success,
};

const baseTranslations = {
    notcriticalErrorTitle: 'Notice',
    errorOpensource: 'Opensource warning',
    warnNoLicense: 'License warning for %1',
    warnNoLicenseUsers: 'License users warning for %1',
    textNoLicenseTitle: 'License Title for %1',
    warnLicenseAnonymous: 'Anonymous warning',
    warnLicenseLimitedRenewed: 'Limited renewed',
    tipLicenseExceeded: 'Connections exceeded',
    tipLicenseUsersExceeded: 'Users exceeded',
    titleReadOnly: 'Read Only',
    textPaidFeature: 'Paid Feature',
    textCustomLoader: 'Custom loader',
    textOk: 'OK',
    textBuyNow: 'Buy Now',
    textContactUs: 'Contact Us',
    textClose: 'Close',
};

describe('shouldStoreLicenseType', () => {
    it('returns false for undefined licType', () => {
        expect(shouldStoreLicenseType(undefined, baseAppOptions, LicResult, LicMode)).toBe(false);
    });

    it('stores Connections when can edit', () => {
        expect(shouldStoreLicenseType(LicResult.Connections, baseAppOptions, LicResult, LicMode)).toBe(true);
    });

    it('stores UsersCount when can edit', () => {
        expect(shouldStoreLicenseType(LicResult.UsersCount, baseAppOptions, LicResult, LicMode)).toBe(true);
    });

    it('stores ConnectionsOS when can edit', () => {
        expect(shouldStoreLicenseType(LicResult.ConnectionsOS, baseAppOptions, LicResult, LicMode)).toBe(true);
    });

    it('stores UsersCountOS when can edit', () => {
        expect(shouldStoreLicenseType(LicResult.UsersCountOS, baseAppOptions, LicResult, LicMode)).toBe(true);
    });

    it('stores SuccessLimit when trial mode is Limited', () => {
        const opts = { ...baseAppOptions, trialMode: LicMode.Limited };
        expect(shouldStoreLicenseType(LicResult.SuccessLimit, opts, LicResult, LicMode)).toBe(true);
    });

    it('does NOT store SuccessLimit when trial mode is None', () => {
        expect(shouldStoreLicenseType(LicResult.SuccessLimit, baseAppOptions, LicResult, LicMode)).toBe(false);
    });

    it('does NOT store edit-related types when in view mode', () => {
        const opts = { ...baseAppOptions, config: { mode: 'view', user: {} } };
        expect(shouldStoreLicenseType(LicResult.Connections, opts, LicResult, LicMode)).toBe(false);
    });

    it('stores ConnectionsLive when canLiveView', () => {
        const opts = { ...baseAppOptions, canLiveView: true };
        expect(shouldStoreLicenseType(LicResult.ConnectionsLive, opts, LicResult, LicMode)).toBe(true);
    });

    it('stores UsersViewCount when canLiveView', () => {
        const opts = { ...baseAppOptions, canLiveView: true };
        expect(shouldStoreLicenseType(LicResult.UsersViewCount, opts, LicResult, LicMode)).toBe(true);
    });

    it('does NOT store ConnectionsLive when !canLiveView', () => {
        expect(shouldStoreLicenseType(LicResult.ConnectionsLive, baseAppOptions, LicResult, LicMode)).toBe(false);
    });

    it('stores when isRestrictedEdit even without canEdit', () => {
        const opts = { ...baseAppOptions, canEdit: false, isRestrictedEdit: true };
        expect(shouldStoreLicenseType(LicResult.Connections, opts, LicResult, LicMode)).toBe(true);
    });
});

describe('resolveLicenseAction', () => {
    const baseParams = {
        licenseType: false,
        isSupportEditFeature: true,
        appOptions: baseAppOptions,
        licResult: LicResult,
        licMode: LicMode,
        companyName: 'TestCo',
        translations: baseTranslations,
    };

    describe('opensource warning', () => {
        it('returns opensource-warning when edit feature not supported', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                isSupportEditFeature: false,
            });
            expect(result.type).toBe('opensource-warning');
            expect(result.activateControls).toBe(true);
            expect(result.deactivateEdit).toBe(false);
            expect(result.dialogText).toBe('Opensource warning');
        });

        it('does NOT trigger for view mode', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                isSupportEditFeature: false,
                appOptions: { ...baseAppOptions, config: { mode: 'view', user: {} } },
            });
            expect(result.type).not.toBe('opensource-warning');
        });
    });

    describe('view mode', () => {
        const viewOptions = { ...baseAppOptions, config: { mode: 'view', user: {} } };

        it('returns activate for simple view mode', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                appOptions: viewOptions,
            });
            expect(result.type).toBe('activate');
            expect(result.disableLiveView).toBe(false);
        });

        it('returns disable-live-view when canLiveView and ConnectionsLive', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                licenseType: LicResult.ConnectionsLive,
                appOptions: { ...viewOptions, canLiveView: true },
            });
            expect(result.type).toBe('disable-live-view');
            expect(result.disableLiveView).toBe(true);
        });

        it('returns disable-live-view for anonymous when canLiveView and !isAnonymousSupport', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                appOptions: {
                    ...viewOptions,
                    canLiveView: true,
                    isAnonymousSupport: false,
                    config: { mode: 'view', user: { anonymous: true } },
                },
            });
            expect(result.type).toBe('disable-live-view');
            expect(result.disableLiveView).toBe(true);
        });
    });

    describe('anonymous denied', () => {
        it('returns anonymous-denied when not anonymous-supported and user is anonymous', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                appOptions: {
                    ...baseAppOptions,
                    isAnonymousSupport: false,
                    config: { mode: 'edit', user: { anonymous: true } },
                },
            });
            expect(result.type).toBe('anonymous-denied');
            expect(result.deactivateEdit).toBe(true);
            expect(result.dialogText).toBe('Anonymous warning');
        });
    });

    describe('license warnings', () => {
        it('shows limited-renewed for SuccessLimit with trial Limited', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                licenseType: LicResult.SuccessLimit,
                appOptions: { ...baseAppOptions, trialMode: LicMode.Limited },
            });
            expect(result.type).toBe('license-warning');
            expect(result.dialogText).toBe('Limited renewed');
            expect(result.deactivateEdit).toBe(false); // SuccessLimit doesn't disable edit
        });

        it('shows connections exceeded for Connections', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                licenseType: LicResult.Connections,
            });
            expect(result.type).toBe('license-warning');
            expect(result.dialogTitle).toBe('Read Only');
            expect(result.dialogText).toBe('Connections exceeded');
            expect(result.deactivateEdit).toBe(true);
        });

        it('shows users exceeded for UsersCount', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                licenseType: LicResult.UsersCount,
            });
            expect(result.dialogText).toBe('Users exceeded');
            expect(result.deactivateEdit).toBe(true);
        });

        it('shows warnNoLicense with buy buttons for ConnectionsOS', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                licenseType: LicResult.ConnectionsOS,
            });
            expect(result.dialogText).toBe('License warning for TestCo');
            expect(result.dialogButtons).toBe('buy');
            expect(result.deactivateEdit).toBe(true);
        });

        it('shows warnNoLicenseUsers for UsersCountOS', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                licenseType: LicResult.UsersCountOS,
            });
            expect(result.dialogText).toBe('License users warning for TestCo');
            expect(result.dialogButtons).toBe('buy');
        });

        it('replaces %1 with company name in license titles and warnings', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                licenseType: LicResult.ConnectionsOS,
                companyName: 'Acme Corp',
            });
            expect(result.dialogText).toBe('License warning for Acme Corp');
        });
    });

    describe('custom loader warning', () => {
        it('returns custom-loader-warning when custom loader set without branding', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                appOptions: {
                    ...baseAppOptions,
                    config: { mode: 'edit', user: {}, customization: { loaderName: 'custom' } },
                },
            });
            expect(result.type).toBe('custom-loader-warning');
            expect(result.dialogText).toBe('Custom loader');
            expect(result.dialogButtons).toBe('contact');
        });

        it('does NOT warn when canBrandingExt', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                appOptions: {
                    ...baseAppOptions,
                    canBrandingExt: true,
                    config: { mode: 'edit', user: {}, customization: { loaderName: 'custom' } },
                },
            });
            expect(result.type).toBe('activate');
        });

        it('does NOT warn when isDesktopApp', () => {
            const result = resolveLicenseAction({
                ...baseParams,
                appOptions: {
                    ...baseAppOptions,
                    isDesktopApp: true,
                    config: { mode: 'edit', user: {}, customization: { loaderName: 'custom' } },
                },
            });
            expect(result.type).toBe('activate');
        });
    });

    describe('default activate', () => {
        it('returns activate when no issues', () => {
            const result = resolveLicenseAction(baseParams);
            expect(result.type).toBe('activate');
            expect(result.activateControls).toBe(true);
            expect(result.deactivateEdit).toBe(false);
            expect(result.disableLiveView).toBe(false);
        });
    });
});

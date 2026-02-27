import { describe, it, expect } from 'vitest';
import { buildProtectionFlags, protectionWarningKey, resolveRestrictions } from '../docProtection.js';

// Mirror the real Asc.c_oAscEDocProtect enum values
const EDocProtect = {
    None: 0,
    ReadOnly: 1,
    Comments: 2,
    TrackedChanges: 3,
    Forms: 4,
};

describe('buildProtectionFlags', () => {
    it('returns all false for None', () => {
        const flags = buildProtectionFlags(EDocProtect.None, EDocProtect);
        expect(flags.type).toBe(0);
        expect(flags.isReadOnly).toBe(false);
        expect(flags.isCommentsOnly).toBe(false);
        expect(flags.isReviewOnly).toBe(false);
        expect(flags.isFormsOnly).toBe(false);
        expect(flags.isTrackedChanges).toBe(false);
    });

    it('sets isReadOnly for ReadOnly type', () => {
        const flags = buildProtectionFlags(EDocProtect.ReadOnly, EDocProtect);
        expect(flags.isReadOnly).toBe(true);
        expect(flags.isCommentsOnly).toBe(false);
        expect(flags.isFormsOnly).toBe(false);
    });

    it('sets isCommentsOnly for Comments type', () => {
        const flags = buildProtectionFlags(EDocProtect.Comments, EDocProtect);
        expect(flags.isCommentsOnly).toBe(true);
        expect(flags.isReadOnly).toBe(false);
    });

    it('sets both isReviewOnly and isTrackedChanges for TrackedChanges', () => {
        const flags = buildProtectionFlags(EDocProtect.TrackedChanges, EDocProtect);
        expect(flags.isReviewOnly).toBe(true);
        expect(flags.isTrackedChanges).toBe(true);
        expect(flags.isReadOnly).toBe(false);
    });

    it('sets isFormsOnly for Forms type', () => {
        const flags = buildProtectionFlags(EDocProtect.Forms, EDocProtect);
        expect(flags.isFormsOnly).toBe(true);
        expect(flags.isReadOnly).toBe(false);
    });

    it('preserves the raw type value', () => {
        const flags = buildProtectionFlags(EDocProtect.Forms, EDocProtect);
        expect(flags.type).toBe(EDocProtect.Forms);
    });
});

describe('protectionWarningKey', () => {
    it('returns correct key for ReadOnly', () => {
        expect(protectionWarningKey(EDocProtect.ReadOnly, EDocProtect))
            .toBe('Main.textDialogProtectedOnlyView');
    });

    it('returns correct key for Comments', () => {
        expect(protectionWarningKey(EDocProtect.Comments, EDocProtect))
            .toBe('Main.textDialogProtectedEditComments');
    });

    it('returns correct key for TrackedChanges', () => {
        expect(protectionWarningKey(EDocProtect.TrackedChanges, EDocProtect))
            .toBe('Main.textDialogProtectedChangesTracked');
    });

    it('returns correct key for Forms', () => {
        expect(protectionWarningKey(EDocProtect.Forms, EDocProtect))
            .toBe('Main.textDialogProtectedFillForms');
    });

    it('returns undefined for None', () => {
        expect(protectionWarningKey(EDocProtect.None, EDocProtect)).toBeUndefined();
    });

    it('returns undefined for unknown type', () => {
        expect(protectionWarningKey(99, EDocProtect)).toBeUndefined();
    });
});

// Mirror Asc.c_oAscRestrictionType
const RestrictionType = {
    None: 0,
    OnlyForms: 1,
    OnlyComments: 2,
    View: 3,
};

describe('resolveRestrictions', () => {
    it('returns View for ReadOnly regardless of permissions', () => {
        const perms = { canComments: true, canFillForms: true, isRestrictedEdit: false };
        expect(resolveRestrictions(EDocProtect.ReadOnly, perms, EDocProtect, RestrictionType))
            .toEqual([RestrictionType.View]);
    });

    it('returns OnlyComments for Comments when canComments', () => {
        const perms = { canComments: true, canFillForms: false, isRestrictedEdit: false };
        expect(resolveRestrictions(EDocProtect.Comments, perms, EDocProtect, RestrictionType))
            .toEqual([RestrictionType.OnlyComments]);
    });

    it('returns View for Comments when !canComments', () => {
        const perms = { canComments: false, canFillForms: false, isRestrictedEdit: false };
        expect(resolveRestrictions(EDocProtect.Comments, perms, EDocProtect, RestrictionType))
            .toEqual([RestrictionType.View]);
    });

    it('returns OnlyForms for Forms when canFillForms', () => {
        const perms = { canComments: false, canFillForms: true, isRestrictedEdit: false };
        expect(resolveRestrictions(EDocProtect.Forms, perms, EDocProtect, RestrictionType))
            .toEqual([RestrictionType.OnlyForms]);
    });

    it('returns View for Forms when !canFillForms', () => {
        const perms = { canComments: false, canFillForms: false, isRestrictedEdit: false };
        expect(resolveRestrictions(EDocProtect.Forms, perms, EDocProtect, RestrictionType))
            .toEqual([RestrictionType.View]);
    });

    it('returns both OnlyComments and OnlyForms for restrictedEdit with both permissions', () => {
        const perms = { canComments: true, canFillForms: true, isRestrictedEdit: true };
        expect(resolveRestrictions(EDocProtect.TrackedChanges, perms, EDocProtect, RestrictionType))
            .toEqual([RestrictionType.OnlyComments, RestrictionType.OnlyForms]);
    });

    it('returns only OnlyComments for restrictedEdit with canComments only', () => {
        const perms = { canComments: true, canFillForms: false, isRestrictedEdit: true };
        expect(resolveRestrictions(EDocProtect.None, perms, EDocProtect, RestrictionType))
            .toEqual([RestrictionType.OnlyComments]);
    });

    it('returns empty array for restrictedEdit with no permissions', () => {
        const perms = { canComments: false, canFillForms: false, isRestrictedEdit: true };
        expect(resolveRestrictions(EDocProtect.None, perms, EDocProtect, RestrictionType))
            .toEqual([]);
    });

    it('returns View for non-restrictedEdit fallback', () => {
        const perms = { canComments: false, canFillForms: false, isRestrictedEdit: false };
        expect(resolveRestrictions(EDocProtect.None, perms, EDocProtect, RestrictionType))
            .toEqual([RestrictionType.View]);
    });
});

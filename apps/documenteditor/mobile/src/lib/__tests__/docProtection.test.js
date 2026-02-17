import { describe, it, expect } from 'vitest';
import { buildProtectionFlags, protectionWarningKey } from '../docProtection.js';

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

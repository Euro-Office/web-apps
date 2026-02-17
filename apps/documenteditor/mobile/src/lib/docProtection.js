/**
 * Pure helpers for document-protection logic.
 *
 * Extracted from controller/Main.jsx to enable unit-testing without the SDK.
 */

/**
 * Map a protection edit-type constant to a set of boolean flags.
 *
 * @param {number} type  One of Asc.c_oAscEDocProtect.*
 * @param {object} enumValues  The enum constants, e.g.
 *        { None: 0, ReadOnly: 1, Comments: 2, TrackedChanges: 3, Forms: 4 }
 * @returns {{ type: number, isReadOnly: boolean, isCommentsOnly: boolean,
 *             isReviewOnly: boolean, isFormsOnly: boolean, isTrackedChanges: boolean }}
 */
export function buildProtectionFlags(type, enumValues) {
    return {
        type,
        isReadOnly:       type === enumValues.ReadOnly,
        isCommentsOnly:   type === enumValues.Comments,
        isReviewOnly:     type === enumValues.TrackedChanges,
        isFormsOnly:      type === enumValues.Forms,
        isTrackedChanges: type === enumValues.TrackedChanges,
    };
}

/**
 * Map a protection edit-type constant to the matching i18n warning-message key.
 *
 * Returns `undefined` when no warning is needed (e.g. None).
 *
 * @param {number} type  One of Asc.c_oAscEDocProtect.*
 * @param {object} enumValues  Same enum constants object as above.
 * @returns {string|undefined}  An i18n key such as 'Main.textDialogProtectedOnlyView'
 */
export function protectionWarningKey(type, enumValues) {
    switch (type) {
        case enumValues.ReadOnly:       return 'Main.textDialogProtectedOnlyView';
        case enumValues.Comments:       return 'Main.textDialogProtectedEditComments';
        case enumValues.TrackedChanges: return 'Main.textDialogProtectedChangesTracked';
        case enumValues.Forms:          return 'Main.textDialogProtectedFillForms';
        default:                        return undefined;
    }
}

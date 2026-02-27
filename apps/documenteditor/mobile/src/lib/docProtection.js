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
/**
 * Decide which restriction type to apply based on protection type and permissions.
 *
 * The caller is responsible for passing the result to `api.asc_setRestriction()`.
 * When the protection type is "else" (e.g. TrackedChanges or None), the function
 * may return multiple restriction values if `isRestrictedEdit` is true — the caller
 * should apply them in order.
 *
 * @param {number} protectType       One of Asc.c_oAscEDocProtect.*
 * @param {object} permissions       { canComments, canFillForms, isRestrictedEdit }
 * @param {object} protectEnum       Asc.c_oAscEDocProtect enum
 * @param {object} restrictionEnum   Asc.c_oAscRestrictionType enum
 * @returns {number[]}  Array of restriction type values to apply (in order)
 */
export function resolveRestrictions(protectType, permissions, protectEnum, restrictionEnum) {
    if (protectType === protectEnum.ReadOnly) {
        return [restrictionEnum.View];
    }
    if (protectType === protectEnum.Comments) {
        return [permissions.canComments ? restrictionEnum.OnlyComments : restrictionEnum.View];
    }
    if (protectType === protectEnum.Forms) {
        return [permissions.canFillForms ? restrictionEnum.OnlyForms : restrictionEnum.View];
    }
    // TrackedChanges, None, or other
    if (permissions.isRestrictedEdit) {
        const result = [];
        if (permissions.canComments) result.push(restrictionEnum.OnlyComments);
        if (permissions.canFillForms) result.push(restrictionEnum.OnlyForms);
        return result;
    }
    return [restrictionEnum.View];
}

export function protectionWarningKey(type, enumValues) {
    switch (type) {
        case enumValues.ReadOnly:       return 'Main.textDialogProtectedOnlyView';
        case enumValues.Comments:       return 'Main.textDialogProtectedEditComments';
        case enumValues.TrackedChanges: return 'Main.textDialogProtectedChangesTracked';
        case enumValues.Forms:          return 'Main.textDialogProtectedFillForms';
        default:                        return undefined;
    }
}

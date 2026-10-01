/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import IconCopy from '@common-icons/icon-copy.svg';
import IconCut from '@common-icons/icon-cut.svg';
import IconPaste from '@common-icons/icon-paste.svg';
import IconUndoIos from '@common-ios-icons/icon-undo.svg?ios';
import IconUndoAndroid from '@common-android-icons/icon-undo.svg';
import IconRedoIos from '@common-ios-icons/icon-redo.svg?ios';
import IconRedoAndroid from '@common-android-icons/icon-redo.svg';
import IconEditSettingsIos from '@common-ios-icons/icon-edit-settings.svg?ios';
import IconEditSettingsAndroid from '@common-android-icons/icon-edit-settings.svg';
import IconPlusIos from '@common-ios-icons/icon-plus.svg?ios';
import IconPlusAndroid from '@common-android-icons/icon-plus.svg';

// context-menu icons resolve through icons.*.id, per Euro-Office/web-apps#155 (n-goncalves)
export const icons = {
    copy: IconCopy,
    cut: IconCut,
    paste: IconPaste,
};

export const toolbarIcons = {
    undo: { ios: IconUndoIos, android: IconUndoAndroid },
    redo: { ios: IconRedoIos, android: IconRedoAndroid },
    editSettings: { ios: IconEditSettingsIos, android: IconEditSettingsAndroid },
    plus: { ios: IconPlusIos, android: IconPlusAndroid },
};

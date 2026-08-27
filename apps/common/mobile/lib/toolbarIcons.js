import IconEditIos from '@common-ios-icons/icon-edit.svg?ios';
import IconEditAndroid from '@common-android-icons/icon-edit.svg';
import IconPlusIos from '@common-ios-icons/icon-plus.svg?ios';
import IconPlusAndroid from '@common-android-icons/icon-plus.svg';
import IconUndoIos from '@common-ios-icons/icon-undo.svg?ios';
import IconUndoAndroid from '@common-android-icons/icon-undo.svg';
import IconRedoIos from '@common-ios-icons/icon-redo.svg?ios';
import IconRedoAndroid from '@common-android-icons/icon-redo.svg';

// The edit/add toolbar buttons shared by documenteditor/spreadsheeteditor/presentationeditor's
// editor.jsx all use the same four icon pairs -- bundled once here instead of 8 import lines
// repeated per editor.
export const toolbarIcons = {
    edit: { ios: IconEditIos, android: IconEditAndroid },
    add: { ios: IconPlusIos, android: IconPlusAndroid },
    undo: { ios: IconUndoIos, android: IconUndoAndroid },
    redo: { ios: IconRedoIos, android: IconRedoAndroid },
};

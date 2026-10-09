import React from 'react';
import { Device } from '../utils/device';
import SvgIcon from './component/SvgIcon';
import IconEditSettingsIos from '@common-ios-icons/icon-edit-settings.svg?ios';
import IconEditSettingsAndroid from '@common-android-icons/icon-edit-settings.svg';
import IconPlusIos from '@common-ios-icons/icon-plus.svg?ios';
import IconPlusAndroid from '@common-android-icons/icon-plus.svg';
import IconUndoIos from '@common-ios-icons/icon-undo.svg?ios';
import IconUndoAndroid from '@common-android-icons/icon-undo.svg';
import IconRedoIos from '@common-ios-icons/icon-redo.svg?ios';
import IconRedoAndroid from '@common-android-icons/icon-redo.svg';
import IconCopy from '@common-icons/icon-copy.svg';
import IconCut from '@common-icons/icon-cut.svg';
import IconPaste from '@common-icons/icon-paste.svg';

export const icons = {
    edit: { ios: IconEditSettingsIos, android: IconEditSettingsAndroid },
    add: { ios: IconPlusIos, android: IconPlusAndroid },
    undo: { ios: IconUndoIos, android: IconUndoAndroid },
    redo: { ios: IconRedoIos, android: IconRedoAndroid },
    copy: IconCopy,
    cut: IconCut,
    paste: IconPaste,
};

/**
 * Platform-aware icon component that renders iOS or Android icon based on device
 * @param {object} props
 * @param {object} props.ios - iOS icon module (with .id property)
 * @param {object} props.android - Android icon module (with .id property)
 * @param {string} [props.className] - CSS class name
 */
export const PlatformIcon = ({ ios, android, className = 'icon icon-svg' }) => (
    <SvgIcon
        slot="media"
        symbolId={(Device.ios ? ios : android).id}
        className={className}
    />
);

/**
 * Factory to create object getter functions for focus objects
 * @param {object} focusObjects - The storeFocusObjects instance
 * @param {number} type - The Asc.c_oAscTypeSelectElement type to filter by
 * @param {function} [extraCheck] - Optional additional filter function
 * @returns {function} Getter function that returns the last matching object's value
 */
export const createObjectGetter = (focusObjects, type, extraCheck) => () => {
    const match = focusObjects._focusObjects
        .filter(obj => {
            if (obj.get_ObjectType() !== type) return false;
            return !extraCheck || extraCheck(obj);
        })
        .pop();
    return match?.get_ObjectValue();
};

/**
 * Builds standard object getters for a storeFocusObjects instance
 * @param {object} storeFocusObjects - The store to add getters to
 * @param {object} types - Map of getter names to {type, check?} configs
 */
export const buildFocusObjectGetters = (storeFocusObjects, types) => {
    storeFocusObjects.intf = storeFocusObjects.intf || {};

    for (const [name, config] of Object.entries(types)) {
        storeFocusObjects.intf[name] = createObjectGetter(
            storeFocusObjects,
            config.type,
            config.check
        );
    }
};

/**
 * Common theme colors initialization - identical across all editors
 */
export const initThemeColors = () => {
    Common.EditorApi.get().asc_registerCallback('asc_onSendThemeColors', (colors, standartColors) => {
        Common.Utils.ThemeColor.setColors(colors, standartColors);
    });
};

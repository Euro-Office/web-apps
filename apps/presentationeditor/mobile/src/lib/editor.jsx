import React, { Fragment } from 'react';
import { Link } from 'framework7-react';
import { Device } from '../../../../common/mobile/utils/device';
import { CommentsController, ViewCommentsController } from '../../../../common/mobile/lib/controller/collaboration/Comments';
import {
    PlatformIcon,
    buildFocusObjectGetters,
    initThemeColors as commonInitThemeColors,
    icons
} from '../../../../common/mobile/lib/editor';

/**
 * Renders the edit and add toolbar buttons
 * @param {object} props
 * @param {boolean} props.disabledEdit - Whether edit button should be disabled
 * @param {boolean} props.disabledAdd - Whether add button should be disabled
 * @param {function} props.onEditClick - Handler for edit button click
 * @param {function} props.onAddClick - Handler for add button click
 * @returns {JSX.Element} Toolbar buttons fragment
 */
export const getToolbarOptions = ({ disabledEdit, disabledAdd, onEditClick, onAddClick }) => (
    <Fragment>
        <Link iconOnly className={disabledEdit ? 'disabled' : ''} id="btn-edit" href={false} onClick={onEditClick}>
            <PlatformIcon {...icons.edit} />
        </Link>
        <Link iconOnly className={disabledAdd ? 'disabled' : ''} id="btn-add" href={false} onClick={onAddClick}>
            <PlatformIcon {...icons.add} />
        </Link>
    </Fragment>
);

/**
 * Renders the undo and redo toolbar buttons
 * @param {object} props
 * @param {boolean} props.disabledUndo - Whether undo button should be disabled
 * @param {boolean} props.disabledRedo - Whether redo button should be disabled
 * @param {function} props.onUndoClick - Handler for undo button click
 * @param {function} props.onRedoClick - Handler for redo button click
 * @returns {JSX.Element} Undo/redo buttons fragment
 */
export const getUndoRedo = ({ disabledUndo, disabledRedo, onUndoClick, onRedoClick }) => (
    <Fragment>
        <Link iconOnly className={disabledUndo ? 'disabled' : ''} onClick={onUndoClick}>
            <PlatformIcon {...icons.undo} />
        </Link>
        <Link iconOnly className={disabledRedo ? 'disabled' : ''} onClick={onRedoClick}>
            <PlatformIcon {...icons.redo} />
        </Link>
    </Fragment>
);

/**
 * Re-export of common theme colors initialization.
 * Provides consistent API where each editor exports all its dependencies.
 * TODO: Revisit as PoC matures - consumers could import directly from common.
 */
export const initThemeColors = commonInitThemeColors;

/**
 * Initializes font settings by registering API callbacks for font changes
 * Tracks font family, size, bold, italic, underline, and strikethrough states
 * @param {object} storeTextSettings - MobX store for text settings
 */
export const initFonts = (storeTextSettings) => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        storeTextSettings.initEditorFonts(fonts, select);
    });
    api.asc_registerCallback('asc_onFontFamily', (font) => {
        storeTextSettings.resetFontName(font);
    });
    api.asc_registerCallback('asc_onFontSize', (size) => {
        storeTextSettings.resetFontSize(size);
    });
    api.asc_registerCallback('asc_onBold', (isBold) => {
        storeTextSettings.resetIsBold(isBold);
    });
    api.asc_registerCallback('asc_onItalic', (isItalic) => {
        storeTextSettings.resetIsItalic(isItalic);
    });
    api.asc_registerCallback('asc_onUnderline', (isUnderline) => {
        storeTextSettings.resetIsUnderline(isUnderline);
    });
    api.asc_registerCallback('asc_onStrikeout', (isStrikethrough) => {
        storeTextSettings.resetIsStrikeout(isStrikethrough);
    });
};

/**
 * Initializes slide theme and layout styles by registering API callbacks
 * Processes standard and custom themes, and tracks layout updates
 * @param {object} storeSlideSettings - MobX store for slide settings
 */
export const initEditorStyles = (storeSlideSettings) => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitEditorStyles', (styles) => {
        let standardThemes = styles[0] || [];
        let customThemes = styles[1] || [];
        let themes = [];
        standardThemes.forEach((theme, index) => {
            themes.push({ themeId: theme.get_Index(), offsety: 40 * index });
        });
        customThemes.forEach((theme) => {
            themes.push({ imageUrl: theme.get_Image(), themeId: theme.get_Index(), offsety: 0 });
        });
        storeSlideSettings.addArrayThemes(themes);
    });
    api.asc_registerCallback('asc_onUpdateThemeIndex', (index) => {
        storeSlideSettings.changeSlideThemeIndex(index);
    });
    api.asc_registerCallback('asc_onUpdateLayout', (layouts) => {
        storeSlideSettings.addArrayLayouts(layouts);
    });
};

/**
 * Initializes focus object tracking and builds getter/filter methods on the store
 * Sets up callbacks for tracking selected elements and provides methods to
 * query specific object types (slide, paragraph, shape, table, chart, link, image)
 * @param {object} storeFocusObjects - MobX store for focus objects
 */
export const initFocusObjects = (storeFocusObjects) => {
    Common.EditorApi.get().asc_registerCallback('asc_onFocusObject', (objects) => {
        storeFocusObjects.resetFocusObjects(objects);
    });

    // Build standard getters using the common factory
    buildFocusObjectGetters(storeFocusObjects, {
        getSlideObject: { type: Asc.c_oAscTypeSelectElement.Slide },
        getParagraphObject: { type: Asc.c_oAscTypeSelectElement.Paragraph },
        getShapeObject: { type: Asc.c_oAscTypeSelectElement.Shape },
        getTableObject: { type: Asc.c_oAscTypeSelectElement.Table },
        getChartObject: { type: Asc.c_oAscTypeSelectElement.Chart },
        getLinkObject: { type: Asc.c_oAscTypeSelectElement.Hyperlink },
        getImageObject: {
            type: Asc.c_oAscTypeSelectElement.Image,
            check: obj => obj.get_ObjectValue()
        },
    });

    // Presentation-specific: filterFocusObjects with slide-specific logic
    storeFocusObjects.intf.filterFocusObjects = () => {
        const arr = [];
        let hasUnlockedParagraph = false;

        for (let object of storeFocusObjects._focusObjects) {
            const type = object.get_ObjectType();
            const value = object.get_ObjectValue();

            if (Asc.c_oAscTypeSelectElement.Paragraph === type) {
                if (!value.get_Locked()) {
                    hasUnlockedParagraph = true;
                }
            } else if (Asc.c_oAscTypeSelectElement.Table === type) {
                if (!value.get_Locked()) {
                    arr.push('table');
                    hasUnlockedParagraph = true;
                }
            } else if (Asc.c_oAscTypeSelectElement.Slide === type) {
                if (!value.get_LockLayout() && !value.get_LockBackground() &&
                    !value.get_LockTransition() && !value.get_LockTiming()) {
                    arr.push('slide');
                }
            } else if (Asc.c_oAscTypeSelectElement.Image === type) {
                if (!value.get_Locked()) {
                    arr.push('image');
                }
            } else if (Asc.c_oAscTypeSelectElement.Chart === type) {
                if (!value.get_Locked()) {
                    arr.push('chart');
                }
            } else if (Asc.c_oAscTypeSelectElement.Shape === type) {
                if (!value.get_FromChart()) {
                    if (!value.get_Locked()) {
                        arr.push('shape');
                        hasUnlockedParagraph = true;
                    }
                }
            } else if (Asc.c_oAscTypeSelectElement.Hyperlink === type) {
                arr.push('hyperlink');
            }
        }

        if (hasUnlockedParagraph && arr.indexOf('image') < 0) {
            arr.unshift('text');
        }

        const result = arr.filter((value, index, self) => self.indexOf(value) === index);

        // Remove hyperlink if no text
        if (result.indexOf('hyperlink') > -1 && result.indexOf('text') < 0) {
            result.splice(result.indexOf('hyperlink'), 1);
        }
        // Remove shape if chart is present
        if (result.indexOf('chart') > -1 && result.indexOf('shape') > -1) {
            result.splice(result.indexOf('shape'), 1);
        }

        return result;
    };
};

/**
 * Initializes table template styles by registering API callback
 * @param {object} storeTableSettings - MobX store for table settings
 */
export const initTableTemplates = (storeTableSettings) => {
    Common.EditorApi.get().asc_registerCallback('asc_onInitTableTemplates', (styles) => {
        storeTableSettings.initTableTemplates(styles);
    });
};

/**
 * Registers callback to update chart style previews when chart styles change
 * @param {object} storeChartSettings - MobX store for chart settings
 * @param {object} storeFocusObjects - MobX store for focus objects
 */
export const updateChartStyles = (storeChartSettings, storeFocusObjects) => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onUpdateChartStyles', () => {
        if (storeFocusObjects.chartObject) {
            storeChartSettings.updateChartStyles(
                api.asc_getChartPreviews(storeFocusObjects.chartObject.getType())
            );
        }
    });
};

/**
 * Renders comment controller components for editing mode
 * @returns {JSX.Element} Fragment containing CommentsController and ViewCommentsController
 */
export const getEditCommentControllers = () => (
    <Fragment>
        <CommentsController />
        <ViewCommentsController />
    </Fragment>
);

/**
 * Context menu configuration and handlers for presentation editor
 * @namespace
 */
export const ContextMenu = {
    /**
     * Maps the current selection state to context menu items
     * Analyzes selected elements (text, images, charts, shapes, tables, links, slides)
     * and returns appropriate menu options based on lock state and permissions
     * @param {object} controller - The context menu controller instance
     * @param {object} controller.props - Controller props with permissions and state
     * @param {function} controller.props.t - Translation function
     * @param {boolean} controller.props.canViewComments - Whether user can view comments
     * @param {boolean} controller.props.isDisconnected - Whether user is disconnected
     * @param {boolean} controller.props.isVersionHistoryMode - Whether in version history mode
     * @param {boolean} controller.isComments - Whether comments exist on selection
     * @param {Array} controller.extraItems - Overflow items for mobile "More" menu
     * @returns {Array<{event: string, icon?: string, caption?: string}>} Menu items array
     */
    mapMenuItems(controller) {
        const { t } = controller.props;
        const _t = t('ContextMenu', { returnObjects: true });
        const { canViewComments, isDisconnected, isVersionHistoryMode } = controller.props;

        const api = Common.EditorApi.get();
        const stack = api.getSelectedElements();
        const canCopy = api.can_CopyCut();

        let itemsIcon = [];
        let itemsText = [];

        const typeFlags = {
            [Asc.c_oAscTypeSelectElement.Paragraph]: 'isText',
            [Asc.c_oAscTypeSelectElement.Image]: 'isImage',
            [Asc.c_oAscTypeSelectElement.Chart]: 'isChart',
            [Asc.c_oAscTypeSelectElement.Shape]: 'isShape',
            [Asc.c_oAscTypeSelectElement.Table]: 'isTable',
            [Asc.c_oAscTypeSelectElement.Hyperlink]: 'isLink',
            [Asc.c_oAscTypeSelectElement.Slide]: 'isSlide',
        };

        const flags = { isText: false, isTable: false, isImage: false, isChart: false, isShape: false, isLink: false, isSlide: false };
        stack.forEach((item) => {
            const flag = typeFlags[item.get_ObjectType()];
            if (flag) flags[flag] = true;
        });

        const { isText, isTable, isImage, isChart, isShape, isLink } = flags;
        const isObject = isText || isImage || isChart || isShape || isTable;

        if (canCopy && isObject) {
            itemsIcon.push({ event: 'copy', icon: 'icon-copy' });
        }

        if (stack.length > 0) {
            let lastItem = stack[stack.length - 1];
            let lastValue = lastItem.get_ObjectValue();
            let locked = typeof lastValue.get_Locked === 'function' && lastValue.get_Locked();
            if (!locked) {
                locked = typeof lastValue.get_LockDelete === 'function' && lastValue.get_LockDelete();
            }

            if (!locked && !isDisconnected && !isVersionHistoryMode) {
                if (canCopy && isObject) {
                    itemsIcon.push({ event: 'cut', icon: 'icon-cut' });
                    // Move cut before copy
                    if (itemsIcon.length === 2) {
                        let tmp = itemsIcon[0];
                        itemsIcon[0] = itemsIcon[1];
                        itemsIcon[1] = tmp;
                    }
                }
                itemsIcon.push({ event: 'paste', icon: 'icon-paste' });

                if (isTable && api.CheckBeforeMergeCells()) {
                    itemsText.push({ caption: _t.menuMerge, event: 'merge' });
                }
                if (isTable && api.CheckBeforeSplitCells()) {
                    itemsText.push({ caption: _t.menuSplit, event: 'split' });
                }
                if (isObject) {
                    itemsText.push({ caption: _t.menuDelete, event: 'delete' });
                }
                if (isTable) {
                    itemsText.push({ caption: _t.menuDeleteTable, event: 'deletetable' });
                }

                itemsText.push({ caption: _t.menuEdit, event: 'edit' });

                if (!isLink && api.can_AddHyperlink() !== false) {
                    itemsText.push({ caption: _t.menuAddLink, event: 'addlink' });
                }

                if (!(isText && isChart) && api.can_AddQuotedComment() !== false && canViewComments) {
                    itemsText.push({ caption: _t.menuAddComment, event: 'addcomment' });
                }

                if (isLink) {
                    itemsText.push({ caption: t('ContextMenu.menuEditLink'), event: 'editlink' });
                }
            }

            if (controller.isComments && canViewComments) {
                itemsText.push({ caption: _t.menuViewComment, event: 'viewcomment' });
            }

            if (isLink) {
                itemsText.push({ caption: _t.menuOpenLink, event: 'openlink' });
            }
        }

        // Truncate for mobile
        if (Device.phone && itemsText.length > 2) {
            controller.extraItems = itemsText.splice(2, itemsText.length, { caption: _t.menuMore, event: 'showActionSheet' });
        } else if (itemsText.length > 4) {
            controller.extraItems = itemsText.splice(3, itemsText.length, { caption: _t.menuMore, event: 'showActionSheet' });
        }

        return itemsIcon.concat(itemsText);
    },

    /**
     * Handles context menu item click events for presentation-specific actions
     * Processes cut, paste, merge/split cells, delete, edit, links, and comments
     * @param {object} controller - The context menu controller instance
     * @param {object} controller.props - Controller props
     * @param {function} controller.props.openOptions - Function to open option panels
     * @param {function} controller.showSplitModal - Function to show table split modal
     * @param {function} controller.openLink - Function to open hyperlinks
     * @param {string} action - The action identifier from the clicked menu item
     * @returns {boolean} True if action was handled, false otherwise
     */
    handleMenuItemClick(controller, action) {
        const api = Common.EditorApi.get();

        const actionHandlers = {
            cut: () => api.Cut(),
            paste: () => api.Paste(),
            addcomment: () => Common.Notifications.trigger('addcomment'),
            merge: () => api.MergeCells(),
            delete: () => api.asc_Remove(),
            deletetable: () => api.remTable(),
            split: () => controller.showSplitModal(),
            edit: () => setTimeout(() => controller.props.openOptions('edit'), 400),
            addlink: () => setTimeout(() => controller.props.openOptions('add-link'), 400),
            editlink: () => setTimeout(() => controller.props.openOptions('edit-link'), 400),
            openlink: () => {
                const link = api.getSelectedElements().find(
                    item => item.get_ObjectType() === Asc.c_oAscTypeSelectElement.Hyperlink
                );
                if (link) controller.openLink(link.get_ObjectValue().get_Value());
            },
        };

        const handler = actionHandlers[action];
        if (!handler) return false;
        handler();
        return true;
    }
};

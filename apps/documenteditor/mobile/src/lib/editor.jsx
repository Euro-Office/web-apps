import React, { Fragment } from 'react';
import { Link } from 'framework7-react';
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
 * @param {boolean} props.disabled - Whether buttons should be disabled
 * @param {function} props.onEditClick - Handler for edit button click
 * @param {function} props.onAddClick - Handler for add button click
 * @returns {JSX.Element} Toolbar buttons fragment
 */
export const getToolbarOptions = ({ disabled, onEditClick, onAddClick }) => (
    <Fragment>
        <Link iconOnly key='btn-edit' className={disabled ? 'disabled' : ''} href={false} onClick={onEditClick}>
            <PlatformIcon {...icons.edit} />
        </Link>
        <Link iconOnly key='btn-add' className={disabled ? 'disabled' : ''} href={false} onClick={onAddClick}>
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
        <Link iconOnly key='btn-undo' className={disabledUndo ? 'disabled' : ''} href={false} onClick={onUndoClick}>
            <PlatformIcon {...icons.undo} />
        </Link>
        <Link iconOnly key='btn-redo' className={disabledRedo ? 'disabled' : ''} href={false} onClick={onRedoClick}>
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
 * Initializes font settings by registering API callback for editor fonts
 * @param {object} storeTextSettings - MobX store for text settings
 */
export const initFonts = (storeTextSettings) => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        storeTextSettings.initEditorFonts(fonts, select);
    });
};

/**
 * Initializes editor paragraph styles by registering API callbacks
 * @param {object} storeParagraphSettings - MobX store for paragraph settings
 */
export const initEditorStyles = (storeParagraphSettings) => {
    const api = Common.EditorApi.get();
    api.asc_setParagraphStylesSizes(330, 38);
    api.asc_registerCallback('asc_onInitEditorStyles', (styles) => {
        storeParagraphSettings.initEditorStyles(styles);
    });
    api.asc_registerCallback('asc_onParaStyleName', (name) => {
        storeParagraphSettings.changeParaStyleName(name);
    });
};

/**
 * Initializes focus object tracking and builds getter/filter methods on the store
 * Sets up callbacks for tracking selected elements and provides methods to
 * query specific object types (header, paragraph, table, link, shape, image, chart)
 * @param {object} storeFocusObjects - MobX store for focus objects
 */
export const initFocusObjects = (storeFocusObjects) => {
    Common.EditorApi.get().asc_registerCallback('asc_onFocusObject', (objects) => {
        storeFocusObjects.resetFocusObjects(objects);
    });

    // Build standard getters using the common factory
    buildFocusObjectGetters(storeFocusObjects, {
        getHeaderObject: { type: Asc.c_oAscTypeSelectElement.Header },
        getParagraphObject: { type: Asc.c_oAscTypeSelectElement.Paragraph },
        getTableObject: { type: Asc.c_oAscTypeSelectElement.Table },
        getLinkObject: { type: Asc.c_oAscTypeSelectElement.Hyperlink },
        getShapeObject: {
            type: Asc.c_oAscTypeSelectElement.Image,
            check: obj => obj.get_ObjectValue()?.get_ShapeProperties()
        },
        getImageObject: {
            type: Asc.c_oAscTypeSelectElement.Image,
            check: obj => {
                const val = obj.get_ObjectValue();
                return val && val.get_ShapeProperties() === null && val.get_ChartProperties() === null;
            }
        },
        getChartObject: {
            type: Asc.c_oAscTypeSelectElement.Image,
            check: obj => obj.get_ObjectValue()?.get_ChartProperties()
        },
    });

    // Editor-specific: filterFocusObjects with document-specific logic
    // To add a new type, add a handler: [Asc.c_oAscTypeSelectElement.X]: () => ['name']
    const typeHandlers = {
        [Asc.c_oAscTypeSelectElement.Paragraph]: () => ['text', 'paragraph'],
        [Asc.c_oAscTypeSelectElement.Table]: () => ['table'],
        [Asc.c_oAscTypeSelectElement.Hyperlink]: () => ['hyperlink'],
        [Asc.c_oAscTypeSelectElement.Header]: () => ['header'],
        [Asc.c_oAscTypeSelectElement.Image]: (obj, arr) => {
            const val = obj.get_ObjectValue();
            if (val.get_ChartProperties()) {
                const idx = arr.indexOf('shape');
                if (idx >= 0) arr.splice(idx, 1);
                return ['chart'];
            }
            if (val.get_ShapeProperties() && !arr.includes('chart')) return ['shape'];
            return ['image'];
        },
    };

    storeFocusObjects.intf.filterFocusObjects = () => {
        const arr = [];
        for (const obj of storeFocusObjects._focusObjects) {
            const handler = typeHandlers[obj.get_ObjectType()];
            if (handler) arr.push(...handler(obj, arr));
        }
        return [...new Set(arr)];
    };
};

/**
 * Initializes table template styles by registering API callback
 * @param {object} storeTableSettings - MobX store for table settings
 */
export const initTableTemplates = (storeTableSettings) => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitTableTemplates', (styles) => {
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
        if (storeChartSettings.chartObject && storeChartSettings.chartObject.get_ChartProperties()) {
            storeChartSettings.updateChartStyles(
                api.asc_getChartPreviews(storeFocusObjects.chartObject.get_ChartProperties().getType())
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
 * Context menu configuration and handlers for document editor
 * @namespace
 */
export const ContextMenu = {
    /**
     * Maps the current selection state to context menu items
     * Analyzes the selected elements and returns appropriate menu options
     * based on object type, lock state, and user permissions
     * @param {object} controller - The context menu controller instance
     * @param {object} controller.props - Controller props with permissions and state
     * @param {function} controller.props.t - Translation function
     * @param {boolean} controller.props.isDisconnected - Whether user is disconnected
     * @param {boolean} controller.props.canViewComments - Whether user can view comments
     * @param {boolean} controller.props.canCoAuthoring - Whether co-authoring is enabled
     * @param {boolean} controller.props.canComments - Whether user can add comments
     * @param {boolean} controller.props.isProtected - Whether document is protected
     * @param {number} controller.props.typeProtection - Type of document protection
     * @param {boolean} controller.isComments - Whether comments exist on selection
     * @returns {Array<{event: string, icon?: string, caption?: string}>} Menu items array
     */
    mapMenuItems(controller) {
        const { t, isDisconnected, canViewComments, canCoAuthoring, canComments, isProtected, typeProtection } = controller.props;
        const _t = t("ContextMenu", {returnObjects: true});
        const api = Common.EditorApi.get();
        const stack = api.getSelectedElements();
        const canCopy = api.can_CopyCut();
        const isAllowedEditing = !isProtected || typeProtection === Asc.c_oAscEDocProtect.TrackedChanges;

        const contextTypeHandlers = {
            [Asc.c_oAscTypeSelectElement.Header]: (val, state) => { state.locked = val.get_Locked(); },
            [Asc.c_oAscTypeSelectElement.Paragraph]: (val, state) => { state.locked = val.get_Locked(); state.isText = true; },
            [Asc.c_oAscTypeSelectElement.Image]: (val, state) => { state.locked = val.get_Locked(); state.isObject = true; },
            [Asc.c_oAscTypeSelectElement.Table]: (val, state) => { state.locked = val.get_Locked(); state.isObject = true; },
            [Asc.c_oAscTypeSelectElement.Hyperlink]: (val, state) => { state.isLink = true; },
        };

        const state = { isText: false, isObject: false, isLink: false, locked: false };
        stack.forEach(item => {
            const handler = contextTypeHandlers[item.get_ObjectType()];
            if (handler) handler(item.get_ObjectValue(), state);
        });
        const { isText, isObject, isLink, locked } = state;

        let itemsIcon = [],
            itemsText = [];

        if (canCopy) {
            itemsIcon.push({ event: 'copy', icon: 'icon-copy' });
        }

        if (!isDisconnected) {
            if (canCopy && !locked && isAllowedEditing) {
                itemsIcon.push({ event: 'cut', icon: 'icon-cut' });
            }
            if (!locked && isAllowedEditing) {
                itemsIcon.push({ event: 'paste', icon: 'icon-paste' });
            }
            if (canViewComments && controller.isComments) {
                itemsText.push({ caption: _t.menuViewComment, event: 'viewcomment' });
            }
            if (api.can_AddQuotedComment() !== false && canCoAuthoring && canComments && !locked && !(!isText && isObject)) {
                itemsText.push({ caption: _t.menuAddComment, event: 'addcomment' });
            }
        }

        if (isLink) {
            itemsText.push({ caption: _t.menuOpenLink, event: 'openlink' });
            if (isAllowedEditing) {
                itemsText.push({ caption: t('ContextMenu.menuEditLink'), event: 'editlink' });
            }
        }

        return itemsIcon.concat(itemsText);
    },

    /**
     * Handles context menu item click events
     * Document editor delegates most actions to the controller, returning false
     * to indicate the action was not handled here
     * @param {object} controller - The context menu controller instance
     * @param {string} action - The action identifier from the clicked menu item
     * @returns {boolean} False - indicates action should be handled by controller
     */
    handleMenuItemClick(controller, action) {
        return false;
    },
};

import React, { Fragment } from 'react';
import { Link } from 'framework7-react';
import { CommentsController, ViewCommentsController } from '../../../../common/mobile/lib/controller/collaboration/Comments';
import {
    PlatformIcon,
    buildFocusObjectGetters,
    initThemeColors as commonInitThemeColors,
    icons
} from '../../../../common/mobile/lib/editor';

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

export const initThemeColors = commonInitThemeColors;

export const initFonts = (storeTextSettings) => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        storeTextSettings.initEditorFonts(fonts, select);
    });
};

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

export const initTableTemplates = (storeTableSettings) => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitTableTemplates', (styles) => {
        storeTableSettings.initTableTemplates(styles);
    });
};

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

export const getEditCommentControllers = () => (
    <Fragment>
        <CommentsController />
        <ViewCommentsController />
    </Fragment>
);

export const ContextMenu = {
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

    handleMenuItemClick(controller, action) {
        return false;
    },
};

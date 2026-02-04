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

export const initThemeColors = commonInitThemeColors;

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

export const initTableTemplates = (storeTableSettings) => {
    Common.EditorApi.get().asc_registerCallback('asc_onInitTableTemplates', (styles) => {
        storeTableSettings.initTableTemplates(styles);
    });
};

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

export const getEditCommentControllers = () => (
    <Fragment>
        <CommentsController />
        <ViewCommentsController />
    </Fragment>
);

export const ContextMenu = {
    mapMenuItems(controller) {
        const { t } = controller.props;
        const _t = t('ContextMenu', { returnObjects: true });
        const { canViewComments, isDisconnected, isVersionHistoryMode } = controller.props;

        const api = Common.EditorApi.get();
        const stack = api.getSelectedElements();
        const canCopy = api.can_CopyCut();

        let itemsIcon = [];
        let itemsText = [];

        let isText = false,
            isTable = false,
            isImage = false,
            isChart = false,
            isShape = false,
            isLink = false,
            isSlide = false,
            isObject = false;

        stack.forEach((item) => {
            const type = item.get_ObjectType();
            item.get_ObjectValue();

            if (type === Asc.c_oAscTypeSelectElement.Paragraph) {
                isText = true;
            } else if (type === Asc.c_oAscTypeSelectElement.Image) {
                isImage = true;
            } else if (type === Asc.c_oAscTypeSelectElement.Chart) {
                isChart = true;
            } else if (type === Asc.c_oAscTypeSelectElement.Shape) {
                isShape = true;
            } else if (type === Asc.c_oAscTypeSelectElement.Table) {
                isTable = true;
            } else if (type === Asc.c_oAscTypeSelectElement.Hyperlink) {
                isLink = true;
            } else if (type === Asc.c_oAscTypeSelectElement.Slide) {
                isSlide = true;
            }
        });

        isObject = isText || isImage || isChart || isShape || isTable;

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

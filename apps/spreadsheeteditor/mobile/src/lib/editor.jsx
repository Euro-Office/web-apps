import React, { Fragment } from 'react';
import { Link } from 'framework7-react';
import { Device } from '../../../../common/mobile/utils/device';
import {
    PlatformIcon,
    buildFocusObjectGetters,
    initThemeColors as commonInitThemeColors,
    icons
} from '../../../../common/mobile/lib/editor';

export const toolbarOptions = {
    getUndoRedo: ({ disabledUndo, disabledRedo, onUndoClick, onRedoClick }) => (
        <Fragment>
            <Link iconOnly className={disabledUndo ? 'disabled' : ''} onClick={onUndoClick}>
                <PlatformIcon {...icons.undo} />
            </Link>
            <Link iconOnly className={disabledRedo ? 'disabled' : ''} onClick={onRedoClick}>
                <PlatformIcon {...icons.redo} />
            </Link>
        </Fragment>
    ),
    getEditOptions: ({ disabled, onEditClick, onAddClick }) => (
        <Fragment>
            <Link iconOnly className={disabled ? 'disabled' : ''} id="btn-edit" href={false} onClick={onEditClick}>
                <PlatformIcon {...icons.edit} />
            </Link>
            <Link iconOnly className={disabled ? 'disabled' : ''} id="btn-add" href={false} onClick={onAddClick}>
                <PlatformIcon {...icons.add} />
            </Link>
        </Fragment>
    )
};

export const initThemeColors = commonInitThemeColors;

export const initCellInfo = (props) => {
    const api = Common.EditorApi.get();
    const storeFocusObjects = props.storeFocusObjects;
    const storeCellSettings = props.storeCellSettings;
    const storeTextSettings = props.storeTextSettings;
    const storeChartSettings = props.storeChartSettings;

    api.asc_registerCallback('asc_onSelectionChanged', (cellInfo) => {
        storeFocusObjects.resetCellInfo(cellInfo);
        storeFocusObjects.setIsLocked(cellInfo);
        storeCellSettings.initCellSettings(cellInfo);
        storeTextSettings.initTextSettings(cellInfo);

        let graphicObjects = api.asc_getGraphicObjectProps();
        if (graphicObjects.length > 0) {
            storeFocusObjects.resetFocusObjects(graphicObjects);
            if (storeFocusObjects.focusOn !== 'obj') {
                storeFocusObjects.changeFocus(true);
            }
            if (storeFocusObjects.chartObject) {
                storeChartSettings.updateChartStyles(
                    api.asc_getChartPreviews(storeFocusObjects.chartObject.get_ChartProperties().getType())
                );
            }
        } else if (storeFocusObjects.focusOn !== 'cell') {
            storeFocusObjects.changeFocus(false);
        }
    });

    // Build standard getters using the common factory
    buildFocusObjectGetters(storeFocusObjects, {
        getParagraphObject: { type: Asc.c_oAscTypeSelectElement.Paragraph },
        getShapeObject: {
            type: Asc.c_oAscTypeSelectElement.Image,
            check: obj => obj.get_ObjectValue()?.get_ShapeProperties()
        },
        getImageObject: { type: Asc.c_oAscTypeSelectElement.Image },
        getChartObject: {
            type: Asc.c_oAscTypeSelectElement.Image,
            check: obj => obj.get_ObjectValue()?.get_ChartProperties()
        },
    });

    // Spreadsheet-specific: getSelections with cell-specific logic
    storeFocusObjects.intf.getSelections = () => {
        const selections = [];
        let isCell, isRow, isCol, isAll, isChart, isImage, isShape, isShapeText, isChartText;
        let locked = false;

        const selectionTypeMap = {
            [Asc.c_oAscSelectionType.RangeCells]: 'isCell',
            [Asc.c_oAscSelectionType.RangeRow]: 'isRow',
            [Asc.c_oAscSelectionType.RangeCol]: 'isCol',
            [Asc.c_oAscSelectionType.RangeMax]: 'isAll',
            [Asc.c_oAscSelectionType.RangeImage]: 'isImage',
            [Asc.c_oAscSelectionType.RangeShape]: 'isShape',
            [Asc.c_oAscSelectionType.RangeChart]: 'isChart',
            [Asc.c_oAscSelectionType.RangeChartText]: 'isChartText',
            [Asc.c_oAscSelectionType.RangeShapeText]: 'isShapeText',
        };

        const selType = storeFocusObjects._cellInfo.asc_getSelectionType();
        const flags = { isCell, isRow, isCol, isAll, isChart, isImage, isShape, isShapeText, isChartText };
        const flagName = selectionTypeMap[selType];
        if (flagName) flags[flagName] = true;

        ({ isCell, isRow, isCol, isAll, isChart, isImage, isShape, isShapeText, isChartText } = flags);

        // Determine graphic object types
        if (isImage || isShape || isChart || isShapeText || isChartText) {
            const graphicObjects = Common.EditorApi.get().asc_getGraphicObjectProps();
            if (isImage || isShape || isChart) {
                isImage = isShape = isChart = false;
            }
            graphicObjects
                .filter(obj => obj.asc_getObjectType() === Asc.c_oAscTypeSelectElement.Image)
                .forEach(obj => {
                    const val = obj.asc_getObjectValue();
                    locked = locked || val.asc_getLocked();
                    if (isShapeText || isChartText) return; // Only need locked state
                    const shapeProps = val.asc_getShapeProperties();
                    if (shapeProps) {
                        shapeProps.asc_getFromChart() ? isChart = true : isShape = true;
                    } else if (val.asc_getChartProperties()) {
                        isChart = true;
                    } else {
                        isImage = true;
                    }
                });
        }

        // Build selections array based on detected types
        if (isChart || isChartText) {
            selections.push('chart');
            if (isChartText) selections.push('text');
        } else if ((isShape || isShapeText) && !isImage) {
            selections.push('shape');
            if (isShapeText) selections.push('text');
        } else if (isImage) {
            selections.push('image');
            if (isShape) selections.push('shape');
        } else {
            selections.push('cell');
            if (storeFocusObjects._cellInfo.asc_getHyperlink()) {
                selections.push('hyperlink');
            }
        }

        return selections;
    };
};

export const initEditorStyles = (storeCellSettings) => {
    Common.EditorApi.get().asc_registerCallback('asc_onInitEditorStyles', (styles) => {
        storeCellSettings.initCellStyles(styles);
    });
};

export const initFonts = (props) => {
    const api = Common.EditorApi.get();
    const storeCellSettings = props.storeCellSettings;
    const storeTextSettings = props.storeTextSettings;

    api.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        storeCellSettings.initEditorFonts(fonts, select);
        storeTextSettings.initEditorFonts(fonts, select);
    });

    api.asc_registerCallback('asc_onEditorSelectionChanged', (fontObj) => {
        storeCellSettings.initFontSettings(fontObj);
        storeTextSettings.initFontSettings(fontObj);
    });
};


export const ContextMenu = {
    mapMenuItems(controller) {
        const { t } = controller.props;
        const _t = t('ContextMenu', { returnObjects: true });
        const { canViewComments, isDisconnected, wsProps, wsLock, isResolvedComments, isVersionHistoryMode } = controller.props;

        const api = Common.EditorApi.get();
        const cellInfo = api.asc_getCellInfo();
        const isPivot = !!cellInfo.asc_getPivotTableInfo();
        const canFillHandle = api.asc_canFillHandle();
        const itemsIcon = [];
        const itemsText = [];

        let isCell, isRow, isCol, isAll, isChart, isImage, isShape, isShapeText, isChartText;
        let locked = cellInfo.asc_getLocked();

        const selType = cellInfo.asc_getSelectionType();
        const xfs = cellInfo.asc_getXfs();
        const comments = cellInfo.asc_getComments();
        const isSolved = comments[0] && comments[0].asc_getSolved();

        const selectionTypeMap = {
            [Asc.c_oAscSelectionType.RangeCells]: 'isCell',
            [Asc.c_oAscSelectionType.RangeRow]: 'isRow',
            [Asc.c_oAscSelectionType.RangeCol]: 'isCol',
            [Asc.c_oAscSelectionType.RangeMax]: 'isAll',
            [Asc.c_oAscSelectionType.RangeImage]: 'isImage',
            [Asc.c_oAscSelectionType.RangeShape]: 'isShape',
            [Asc.c_oAscSelectionType.RangeChart]: 'isChart',
            [Asc.c_oAscSelectionType.RangeChartText]: 'isChartText',
            [Asc.c_oAscSelectionType.RangeShapeText]: 'isShapeText',
        };

        const flags = { isCell, isRow, isCol, isAll, isChart, isImage, isShape, isShapeText, isChartText };
        const flagName = selectionTypeMap[selType];
        if (flagName) flags[flagName] = true;
        ({ isCell, isRow, isCol, isAll, isChart, isImage, isShape, isShapeText, isChartText } = flags);

        if ((isImage || isShape || isChart || isShapeText || isChartText) && wsProps.Objects) {
            return [];
        }

        if (!locked && (isImage || isShape || isChart || isShapeText || isChartText)) {
            api.asc_getGraphicObjectProps().every((obj) => {
                if (obj.asc_getObjectType() == Asc.c_oAscTypeSelectElement.Image) {
                    locked = obj.asc_getObjectValue().asc_getLocked();
                }
                return !locked;
            });
        }

        if (locked || api.isCellEdited || isDisconnected) {
            itemsIcon.push({ event: 'copy', icon: 'icon-copy' });
        } else if (!isVersionHistoryMode) {
            itemsIcon.push({ event: 'cut', icon: 'icon-cut' });
            itemsIcon.push({ event: 'copy', icon: 'icon-copy' });
            itemsIcon.push({ event: 'paste', icon: 'icon-paste' });

            if (isImage || isShape || isChart || isShapeText || isChartText) {
                itemsText.push({ caption: _t.menuEdit, event: 'edit' });
            } else {
                if (isCol) {
                    if (!wsProps.FormatColumns) {
                        itemsText.push({ caption: _t.menuHide, event: 'hide' });
                        itemsText.push({ caption: _t.menuShow, event: 'show' });
                    }
                } else if (isRow) {
                    if (!wsProps.FormatRows) {
                        itemsText.push({ caption: _t.menuHide, event: 'hide' });
                        itemsText.push({ caption: _t.menuShow, event: 'show' });
                    }
                } else if (isCell) {
                    if (!locked) {
                        itemsText.push({ caption: _t.menuCell, event: 'edit' });
                    }
                    if (cellInfo.asc_getMerge() != Asc.c_oAscMergeOptions.None) {
                        if (!wsProps.FormatCells) {
                            itemsText.push({ caption: _t.menuUnmerge, event: 'unmerge' });
                        }
                    } else if (cellInfo.asc_getMerge() != Asc.c_oAscMergeOptions.Merge) {
                        if (!wsProps.FormatCells) {
                            itemsText.push({ caption: _t.menuMerge, event: 'merge' });
                        }
                    }
                    if (!wsProps.FormatCells) {
                        itemsText.push(xfs.asc_getWrapText()
                            ? { caption: _t.menuUnwrap, event: 'unwrap' }
                            : { caption: _t.menuWrap, event: 'wrap' }
                        );
                    }
                }

                itemsText.push({
                    caption: api.asc_getSheetViewSettings().asc_getIsFreezePane()
                        ? _t.menuUnfreezePanes
                        : _t.menuFreezePanes,
                    event: 'freezePanes'
                });
            }

            if (!isPivot && !wsLock) {
                itemsText.push({ caption: _t.menuDelete, event: 'del' });
            }

            if (canViewComments) {
                if (comments && comments.length && (!isSolved && !isResolvedComments || isResolvedComments)) {
                    itemsText.push({ caption: _t.menuViewComment, event: 'viewcomment' });
                }
                if (isCell && comments && !comments.length && !wsProps.Objects) {
                    itemsText.push({ caption: _t.menuAddComment, event: 'addcomment' });
                }
            }
        }

        // Hyperlinks
        if (cellInfo.asc_getHyperlink() && !cellInfo.asc_getMultiselect()) {
            if (!isVersionHistoryMode) {
                itemsText.push({ caption: t('ContextMenu.menuEditLink'), event: 'editlink' });
            }
            itemsText.push({ caption: _t.menuOpenLink, event: 'openlink' });
        } else if (!cellInfo.asc_getHyperlink() && !cellInfo.asc_getMultiselect() && !isPivot && !wsProps.InsertHyperlinks && !isVersionHistoryMode) {
            itemsText.push({ caption: _t.menuAddLink, event: 'addlink' });
        }

        // Shape hyperlinks
        if (isShapeText && api.asc_canAddShapeHyperlink()) {
            if (cellInfo.asc_getHyperlink() || wsProps.InsertHyperlinks) {
                if (!isVersionHistoryMode) {
                    itemsText.push({ caption: t('ContextMenu.menuEditLink'), event: 'editlink' });
                }
                itemsText.push({ caption: _t.menuOpenLink, event: 'openlink' });
            } else if (!isVersionHistoryMode) {
                itemsText.push({ caption: _t.menuAddLink, event: 'addlink' });
            }
        }

        if (canFillHandle) {
            itemsText.push({ caption: t('ContextMenu.menuAutofill'), event: 'autofillCells' });
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
        const cellInfo = api.asc_getCellInfo();
        const isRow = cellInfo.asc_getSelectionType() === Asc.c_oAscSelectionType.RangeRow;

        const deleteActions = {
            [Asc.c_oAscSelectionType.RangeRow]: () => api.asc_deleteCells(Asc.c_oAscDeleteOptions.DeleteRows),
            [Asc.c_oAscSelectionType.RangeCol]: () => api.asc_deleteCells(Asc.c_oAscDeleteOptions.DeleteColumns),
        };

        const actionHandlers = {
            cut: () => api.asc_Cut(),
            paste: () => api.asc_Paste(),
            addcomment: () => Common.Notifications.trigger('addcomment'),
            del: () => (deleteActions[cellInfo.asc_getSelectionType()] || (() => api.asc_emptyCells(Asc.c_oAscCleanOptions.All)))(),
            wrap: () => api.asc_setCellTextWrap(true),
            unwrap: () => api.asc_setCellTextWrap(false),
            edit: () => setTimeout(() => controller.props.openOptions('edit'), 400),
            merge: () => controller.onMergeCells(),
            unmerge: () => api.asc_mergeCells(Asc.c_oAscMergeOptions.None),
            hide: () => api[isRow ? 'asc_hideRows' : 'asc_hideColumns'](),
            show: () => api[isRow ? 'asc_showRows' : 'asc_showColumns'](),
            addlink: () => setTimeout(() => controller.props.openOptions('add-link'), 400),
            editlink: () => setTimeout(() => controller.props.openOptions('edit-link'), 400),
            freezePanes: () => api.asc_freezePane(),
            autofillCells: () => api.asc_fillHandleDone(),
        };

        const handler = actionHandlers[action];
        if (!handler) return false;
        handler();
        return true;
    }
};

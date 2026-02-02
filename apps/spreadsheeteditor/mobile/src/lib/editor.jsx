import React, { Fragment } from 'react';
import { Link } from 'framework7-react';
import { Device } from '../../../../common/mobile/utils/device';
import SvgIcon from '@common/lib/component/SvgIcon';
import IconEditSettingsIos from '@common-ios-icons/icon-edit-settings.svg?ios';
import IconEditSettingsAndroid from '@common-android-icons/icon-edit-settings.svg';
import IconAddOtherIos from '@common-ios-icons/icon-add-other.svg?ios';
import IconAddOtherAndroid from '@common-android-icons/icon-add-other.svg';
import IconUndoIos from '@common-ios-icons/icon-undo.svg?ios';
import IconUndoAndroid from '@common-android-icons/icon-undo.svg';
import IconRedoIos from '@common-ios-icons/icon-redo.svg?ios';
import IconRedoAndroid from '@common-android-icons/icon-redo.svg';

export const toolbarOptions = {
    getUndoRedo: ({ disabledUndo, disabledRedo, onUndoClick, onRedoClick }) => {
        return (
            <Fragment>
                <Link iconOnly className={disabledUndo ? 'disabled' : ''} onClick={onUndoClick}>
                    {Device.ios ?
                        <SvgIcon slot="media" symbolId={IconUndoIos.id} className={'icon icon-svg'} /> :
                        <SvgIcon slot="media" symbolId={IconUndoAndroid.id} className={'icon icon-svg'} />
                    }
                </Link>
                <Link iconOnly className={disabledRedo ? 'disabled' : ''} onClick={onRedoClick}>
                    {Device.ios ?
                        <SvgIcon slot="media" symbolId={IconRedoIos.id} className={'icon icon-svg'} /> :
                        <SvgIcon slot="media" symbolId={IconRedoAndroid.id} className={'icon icon-svg'} />
                    }
                </Link>
            </Fragment>
        );
    },
    getEditOptions: ({ disabled, onEditClick, onAddClick }) => {
        return (
            <Fragment>
                <Link iconOnly className={disabled ? 'disabled' : ''} id="btn-edit" href={false} onClick={onEditClick}>
                    {Device.ios ?
                        <SvgIcon slot="media" symbolId={IconEditSettingsIos.id} className={'icon icon-svg'} /> :
                        <SvgIcon slot="media" symbolId={IconEditSettingsAndroid.id} className={'icon icon-svg'} />
                    }
                </Link>
                <Link iconOnly className={disabled ? 'disabled' : ''} id="btn-add" href={false} onClick={onAddClick}>
                    {Device.ios ?
                        <SvgIcon slot="media" symbolId={IconAddOtherIos.id} className={'icon icon-svg'} /> :
                        <SvgIcon slot="media" symbolId={IconAddOtherAndroid.id} className={'icon icon-svg'} />
                    }
                </Link>
            </Fragment>
        );
    }
};

export const initThemeColors = () => {
    Common.EditorApi.get().asc_registerCallback('asc_onSendThemeColors', (colors, standartColors) => {
        Common.Utils.ThemeColor.setColors(colors, standartColors);
    });
};

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

    storeFocusObjects.intf = {};

    storeFocusObjects.intf.getSelections = () => {
        const selections = [];
        let isCell, isRow, isCol, isAll, isChart, isImage, isShape, isShapeText, isChartText;
        let locked = false;

        switch (storeFocusObjects._cellInfo.asc_getSelectionType()) {
            case Asc.c_oAscSelectionType.RangeCells:     isCell = true; break;
            case Asc.c_oAscSelectionType.RangeRow:        isRow = true; break;
            case Asc.c_oAscSelectionType.RangeCol:        isCol = true; break;
            case Asc.c_oAscSelectionType.RangeMax:        isAll = true; break;
            case Asc.c_oAscSelectionType.RangeImage:      isImage = true; break;
            case Asc.c_oAscSelectionType.RangeShape:      isShape = true; break;
            case Asc.c_oAscSelectionType.RangeChart:      isChart = true; break;
            case Asc.c_oAscSelectionType.RangeChartText:  isChartText = true; break;
            case Asc.c_oAscSelectionType.RangeShapeText:  isShapeText = true; break;
        }

        if (isImage || isShape || isChart) {
            isImage = isShape = isChart = false;
            const graphicObjects = Common.EditorApi.get().asc_getGraphicObjectProps();
            for (let i = 0; i < graphicObjects.length; i++) {
                if (graphicObjects[i].asc_getObjectType() == Asc.c_oAscTypeSelectElement.Image) {
                    const val = graphicObjects[i].asc_getObjectValue();
                    locked = locked || val.asc_getLocked();
                    const shapeProps = val.asc_getShapeProperties();
                    if (shapeProps) {
                        shapeProps.asc_getFromChart() ? isChart = true : isShape = true;
                    } else if (val.asc_getChartProperties()) {
                        isChart = true;
                    } else {
                        isImage = true;
                    }
                }
            }
        } else if (isShapeText || isChartText) {
            const graphicObjects = Common.EditorApi.get().asc_getGraphicObjectProps();
            for (let i = 0; i < graphicObjects.length; i++) {
                const objType = graphicObjects[i].asc_getObjectType();
                if (objType == Asc.c_oAscTypeSelectElement.Image) {
                    const val = graphicObjects[i].asc_getObjectValue();
                    locked = locked || val.asc_getLocked();
                }
            }
        }

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

    storeFocusObjects.intf.getShapeObject = () => {
        const matches = [];
        for (let obj of storeFocusObjects._focusObjects) {
            if (obj.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image &&
                obj.get_ObjectValue() && obj.get_ObjectValue().get_ShapeProperties()) {
                matches.push(obj);
            }
        }
        if (matches.length > 0) {
            return matches[matches.length - 1].get_ObjectValue();
        }
    };

    storeFocusObjects.intf.getImageObject = () => {
        const matches = [];
        for (let obj of storeFocusObjects._focusObjects) {
            if (obj.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image) {
                matches.push(obj);
            }
        }
        if (matches.length > 0) {
            return matches[matches.length - 1].get_ObjectValue();
        }
    };

    storeFocusObjects.intf.getChartObject = () => {
        const matches = [];
        for (let obj of storeFocusObjects._focusObjects) {
            if (obj.get_ObjectType() === Asc.c_oAscTypeSelectElement.Image &&
                obj.get_ObjectValue() && obj.get_ObjectValue().get_ChartProperties()) {
                matches.push(obj);
            }
        }
        if (matches.length > 0) {
            return matches[matches.length - 1].get_ObjectValue();
        }
    };

    storeFocusObjects.intf.getParagraphObject = () => {
        const matches = [];
        for (let obj of storeFocusObjects._focusObjects) {
            if (obj.get_ObjectType() === Asc.c_oAscTypeSelectElement.Paragraph) {
                matches.push(obj);
            }
        }
        if (matches.length > 0) {
            return matches[matches.length - 1].get_ObjectValue();
        }
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

        switch (selType) {
            case Asc.c_oAscSelectionType.RangeCells:     isCell = true; break;
            case Asc.c_oAscSelectionType.RangeRow:        isRow = true; break;
            case Asc.c_oAscSelectionType.RangeCol:        isCol = true; break;
            case Asc.c_oAscSelectionType.RangeMax:        isAll = true; break;
            case Asc.c_oAscSelectionType.RangeImage:      isImage = true; break;
            case Asc.c_oAscSelectionType.RangeShape:      isShape = true; break;
            case Asc.c_oAscSelectionType.RangeChart:      isChart = true; break;
            case Asc.c_oAscSelectionType.RangeChartText:  isChartText = true; break;
            case Asc.c_oAscSelectionType.RangeShapeText:  isShapeText = true; break;
        }

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
        let cellInfo = api.asc_getCellInfo();

        switch (action) {
            case 'cut':
                return api.asc_Cut();
            case 'paste':
                return api.asc_Paste();
            case 'addcomment':
                Common.Notifications.trigger('addcomment');
                break;
            case 'del':
                if (api) {
                    switch (api.asc_getCellInfo().asc_getSelectionType()) {
                        case Asc.c_oAscSelectionType.RangeRow:
                            api.asc_deleteCells(Asc.c_oAscDeleteOptions.DeleteRows);
                            break;
                        case Asc.c_oAscSelectionType.RangeCol:
                            api.asc_deleteCells(Asc.c_oAscDeleteOptions.DeleteColumns);
                            break;
                        default:
                            api.asc_emptyCells(Asc.c_oAscCleanOptions.All);
                    }
                }
                break;
            case 'wrap':
                api.asc_setCellTextWrap(true);
                break;
            case 'unwrap':
                api.asc_setCellTextWrap(false);
                break;
            case 'edit':
                setTimeout(() => { controller.props.openOptions('edit'); }, 400);
                break;
            case 'merge':
                controller.onMergeCells();
                break;
            case 'unmerge':
                api.asc_mergeCells(Asc.c_oAscMergeOptions.None);
                break;
            case 'hide':
                api[cellInfo.asc_getSelectionType() == Asc.c_oAscSelectionType.RangeRow ? 'asc_hideRows' : 'asc_hideColumns']();
                break;
            case 'show':
                api[cellInfo.asc_getSelectionType() == Asc.c_oAscSelectionType.RangeRow ? 'asc_showRows' : 'asc_showColumns']();
                break;
            case 'addlink':
                setTimeout(() => { controller.props.openOptions('add-link'); }, 400);
                break;
            case 'editlink':
                setTimeout(() => { controller.props.openOptions('edit-link'); }, 400);
                break;
            case 'freezePanes':
                api.asc_freezePane();
                break;
            case 'autofillCells':
                api.asc_fillHandleDone();
                break;
            default:
                return false;
        }
        return true;
    }
};

import {action, observable, computed, makeObservable} from 'mobx';
import {getLockState} from '../lib/selectionRules.js';

export class storeFocusObjects {
    constructor() {
        makeObservable(this, {
            focusOn: observable,
            changeFocus: action,
            _focusObjects: observable,
            _cellInfo: observable,
            resetFocusObjects: action,
            objects: computed,
            resetCellInfo: action,
            selections: computed,
            shapeObject: computed,
            imageObject: computed,
            chartObject: computed,
            isLocked: observable,
            isLockedText: observable,
            isLockedShape: observable,
            setIsLocked: action,
            editFormulaMode: observable,
            setEditFormulaMode: action,
            isEditCell: observable,
            setEditCell: action,
            functionsDisable: observable,
            setFunctionsDisabled: action,
            paragraphObject: computed,
        });
    }

    focusOn = undefined;

    changeFocus(isObj) {
        this.focusOn = isObj ? 'obj' : 'cell';
    }

    _focusObjects = [];

    resetFocusObjects(objects) {
        this._focusObjects = objects;
    }

    get objects() {
        const _objects = [];
        for (let object of this._focusObjects) {
            const type = object.get_ObjectType();

            if (Asc.c_oAscTypeSelectElement.Paragraph === type) {
                _objects.push('text', 'paragraph');
            } else if (Asc.c_oAscTypeSelectElement.Table === type) {
                _objects.push('table');
            } else if (Asc.c_oAscTypeSelectElement.Image === type) {
                if (object.get_ObjectValue().get_ChartProperties()) {
                    _objects.push('chart');
                } else if (object.get_ObjectValue().get_ShapeProperties() && !_objects.includes('chart')) {
                    _objects.push('shape');
                } else {
                    _objects.push('image');
                }
            } else if (Asc.c_oAscTypeSelectElement.Hyperlink === type) {
                _objects.push('hyperlink');
            }
        }
        const resultArr = _objects.filter((value, index, self) => self.indexOf(value) === index); //get uniq array
        // Exclude shapes if chart exist
        if (resultArr.indexOf('chart') > -1) {
            resultArr.splice(resultArr.indexOf('shape'), 1);
        }
        return resultArr;
    }

    _cellInfo;

    resetCellInfo (cellInfo) {
        this._cellInfo = cellInfo;
    }

    get selections () {
        return !!this.intf ? this.intf.getSelections() : null;
    }

    get shapeObject() {
        return !!this.intf ? this.intf.getShapeObject() : null;
    }

    get imageObject() {
        return !!this.intf ? this.intf.getImageObject() : null;
    }

    get chartObject() {
        return !!this.intf ? this.intf.getChartObject() : null;
    }

    get paragraphObject() {
        return !!this.intf ? this.intf.getParagraphObject() : null;
    }

    isLocked = false;
    isLockedShape = false;
    isLockedText = false;

    setIsLocked(info) {
        const {isLocked, isLockedShape, isLockedText} =
            getLockState(info, () => Common.EditorApi.get().asc_getGraphicObjectProps());
        this.isLocked = isLocked;
        this.isLockedShape = isLockedShape;
        this.isLockedText = isLockedText;
    }

    editFormulaMode = false;

    setEditFormulaMode(value) {
        this.editFormulaMode = value;
    }

    isEditCell = false;

    setEditCell(value) {
        this.isEditCell = value;
    }

    functionsDisable = false;

    setFunctionsDisabled(value) {
        this.functionsDisable = value;
    }

}
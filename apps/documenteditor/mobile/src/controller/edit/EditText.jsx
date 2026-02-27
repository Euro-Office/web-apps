import React, {Component} from 'react';
import { EditText } from '../../view/edit/EditText.jsx'
import { inject, observer } from 'mobx-react';
import { getApi } from '../../../../../common/mobile/lib/sdk/api.js';

/**
 * Compute next font size, clamped to [1, 300].
 * Returns { size, useStepApi } where useStepApi means the caller should
 * use FontSizeIn/FontSizeOut instead of setting an explicit size.
 */
export const clampFontSize = (curSize, isDecrement) => {
    if (typeof curSize === 'undefined') {
        return { useStepApi: true };
    }
    const size = isDecrement
        ? Math.max(1, curSize - 1)
        : Math.min(300, curSize + 1);
    return { size, useStepApi: false };
};

/**
 * Map paragraph alignment type string to SDK numeric value.
 */
export const paragraphAlignValue = (type) => {
    switch (type) {
        case 'just':   return 3;
        case 'right':  return 0;
        case 'center': return 2;
        default:       return 1;
    }
};

/**
 * Parse a 6-char hex color string into RGB integers.
 * Returns null for 'transparent'.
 */
export const parseHighlightColor = (strColor) => {
    if (strColor == 'transparent') return null;
    return {
        r: parseInt(strColor[0] + strColor[1], 16),
        g: parseInt(strColor[2] + strColor[3], 16),
        b: parseInt(strColor[4] + strColor[5], 16),
    };
};

class EditTextController extends Component {
    constructor(props) {
        super(props);
        this.onApiFocusObject = this.onApiFocusObject.bind(this);
        this.updateBulletsNumbers = this.updateBulletsNumbers.bind(this);
        this.updateListType = this.updateListType.bind(this);
    }

    componentDidMount() {
        const api = getApi();
        api && api.UpdateInterfaceState();
        api.asc_registerCallback('asc_onFocusObject', this.onApiFocusObject);
    }

    componentWillUnmount() {
        const api = getApi();
        api.asc_unregisterCallback('asc_onFocusObject', this.onApiFocusObject);
    }

    changeFontSize(curSize, isDecrement) {
        const api = getApi();
        if (api) {
            const result = clampFontSize(curSize, isDecrement);
            if (result.useStepApi) {
                isDecrement ? api.FontSizeOut() : api.FontSizeIn();
            } else {
                api.put_TextPrFontSize(result.size);
            }
        }
    }

    changeFontFamily(name) {
        const api = getApi();
        if (api && name) {
            api.put_TextPrFontName(name);
        }
    }

    onTextColorAuto() {
        const api = getApi();
        const color = new Asc.asc_CColor();
        color.put_auto(true);
        api.put_TextColor(color);
    }

    onTextColor(color) {
        const api = getApi();
        api.put_TextColor(Common.Utils.ThemeColor.getRgbColor(color));
    }

    onHighlightColor(strColor) {
        const api = getApi();
        const rgb = parseHighlightColor(strColor);

        if (rgb === null) {
            api.SetMarkerFormat(true, false);
        } else {
            api.SetMarkerFormat(true, true, rgb.r, rgb.g, rgb.b);
        }
    }

    toggleBold(value) {
        const api = getApi();
        if (api) {
            api.put_TextPrBold(value);
        }
    }

    toggleItalic(value) {
        const api = getApi();
        if (api) {
            api.put_TextPrItalic(value);
        }
    }

    toggleUnderline(value) {
        const api = getApi();
        if (api) {
            api.put_TextPrUnderline(value);
        }
    }

    toggleStrikethrough(value) {
        const api = getApi();
        if (api) {
            api.put_TextPrStrikeout(value);
        }
    }

    // Additional

    onAdditionalStrikethrough(type, value) {
        const api = getApi();
        if (api) {
            if ('strikeout' === type) {
                api.put_TextPrStrikeout(value);
            } else {
                api.put_TextPrDStrikeout(value);
            }
        }
    }

    onAdditionalCaps(type, value) {
        const api = getApi();
        if (api) {
            const paragraphProps = new Asc.asc_CParagraphProperty();
            if ('small' === type) {
                paragraphProps.put_AllCaps(false);
                paragraphProps.put_SmallCaps(value);
            } else {
                paragraphProps.put_AllCaps(value);
                paragraphProps.put_SmallCaps(false);
            }
            api.paraApply(paragraphProps);
        }
    }

    onAdditionalScript(type, value) {
        const api = getApi();
        if (api) {
            if ('superscript' === type) {
                api.put_TextPrBaseline(value ? Asc.vertalign_SuperScript : Asc.vertalign_Baseline);
            } else {
                api.put_TextPrBaseline(value ? Asc.vertalign_SubScript : Asc.vertalign_Baseline);
            }
        }
    }

    changeLetterSpacing(curSpacing, isDecrement) {
        const api = getApi();
        const step = Common.Utils.Metric.getCurrentMetric() === Common.Utils.Metric.c_MetricUnits.pt ? 1 : 0.01;
        const maxValue = Common.Utils.Metric.fnRecalcFromMM(558.7);
        const minValue = Common.Utils.Metric.fnRecalcFromMM(-558.7);
        const newValue = isDecrement
            ? Math.max(minValue, curSpacing - step)
            : Math.min(maxValue, curSpacing + step);
        const convertedValue = Common.Utils.Metric.fnRecalcToMM(newValue);
        if (api) {
            const properties = new Asc.asc_CParagraphProperty();
            properties.put_TextSpacing(convertedValue);
            api.paraApply(properties);
        }
    }

    onParagraphAlign(type) {
        const api = getApi();
        if (api) {
            api.put_PrAlign(paragraphAlignValue(type));
        }
    }

    onParagraphMove(isLeft) {
        const api = getApi();
        if (api) {
            if (isLeft) {
                api.DecreaseIndent();
            } else {
                api.IncreaseIndent();
            }
        }
    }

    onLineSpacing(value) {
        const api = getApi();
        if (api) {
            const LINERULE_AUTO = 1;
            api.put_PrLineSpacing(LINERULE_AUTO, value);
        }
    }

    onBullet(numberingInfo) {
        const api = getApi();
        if (api) {
            api.put_ListTypeCustom(JSON.parse(numberingInfo));
        }
    }

    onNumber(numberingInfo) {
        const api = getApi();
        if (api) {
            api.put_ListTypeCustom(JSON.parse(numberingInfo));
        }
    }

    onMultiLevelList(numberingInfo) {
        const api = getApi();
        if (api) api.put_ListTypeCustom(JSON.parse(numberingInfo));
    }

    getIconsBulletsAndNumbers(arrayElements, type) {
        const api = getApi();
        const arr = [];

        arrayElements.forEach( item => {
            arr.push({
                numberingInfo: JSON.parse(item.numberingInfo),
                divId: item.id
            });
        });

        if (api) api.SetDrawImagePreviewBulletForMenu(arr, type);
    }

    updateBulletsNumbers(type) {
        const api = getApi();
        const storeTextSettings = this.props.storeTextSettings;
        let subtype = undefined;
        let arrayElements = (type===0) ? storeTextSettings.getBulletsList() : (type===1) ? storeTextSettings.getNumbersList() : storeTextSettings.getMultiLevelList();

        for (let i=0; i<arrayElements.length; i++) {
            if (api.asc_IsCurrentNumberingPreset(arrayElements[i].numberingInfo, type!==2)) {
                subtype = arrayElements[i].subtype;
                break;
            }
        }

        switch (type) {
            case 0:
                storeTextSettings.resetBullets(subtype);
                break;
            case 1:
                storeTextSettings.resetNumbers(subtype);
                break;
            case 2:
                storeTextSettings.resetMultiLevel(subtype);
                break;
        }
    }

    updateListType() {
        const api = getApi();
        const listId = api.asc_GetCurrentNumberingId();
        const numformat = (listId !== null) ? api.asc_GetNumberingPr(listId).get_Lvl(api.asc_GetCurrentNumberingLvl()).get_Format() : Asc.c_oAscNumberingFormat.None;

        this.props.storeTextSettings.resetListType(numformat===Asc.c_oAscNumberingFormat.Bullet ? 0 : (numformat===Asc.c_oAscNumberingFormat.None ? -1 : 1));
    }

    onApiFocusObject() {
        this.updateListType();
        this.updateBulletsNumbers(0);
        this.updateBulletsNumbers(1);
        this.updateBulletsNumbers(2);
    }

    setOrientationTextShape(direction) {
        const api = getApi();
        const properties = new Asc.asc_CImgProperty();

        properties.put_Vert(direction);
        api.ImgApply(properties);
    }

    setOrientationTextTable(direction) {
        const api = getApi();
        const properties = new Asc.CTableProp();

        properties.put_CellsTextDirection(direction);
        api.tblApply(properties);
    }

    render() {
        return (
            <EditText
                changeFontSize={this.changeFontSize}
                changeFontFamily={this.changeFontFamily}
                onTextColorAuto={this.onTextColorAuto}
                onTextColor={this.onTextColor}
                onHighlightColor={this.onHighlightColor}
                toggleBold={this.toggleBold}
                toggleItalic={this.toggleItalic}
                toggleUnderline={this.toggleUnderline}
                toggleStrikethrough={this.toggleStrikethrough}
                onAdditionalStrikethrough={this.onAdditionalStrikethrough}
                onAdditionalCaps={this.onAdditionalCaps}
                onAdditionalScript={this.onAdditionalScript}
                changeLetterSpacing={this.changeLetterSpacing}
                onParagraphAlign={this.onParagraphAlign}
                onParagraphMove={this.onParagraphMove}
                onBullet={this.onBullet}
                onNumber={this.onNumber}
                getIconsBulletsAndNumbers={this.getIconsBulletsAndNumbers}
                updateBulletsNumbers={this.updateBulletsNumbers}
                updateListType={this.updateListType}
                onMultiLevelList={this.onMultiLevelList}
                onLineSpacing={this.onLineSpacing}
                setOrientationTextShape={this.setOrientationTextShape}
                setOrientationTextTable={this.setOrientationTextTable}
            />
        )
    }
}

export default inject('storeTextSettings')(observer(EditTextController));

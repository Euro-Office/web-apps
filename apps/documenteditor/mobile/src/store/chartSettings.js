import {action, observable, computed, makeObservable} from 'mobx';

export class storeChartSettings {
    constructor() {
        makeObservable(this, {
            chartStyles: observable,
            fillColor: observable,
            borderColor: observable,
            clearChartStyles: action,
            updateChartStyles: action,
            styles: computed,
            types: computed,
            setFillColor: action,
            getFillColor: action,
            setBorderColor: action,
            initBorderColor: action
        });
    }

    wrapTypesTransform () {
        const map = [
            { ui:'inline', sdk: Asc.c_oAscWrapStyle2.Inline },
            { ui:'square', sdk: Asc.c_oAscWrapStyle2.Square },
            { ui:'tight', sdk: Asc.c_oAscWrapStyle2.Tight },
            { ui:'through', sdk: Asc.c_oAscWrapStyle2.Through },
            { ui:'top-bottom', sdk: Asc.c_oAscWrapStyle2.TopAndBottom },
            { ui:'behind', sdk: Asc.c_oAscWrapStyle2.Behind },
            { ui:'infront', sdk: Asc.c_oAscWrapStyle2.InFront }
        ];
        return {
            sdkToUi: function(type) {
                let record = map.filter(function(obj) {
                    return obj.sdk === type;
                })[0];
                return record ? record.ui : '';
            },

            uiToSdk: function(type) {
                let record = map.filter(function(obj) {
                    return obj.ui === type;
                })[0];
                return record ? record.sdk : 0;
            }
        }
    }

    getWrapType (chartObject) {
        const wrapping = chartObject.get_WrappingStyle();
        const chartWrapType = this.wrapTypesTransform().sdkToUi(wrapping);
        return chartWrapType;
    }

    transformToSdkWrapType (value) {
        const sdkType = this.wrapTypesTransform().uiToSdk(value);
        return sdkType;
    }

    getAlign (chartObject) {
        return chartObject.get_PositionH().get_Align();
    }

    getMoveText (chartObject) {
        return chartObject.get_PositionV().get_RelativeFrom() == Asc.c_oAscRelativeFromV.Paragraph;
    }

    getOverlap (chartObject) {
        return chartObject.get_AllowOverlap();
    }

    getWrapDistance (chartObject) {
        return chartObject.get_Paddings().get_Top();
    }

    // style

    chartStyles = null;

    clearChartStyles () {
        this.chartStyles = null;
    }

    updateChartStyles (styles) {
        this.chartStyles = styles;
    }

    get styles () {
        if (!this.chartStyles) return null;
        const widthContainer = document.querySelector(".page-content").clientWidth;
        const columns = parseInt(widthContainer / 70); // magic
        let row = -1;
        const styles = [];
        this.chartStyles.forEach((style, index) => {
            if (0 == index % columns) {
                styles.push([]);
                row++
            }
            styles[row].push(style);
        });
        return styles;
    }

    get types () {
        const types = [
            { type: Asc.c_oAscChartTypeSettings.barNormal,               thumb: 'chart-column-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.barStacked,              thumb: 'chart-column-stack.svg' },
            { type: Asc.c_oAscChartTypeSettings.barStackedPer,           thumb: 'chart-column-pstack.svg' },
            { type: Asc.c_oAscChartTypeSettings.barNormal3d,             thumb: 'chart-column-3d-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.barStacked3d,            thumb: 'chart-column-3d-stack.svg' },
            { type: Asc.c_oAscChartTypeSettings.barStackedPer3d,         thumb: 'chart-column-3d-pstack.svg' },
            { type: Asc.c_oAscChartTypeSettings.barNormal3dPerspective,  thumb: 'chart-column-3d-normal-per.svg' },
            { type: Asc.c_oAscChartTypeSettings.lineNormal,              thumb: 'chart-line-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.lineStacked,             thumb: 'chart-line-stacked.svg' },
            { type: Asc.c_oAscChartTypeSettings.lineStackedPer,          thumb: 'chart-line-100-stacked.svg' },
            { type: Asc.c_oAscChartTypeSettings.lineNormalMarker,        thumb: 'chart-line-markers.svg' },
            { type: Asc.c_oAscChartTypeSettings.lineStackedMarker,       thumb: 'chart-stacked-markers.svg' },
            { type: Asc.c_oAscChartTypeSettings.lineStackedPerMarker,    thumb: 'chart-100-stacked-markers.svg' },
            { type: Asc.c_oAscChartTypeSettings.line3d,                  thumb: 'chart-line-3d.svg' },
            { type: Asc.c_oAscChartTypeSettings.pie,                     thumb: 'chart-pie-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.doughnut,                thumb: 'chart-pie-doughnut.svg' },
            { type: Asc.c_oAscChartTypeSettings.pie3d,                   thumb: 'chart-pie-3d-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.hBarNormal,              thumb: 'chart-bar-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.hBarStacked,             thumb: 'chart-bar-stack.svg' },
            { type: Asc.c_oAscChartTypeSettings.hBarStackedPer,          thumb: 'chart-bar-pstack.svg' },
            { type: Asc.c_oAscChartTypeSettings.hBarNormal3d,            thumb: 'chart-bar-3d-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.hBarStacked3d,           thumb: 'chart-bar-3d-stack.svg' },
            { type: Asc.c_oAscChartTypeSettings.hBarStackedPer3d,        thumb: 'chart-bar-3d-pstack.svg' },
            { type: Asc.c_oAscChartTypeSettings.areaNormal,              thumb: 'chart-area-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.areaStacked,             thumb: 'chart-area-stack.svg' },
            { type: Asc.c_oAscChartTypeSettings.areaStackedPer,          thumb: 'chart-area-pstack.svg' },
            { type: Asc.c_oAscChartTypeSettings.stock,                   thumb: 'chart-stock-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.scatter,                 thumb: 'chart-scatter-normal.svg' },
            { type: Asc.c_oAscChartTypeSettings.scatterSmoothMarker,     thumb: 'chart-scatter-smooth-lines-and-markers.svg' },
            { type: Asc.c_oAscChartTypeSettings.scatterSmooth,           thumb: 'chart-scatter-smooth-lines.svg' },
            { type: Asc.c_oAscChartTypeSettings.scatterLineMarker,       thumb: 'chart-scatter-straight-lines-and-markers.svg' },
            { type: Asc.c_oAscChartTypeSettings.scatterLine,             thumb: 'chart-scatter-straight-lines.svg' },
            { type: Asc.c_oAscChartTypeSettings.radar,                   thumb: 'chart-radar-1.svg' },
            { type: Asc.c_oAscChartTypeSettings.radarMarker,             thumb: 'chart-radar-2.svg' },
            { type: Asc.c_oAscChartTypeSettings.radarFilled,             thumb: 'chart-radar-3.svg' },
            { type: Asc.c_oAscChartTypeSettings.comboBarLine,            thumb: 'chart-combo-column-line.svg' },
            { type: Asc.c_oAscChartTypeSettings.comboBarLineSecondary,   thumb: 'chart-combo-column-line-secondary-axis.svg' },
            { type: Asc.c_oAscChartTypeSettings.comboAreaBar,            thumb: 'chart-combo-column-area-stack.svg' },
        ];
        const columns = 3;
        const arr = [];
        let row = -1;
        types.forEach((type, index) => {
            if (0 == index % columns) {
                arr.push([]);
                row++
            }
            arr[row].push(type);
        });
        return arr;
    }

    // Fill Color

    fillColor = undefined;

    setFillColor (color) {
        this.fillColor = color;
    }

    getFillColor (shapeProperties) {
        let fill = shapeProperties.get_fill();
        const fillType = fill.get_type();
        let color = 'transparent';
        if (fillType == Asc.c_oAscFill.FILL_TYPE_SOLID) {
            fill = fill.get_fill();
            const sdkColor = fill.get_color();
            if (sdkColor) {
                if (sdkColor.get_type() == Asc.c_oAscColor.COLOR_TYPE_SCHEME) {
                    color = {color: Common.Utils.ThemeColor.getHexColor(sdkColor.get_r(), sdkColor.get_g(), sdkColor.get_b()), effectValue: sdkColor.get_value()};
                } else {
                    color = Common.Utils.ThemeColor.getHexColor(sdkColor.get_r(), sdkColor.get_g(), sdkColor.get_b());
                }
            }
        }
        this.fillColor = color;
        return color;
    }

    // Border size and border color

    borderColor;

    setBorderColor (color) {
        this.borderColor = color;
    }

    initBorderColor (stroke) {
        let color = 'transparent';
        if (stroke && stroke.get_type() == Asc.c_oAscStrokeType.STROKE_COLOR) {
            const sdkColor = stroke.get_color();
            if (sdkColor) {
                if (sdkColor.get_type() == Asc.c_oAscColor.COLOR_TYPE_SCHEME) {
                    color = {color: Common.Utils.ThemeColor.getHexColor(sdkColor.get_r(), sdkColor.get_g(), sdkColor.get_b()), effectValue: sdkColor.get_value()};
                }
                else {
                    color = Common.Utils.ThemeColor.getHexColor(sdkColor.get_r(), sdkColor.get_g(), sdkColor.get_b());
                }
            }
        }
        this.borderColor = color;
        return color;
    }

    borderSizeTransform () {
        const _sizes = [0, 0.5, 1, 1.5, 2.25, 3, 4.5, 6];

        return {
            sizeByIndex: function (index) {
                if (index < 1) return _sizes[0];
                if (index > _sizes.length - 1) return _sizes[_sizes.length - 1];
                return _sizes[index];
            },

            indexSizeByValue: function (value) {
                let index = 0;
                _sizes.forEach((size, idx) => {
                    if (Math.abs(size - value) < 0.25) {
                        index = idx;
                    }
                });
                return index;
            },

            sizeByValue: function (value) {
                return _sizes[this.indexSizeByValue(value)];
            }
        }
    }
}
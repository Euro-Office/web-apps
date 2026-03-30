import {action, observable, computed, makeObservable} from 'mobx';

export class storeChartSettings {
    constructor() {
        makeObservable(this, {
            borderColor: observable,
            fillColor: observable,
            chartStyles: observable,
            setBorderColor: action,
            initBorderColor: action,
            setFillColor: action,
            getFillColor: action,
            clearChartStyles: action,
            updateChartStyles: action,
            styles: computed,
            types: computed,
        });
    }
    
    borderColor = undefined;

    setBorderColor (color) {
        this.borderColor = color;
    }

    initBorderColor(shapeProperties) {
        let stroke = shapeProperties.get_stroke();
        this.borderColor = (stroke && stroke.get_type() == Asc.c_oAscStrokeType.STROKE_COLOR) ? this.resetColor(stroke.get_color()) : 'transparent';
    }

    fillColor = undefined;

    setFillColor (color) {
        this.fillColor = color;
    }

    getFillColor (shapeProperties) {
        const fill = shapeProperties.asc_getFill();
        const fillType = fill.asc_getType();

        if (fillType == Asc.c_oAscFill.FILL_TYPE_SOLID) {
            this.fillColor = this.resetColor(fill.asc_getFill().asc_getColor());
        }

        return this.fillColor;
    }

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
        const _types = [
            { type: Asc.c_oAscChartTypeSettings.barNormal,               thumb: 'chart-column-normal' },
            { type: Asc.c_oAscChartTypeSettings.barStacked,              thumb: 'chart-column-stack' },
            { type: Asc.c_oAscChartTypeSettings.barStackedPer,           thumb: 'chart-column-pstack' },
            { type: Asc.c_oAscChartTypeSettings.barNormal3d,             thumb: 'chart-column-3d-normal' },
            { type: Asc.c_oAscChartTypeSettings.barStacked3d,            thumb: 'chart-column-3d-stack' },
            { type: Asc.c_oAscChartTypeSettings.barStackedPer3d,         thumb: 'chart-column-3d-pstack' },
            { type: Asc.c_oAscChartTypeSettings.barNormal3dPerspective,  thumb: 'chart-column-3d-normal-per' },
            { type: Asc.c_oAscChartTypeSettings.lineNormal,              thumb: 'chart-line-normal' },
            { type: Asc.c_oAscChartTypeSettings.lineStacked,             thumb: 'chart-line-stacked' },
            { type: Asc.c_oAscChartTypeSettings.lineStackedPer,          thumb: 'chart-line-100-stacked' },
            { type: Asc.c_oAscChartTypeSettings.lineNormalMarker,        thumb: 'chart-line-markers' },
            { type: Asc.c_oAscChartTypeSettings.lineStackedMarker,       thumb: 'chart-stacked-markers' },
            { type: Asc.c_oAscChartTypeSettings.lineStackedPerMarker,    thumb: 'chart-100-stacked-markers' },
            { type: Asc.c_oAscChartTypeSettings.line3d,                  thumb: 'chart-line-3d' },
            { type: Asc.c_oAscChartTypeSettings.pie,                     thumb: 'chart-pie-normal' },
            { type: Asc.c_oAscChartTypeSettings.doughnut,                thumb: 'chart-pie-doughnut' },
            { type: Asc.c_oAscChartTypeSettings.pie3d,                   thumb: 'chart-pie-3d-normal' },
            { type: Asc.c_oAscChartTypeSettings.hBarNormal,              thumb: 'chart-bar-normal' },
            { type: Asc.c_oAscChartTypeSettings.hBarStacked,             thumb: 'chart-bar-stack' },
            { type: Asc.c_oAscChartTypeSettings.hBarStackedPer,          thumb: 'chart-bar-pstack' },
            { type: Asc.c_oAscChartTypeSettings.hBarNormal3d,            thumb: 'chart-bar-3d-normal' },
            { type: Asc.c_oAscChartTypeSettings.hBarStacked3d,           thumb: 'chart-bar-3d-stack' },
            { type: Asc.c_oAscChartTypeSettings.hBarStackedPer3d,        thumb: 'chart-bar-3d-pstack' },
            { type: Asc.c_oAscChartTypeSettings.areaNormal,              thumb: 'chart-area-normal' },
            { type: Asc.c_oAscChartTypeSettings.areaStacked,             thumb: 'chart-area-stack' },
            { type: Asc.c_oAscChartTypeSettings.areaStackedPer,          thumb: 'chart-area-pstack' },
            { type: Asc.c_oAscChartTypeSettings.stock,                   thumb: 'chart-stock-normal' },
            { type: Asc.c_oAscChartTypeSettings.scatter,                 thumb: 'chart-scatter-normal' },
            { type: Asc.c_oAscChartTypeSettings.scatterSmoothMarker,     thumb: 'chart-scatter-smooth-lines-and-markers' },
            { type: Asc.c_oAscChartTypeSettings.scatterSmooth,           thumb: 'chart-scatter-smooth-lines' },
            { type: Asc.c_oAscChartTypeSettings.scatterLineMarker,       thumb: 'chart-scatter-straight-lines-and-markers' },
            { type: Asc.c_oAscChartTypeSettings.scatterLine,             thumb: 'chart-scatter-straight-lines' },
            { type: Asc.c_oAscChartTypeSettings.radar,                   thumb: 'chart-radar-1' },
            { type: Asc.c_oAscChartTypeSettings.radarMarker,             thumb: 'chart-radar-2' },
            { type: Asc.c_oAscChartTypeSettings.radarFilled,             thumb: 'chart-radar-3' },
            { type: Asc.c_oAscChartTypeSettings.comboBarLine,            thumb: 'chart-combo-column-line' },
            { type: Asc.c_oAscChartTypeSettings.comboBarLineSecondary,   thumb: 'chart-combo-column-line-secondary-axis' },
            { type: Asc.c_oAscChartTypeSettings.comboAreaBar,            thumb: 'chart-combo-column-area-stack' },
        ];
        const columns = 3;
        let row = -1;
        const groups = [];
        _types.forEach((type, index) => {
            if (0 == index % columns) {
                groups.push([]);
                row++
            }
            groups[row].push(type);
        });
        return groups;
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

    resetColor(color) {
        let clr = 'transparent';

        if(color) {
            if (color.get_auto()) {
                clr = 'auto'
            } else {
                if (color.get_type() == Asc.c_oAscColor.COLOR_TYPE_SCHEME) {
                    clr = {
                        color: Common.Utils.ThemeColor.getHexColor(color.get_r(), color.get_g(), color.get_b()),
                        effectValue: color.get_value()
                    }
                } else {
                    clr = Common.Utils.ThemeColor.getHexColor(color.get_r(), color.get_g(), color.get_b());
                }
            }
        }

        return clr;
    }

}
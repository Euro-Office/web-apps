import {action, observable, computed, makeObservable} from 'mobx';

export class storeShapeSettings {
    constructor() {
        makeObservable(this, {
            fillColor: observable,
            borderColorView: observable,
            setFillColor: action,
            getFillColor: action,
            setBorderColor: action,
            initBorderColorView: action
        });
    }

    getStyleGroups () {
        const styles = [
            {
                title: 'Text',
                thumb: 'shape-text.svg',
                type: 'textRect'
            },
            {
                title: 'Line',
                thumb: 'shape-line.svg',
                type: 'line'
            },
            {
                title: 'Line with arrow',
                thumb: 'shape-arrow.svg',
                type: 'lineWithArrow'
            },
            {
                title: 'Line with two arrows',
                thumb: 'shape-double-arrow.svg',
                type: 'lineWithTwoArrows'
            },
            {
                title: 'Rect',
                thumb: 'shape-square.svg',
                type: 'rect'
            },
            {
                title: 'Hexagon',
                thumb: 'shape-hexagon.svg',
                type: 'hexagon'
            },
            {
                title: 'Round rect',
                thumb: 'shape-rounded-square.svg',
                type: 'roundRect'
            },
            {
                title: 'Ellipse',
                thumb: 'shape-circle.svg',
                type: 'ellipse'
            },
            {
                title: 'Triangle',
                thumb: 'shape-triangle.svg',
                type: 'triangle'
            },
            {
                title: 'Triangle',
                thumb: 'shape-right-triangle.svg',
                type: 'rtTriangle'
            },
            {
                title: 'Trapezoid',
                thumb: 'shape-trapezoid.svg',
                type: 'trapezoid'
            },
            {
                title: 'Diamond',
                thumb: 'shape-rhombus.svg',
                type: 'diamond'
            },
            {
                title: 'Right arrow',
                thumb: 'shape-right-arrow.svg',
                type: 'rightArrow'
            },
            {
                title: 'Left-right arrow',
                thumb: 'shape-left-right-arrow.svg',
                type: 'leftRightArrow'
            },
            {
                title: 'Left arrow callout',
                thumb: 'shape-left-arrow.svg',
                type: 'leftArrow'
            },
            {
                title: 'Right arrow callout',
                thumb: 'shape-bent-up-arrow.svg',
                type: 'bentUpArrow'
            },
            {
                title: 'Flow chart off page connector',
                thumb: 'shape-flowchart-off-page-connector.svg',
                type: 'flowChartOffpageConnector'
            },
            {
                title: 'Heart',
                thumb: 'shape-heart.svg',
                type: 'heart'
            },
            {
                title: 'Math minus',
                thumb: 'shape-minus.svg',
                type: 'mathMinus'
            },
            {
                title: 'Math plus',
                thumb: 'shape-plus.svg',
                type: 'mathPlus'
            },
            {
                title: 'Parallelogram',
                thumb: 'shape-parallelogram.svg',
                type: 'parallelogram'
            },
            {
                title: 'Wedge rect callout',
                thumb: 'shape-rectangular-callout.svg',
                type: 'wedgeRectCallout'
            },
            {
                title: 'Wedge ellipse callout',
                thumb: 'shape-oval-callout.svg',
                type: 'wedgeEllipseCallout'
            },
            {
                title: 'Cloud callout',
                thumb: 'shape-cloud.svg',
                type: 'cloudCallout'
            },
            {
                title: 'Octagon',
                thumb: 'shape-octagon.svg',
                type: 'octagon'
            },
            {
                title: 'Bent right arrow',
                thumb: 'shape-bent-right-arrow.svg',
                type: 'bentRightArrow'
            },
            {
                title: 'Quad arrow',
                thumb: 'shape-quad-arrow.svg',
                type: 'quadArrow'
            },
            {
                title: 'Left-right-up arrow',
                thumb: 'shape-left-right-up-arrow.svg',
                type: 'leftRightUpArrow'
            },
            {
                title: 'Bent arrow',
                thumb: 'shape-bent-arrow.svg',
                type: 'bentArrow'
            },
            {
                title: 'U-turn arrow',
                thumb: 'shape-uturn-arrow.svg',
                type: 'uturnArrow'
            },
            {
                title: 'Left-up arrow',
                thumb: 'shape-left-up-arrow.svg',
                type: 'leftUpArrow'
            },
            {
                title: 'Curved right arrow',
                thumb: 'shape-curved-right-arrow.svg',
                type: 'curvedRightArrow'
            },
            {
                title: 'Curved left arrow',
                thumb: 'shape-curved-left-arrow.svg',
                type: 'curvedLeftArrow'
            },
            {
                title: 'Curved down arrow',
                thumb: 'shape-curved-down-arrow.svg',
                type: 'curvedDownArrow'
            },
            {
                title: 'Curved up arrow',
                thumb: 'shape-curved-up-arrow.svg',
                type: 'curvedUpArrow'
            },
            {
                title: 'Up-down arrow',
                thumb: 'shape-up-down-arrow.svg',
                type: 'upDownArrow'
            },
            {
                title: 'Chevron',
                thumb: 'shape-chevron.svg',
                type: 'chevron'
            },
            {
                title: 'Home plate',
                thumb: 'shape-home-plate.svg',
                type: 'homePlate'
            },
            {
                title: 'Notched right arrow',
                thumb: 'shape-notched-right-arrow.svg',
                type: 'notchedRightArrow'
            },
            {
                title: 'Striped right arrow',
                thumb: 'shape-striped-right-arrow.svg',
                type: 'stripedRightArrow'
            },
            {
                title: 'Left-right arrow callout',
                thumb: 'shape-left-right-arrow-callout.svg',
                type: 'leftRightArrowCallout'
            },
            {
                title: 'Left arrow callout',
                thumb: 'shape-left-arrow-callout.svg',
                type: 'leftArrowCallout'
            },
            {
                title: 'Up arrow callout',
                thumb: 'shape-up-arrow-callout.svg',
                type: 'upArrowCallout'
            },
            {
                title: 'Down arrow callout',
                thumb: 'shape-down-arrow-callout.svg',
                type: 'downArrowCallout'
            },
            {
                title: 'Right arrow callout',
                thumb: 'shape-right-arrow-callout.svg',
                type: 'rightArrowCallout'
            },
            {
                title: 'Circular arrow',
                thumb: 'shape-circular-arrow.svg',
                type: 'circularArrow'
            },
            {
                title: 'Quad arrow callout',
                thumb: 'shape-quad-arrow-callout.svg',
                type: 'quadArrowCallout'
            },
            {
                title: 'Bent left arrow',
                thumb: 'shape-bent-left-arrow.svg',
                type: 'bentLeftArrow'
            }
        ];

        const groups = [];
        let i = 0;

        for (let row=0; row<Math.floor(styles.length/4); row++) {
            const group = [];
            for (let cell=0; cell<4; cell++) {
                group.push(styles[i]);
                i++;
            }
            groups.push(group);
        }

        return groups;
    }

    // Fill Color

    fillColor = undefined;

    setFillColor (color) {
        this.fillColor = color;
    }

    getFillColor (shapeObject) {
        let fill = shapeObject.asc_getFill();
        const fillType = fill.asc_getType();
        let color = 'transparent';

        if (fillType == Asc.c_oAscFill.FILL_TYPE_SOLID) {
            fill = fill.get_fill();
            const sdkColor = fill.asc_getColor();
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

    // Border size and color

    borderColorView;

    setBorderColor (color) {
        this.borderColorView = color;
    }

    initBorderColorView (shapeObject) {
        const stroke = shapeObject.get_stroke();
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
        
        this.borderColorView = color;
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
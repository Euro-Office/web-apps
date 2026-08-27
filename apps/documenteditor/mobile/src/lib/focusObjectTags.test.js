import { strict as assert } from 'node:assert';
import '../../../../../test/unit-tests/mobile/ascStub.js';
import { classifyImageObject, filterFocusObjects } from './focusObjectTags.js';

const T = Asc.c_oAscTypeSelectElement;
const obj = (type, value = {}) => ({ get_ObjectType: () => type, get_ObjectValue: () => value });

describe('documenteditor focusObjectTags', () => {
    describe('classifyImageObject', () => {
        it('returns "chart" when ChartProperties is present, even if ShapeProperties also is', () => {
            // Priority order matters and is confirmed by the Backbone source's if/else-if chain:
            // chart is checked before shape.
            assert.equal(classifyImageObject({ get_ChartProperties: () => true, get_ShapeProperties: () => true }), 'chart');
        });

        it('returns "shape" when only ShapeProperties is present', () => {
            assert.equal(classifyImageObject({ get_ChartProperties: () => false, get_ShapeProperties: () => true }), 'shape');
        });

        it('returns "image" when neither is present', () => {
            assert.equal(classifyImageObject({ get_ChartProperties: () => false, get_ShapeProperties: () => false }), 'image');
        });
    });

    describe('filterFocusObjects', () => {
        it('returns an empty array for no focus objects', () => {
            assert.deepEqual(filterFocusObjects([]), []);
        });

        it('tags Paragraph as both "text" and "paragraph"', () => {
            assert.deepEqual(filterFocusObjects([obj(T.Paragraph)]), ['text', 'paragraph']);
        });

        it('tags Table as "table"', () => {
            assert.deepEqual(filterFocusObjects([obj(T.Table)]), ['table']);
        });

        it('tags Hyperlink as "hyperlink" and Header as "header"', () => {
            assert.deepEqual(filterFocusObjects([obj(T.Hyperlink), obj(T.Header)]), ['hyperlink', 'header']);
        });

        it('classifies an Image-type object via classifyImageObject', () => {
            const shapeValue = { get_ChartProperties: () => false, get_ShapeProperties: () => true };
            assert.deepEqual(filterFocusObjects([obj(T.Image, shapeValue)]), ['shape']);
        });

        it('drops "shape" when "chart" is also present (chart objects are Image+ChartProperties)', () => {
            const chartValue = { get_ChartProperties: () => true, get_ShapeProperties: () => false };
            const shapeValue = { get_ChartProperties: () => false, get_ShapeProperties: () => true };
            // Simulates a chart focus stack that also contains a plain shape-classified entry --
            // the post-processing step must remove 'shape' whenever 'chart' is present at all.
            const result = filterFocusObjects([obj(T.Image, chartValue), obj(T.Image, shapeValue)]);
            assert.ok(result.includes('chart'));
            assert.ok(!result.includes('shape'));
        });

        it('deduplicates repeated tags from multiple objects of the same type', () => {
            assert.deepEqual(filterFocusObjects([obj(T.Table), obj(T.Table)]), ['table']);
        });
    });
});

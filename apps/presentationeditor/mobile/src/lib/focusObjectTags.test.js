import { strict as assert } from 'node:assert';
import '../../../../../test/unit-tests/mobile/ascStub.js';
import { filterFocusObjects, isType, TOP_OBJECT_TYPES } from './focusObjectTags.js';

const T = Asc.c_oAscTypeSelectElement;
const obj = (type, value) => ({ get_ObjectType: () => type, get_ObjectValue: () => value });

const unlockedShape = { get_Locked: () => false, get_FromChart: () => false };
const lockedShape = { get_Locked: () => true, get_FromChart: () => false };
const chartDerivedShape = { get_Locked: () => false, get_FromChart: () => true };
const unlockedSlide = { get_LockLayout: () => false, get_LockBackground: () => false, get_LockTranzition: () => false, get_LockTiming: () => false };
const lockedSlide = { ...unlockedSlide, get_LockLayout: () => true };

describe('presentationeditor focusObjectTags', () => {
    describe('filterFocusObjects', () => {
        it('returns [] for no focus objects', () => {
            assert.deepEqual(filterFocusObjects([]), []);
        });

        it('excludes a locked object entirely -- e.g. a locked shape yields no tags at all', () => {
            assert.deepEqual(filterFocusObjects([obj(T.Shape, lockedShape)]), []);
        });

        it('excludes a Slide with any of the four lock flags set', () => {
            assert.deepEqual(filterFocusObjects([obj(T.Slide, lockedSlide)]), []);
        });

        it('includes an unlocked Slide as "slide"', () => {
            assert.deepEqual(filterFocusObjects([obj(T.Slide, unlockedSlide)]), ['slide']);
        });

        it('derives "text" from an unlocked Paragraph, unshifted to the front', () => {
            const value = { get_Locked: () => false };
            assert.deepEqual(filterFocusObjects([obj(T.Paragraph, value)]), ['text']);
        });

        it('does NOT derive "text" from a locked Paragraph', () => {
            const value = { get_Locked: () => true };
            assert.deepEqual(filterFocusObjects([obj(T.Paragraph, value)]), []);
        });

        it('tags an unlocked Shape as "shape" and also derives "text"', () => {
            assert.deepEqual(filterFocusObjects([obj(T.Shape, unlockedShape)]), ['text', 'shape']);
        });

        it('excludes a chart-derived Shape (get_FromChart() true) entirely, unlike a plain shape', () => {
            assert.deepEqual(filterFocusObjects([obj(T.Shape, chartDerivedShape)]), []);
        });

        it('drops "shape" when "chart" is also present in the same focus stack', () => {
            const chartValue = { get_Locked: () => false };
            const result = filterFocusObjects([obj(T.Chart, chartValue), obj(T.Shape, unlockedShape)]);
            assert.ok(result.includes('chart'));
            assert.ok(!result.includes('shape'));
        });

        it('keeps "hyperlink" when "text" is also present', () => {
            const result = filterFocusObjects([obj(T.Paragraph, { get_Locked: () => false }), obj(T.Hyperlink, {})]);
            assert.ok(result.includes('hyperlink'));
            assert.ok(result.includes('text'));
        });

        it('drops "hyperlink" when "text" is NOT present -- e.g. a hyperlink with no editable text nearby', () => {
            const result = filterFocusObjects([obj(T.Hyperlink, {})]);
            assert.ok(!result.includes('hyperlink'));
        });
    });

    describe('isType', () => {
        it('matches by type when get_ObjectValue() is truthy', () => {
            const match = isType(T.Shape);
            assert.equal(match(obj(T.Shape, {})), true);
        });

        it('does not match a different type', () => {
            const match = isType(T.Shape);
            assert.equal(match(obj(T.Image, {})), false);
        });

        it('does not match when get_ObjectValue() is falsy, even if the type matches', () => {
            const match = isType(T.Shape);
            assert.equal(match(obj(T.Shape, null)), false);
        });
    });

    it('TOP_OBJECT_TYPES has a distinct Asc type for every getXObject key EditingPage.jsx/intf expect', () => {
        const expectedKeys = ['getSlideObject', 'getParagraphObject', 'getShapeObject', 'getImageObject', 'getTableObject', 'getChartObject', 'getLinkObject'];
        assert.deepEqual(Object.keys(TOP_OBJECT_TYPES).sort(), expectedKeys.sort());
        const values = Object.values(TOP_OBJECT_TYPES);
        assert.equal(new Set(values).size, values.length, 'every mapped type must be distinct');
    });
});

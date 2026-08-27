import { strict as assert } from 'node:assert';
import '../../../../../test/unit-tests/mobile/ascStub.js';
import { isObjectSelectionType, getCellSelectionTags, computeToolbarEditAddDisabled } from './selectionRules.js';

const S = Asc.c_oAscSelectionType;

describe('spreadsheeteditor selectionRules', () => {
    describe('isObjectSelectionType', () => {
        it('is true for every object-type selType (Chart/Image/Shape/ChartText/ShapeText)', () => {
            [S.RangeChart, S.RangeImage, S.RangeShape, S.RangeChartText, S.RangeShapeText].forEach((type) => {
                assert.equal(isObjectSelectionType(type), true, `expected ${type} to be an object selection type`);
            });
        });

        it('is false for plain cell/row/col/whole-sheet selections', () => {
            [S.RangeCells, S.RangeRow, S.RangeCol, S.RangeMax].forEach((type) => {
                assert.equal(isObjectSelectionType(type), false, `expected ${type} not to be an object selection type`);
            });
        });

        it('is false for an unrecognized selection type', () => {
            assert.equal(isObjectSelectionType(-1), false);
        });
    });

    describe('getCellSelectionTags', () => {
        it('returns ["cell"] when the cell has no hyperlink', () => {
            assert.deepEqual(getCellSelectionTags({ asc_getHyperlink: () => null }), ['cell']);
        });

        it('returns ["cell", "hyperlink"] when the cell has a hyperlink', () => {
            assert.deepEqual(getCellSelectionTags({ asc_getHyperlink: () => ({ url: 'https://example.com' }) }), ['cell', 'hyperlink']);
        });
    });

    describe('computeToolbarEditAddDisabled', () => {
        it('the real bug this session found: isAddDisabled must be true when wsProps.Objects is set, even with focusOn "cell" and no shape locked', () => {
            // Before the fix, isAddDisabled only ever mirrored `disabled` -- wsProps.Objects
            // (worksheet-level object protection) was never consulted for the Add button at all.
            const { isAddDisabled } = computeToolbarEditAddDisabled({
                disabled: false, wsProps: { Objects: true }, focusOn: 'cell', isShapeLocked: false,
            });
            assert.equal(isAddDisabled, true);
        });

        it('isEditDisabled requires focusOn "obj" AND wsProps.Objects AND isShapeLocked all together', () => {
            const base = { disabled: false, wsProps: { Objects: true }, isShapeLocked: true };
            assert.equal(computeToolbarEditAddDisabled({ ...base, focusOn: 'obj' }).isEditDisabled, true);
            assert.equal(computeToolbarEditAddDisabled({ ...base, focusOn: 'cell' }).isEditDisabled, false);
        });

        it('isEditDisabled is false when the object is unlocked, even under worksheet protection', () => {
            const { isEditDisabled } = computeToolbarEditAddDisabled({
                disabled: false, wsProps: { Objects: true }, focusOn: 'obj', isShapeLocked: false,
            });
            assert.equal(isEditDisabled, false);
        });

        it('an explicit `disabled: true` overrides everything for both buttons', () => {
            const result = computeToolbarEditAddDisabled({
                disabled: true, wsProps: { Objects: false }, focusOn: 'cell', isShapeLocked: false,
            });
            assert.deepEqual(result, { isEditDisabled: true, isAddDisabled: true });
        });

        it('both are false with no protection, no lock, and no explicit disable', () => {
            const result = computeToolbarEditAddDisabled({
                disabled: false, wsProps: { Objects: false }, focusOn: 'obj', isShapeLocked: true,
            });
            assert.deepEqual(result, { isEditDisabled: false, isAddDisabled: false });
        });
    });
});

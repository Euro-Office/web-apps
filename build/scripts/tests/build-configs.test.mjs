/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Run from web-apps/build/: npm run test:scripts
//
// build/*.json held the whole Grunt task config long after webpack replaced
// Grunt. Only the keys below are read (build-pipeline, deploy-common,
// deploy-reporter, deploy-resources, deploy-embed); keep it that way.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = name => JSON.parse(fs.readFileSync(path.join(BUILD_DIR, `${name}.json`), 'utf8'));
const keys = obj => Object.keys(obj || {}).sort();

test('common.json only holds version, build and homepage', () => {
    assert.deepEqual(keys(read('common')), ['build', 'homepage', 'version']);
});

for (const editor of ['documenteditor', 'spreadsheeteditor', 'presentationeditor', 'pdfeditor', 'visioeditor']) {
    test(`${editor}.json only holds what the deploy scripts read`, () => {
        const cfg = read(editor);
        assert.deepEqual(keys(cfg).filter(k => k !== 'embed'), ['main']);
        assert.deepEqual(keys(cfg.main), ['copy']);
        assert.deepEqual(keys(cfg.main.copy), ['help', 'localization']);
        if (cfg.embed) {
            assert.deepEqual(keys(cfg.embed), ['copy', 'js', 'less']);
            assert.deepEqual(keys(cfg.embed.copy), ['images-app', 'indexhtml', 'localization']);
        }
    });
}

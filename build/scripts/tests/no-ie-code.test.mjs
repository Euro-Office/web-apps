/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Run from web-apps/build/: npm run test:scripts
//
// The editors need ES2022, so Internet Explorer can never load them. Guards
// against IE code paths coming back, e.g. with upstream picks.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('apps/ has no Internet Explorer code paths', () => {
    const res = spawnSync('git', ['grep', '-n', '-E',
        String.raw`Common\.Utils\.isIE|isIE11|<!--\[if lt IE|progid:DXImageTransform`,
        '--', 'apps', ':!apps/**/help/**', ':!apps/**/locale/**', ':!apps/**/vendor/**'],
        { cwd: REPO, encoding: 'utf8' });
    assert.equal(res.status, 1, res.stdout || res.stderr);
});

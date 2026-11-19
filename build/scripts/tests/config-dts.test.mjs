// SPDX-FileCopyrightText: Euro-Office contributors
// SPDX-License-Identifier: AGPL-3.0-only

// Run from web-apps/build/: npm run test:scripts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps/api/documents');
const apiJs = fs.readFileSync(path.join(API_DIR, 'api.js'), 'utf8');
const configDts = fs.readFileSync(path.join(API_DIR, 'config.d.ts'), 'utf8');

// ponytail: compares key names only, not nesting or types. Upgrade to a TS AST walk if keys with the same name at different levels drift
const keyPattern = /^\s*['"]?([A-Za-z_]\w*)['"]?\??\s*:/gm;
const keysOf = (text) => new Set([...text.matchAll(keyPattern)].map((m) => m[1]));

test('every option in the api.js config comment block is typed in config.d.ts', () => {
    const block = apiJs.match(/\/\*\s*# Full #([\s\S]*?)\*\//);
    assert.ok(block, 'config comment block not found in api.js');
    const documented = keysOf(block[1].replace(/"[^"\n]*"\s*:/g, ''));
    const typed = keysOf(configDts);
    const missing = [...documented].filter((key) => !typed.has(key));
    assert.deepEqual(missing, [], `add these api.js options to config.d.ts: ${missing.join(', ')}`);
});

test('every event api.js maps to an editorConfig flag is typed in config.d.ts', () => {
    const typed = keysOf(configDts);
    const events = [...apiJs.matchAll(/_config\.events\.(on\w+)/g)].map((m) => m[1]);
    assert.ok(events.length > 10, 'event mapping not found in api.js');
    const missing = [...new Set(events)].filter((key) => !typed.has(key));
    assert.deepEqual(missing, [], `add these events to config.d.ts: ${missing.join(', ')}`);
});

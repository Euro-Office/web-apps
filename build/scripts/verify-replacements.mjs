#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Check A — source-side replacement audit.
 *
 * Verifies that every load-bearing string-replace-loader pattern still matches
 * the expected number of occurrences in apps/**\/\*.js.  Run BEFORE webpack so
 * the pipeline fails fast if an upstream sync or refactor has changed an idiom
 * that a replacement shim depended on.
 *
 * Exit 0 with a summary line per entry on success.
 * Exit 1 with specific failure messages on any count mismatch.
 *
 * Re-baseline procedure (when a count legitimately changes):
 *   1. Run this script — it prints the actual count.
 *   2. Update minCount / exact in build/replacements.manifest.mjs.
 *   3. Commit the baseline change IN THE SAME COMMIT as the source change.
 *   A drop must NEVER be re-baselined without confirming removed occurrences
 *   were intentionally eliminated (not silently refactored past the shim).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LOAD_BEARING } from '../replacements.manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPS_ROOT = path.resolve(__dirname, '..', '..', 'apps');

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(p);
        else if (e.name.endsWith('.js')) yield p;
    }
}

// Build regexes once, then walk files once counting all patterns in a single pass.
const checks = LOAD_BEARING.map(entry => ({
    entry,
    re: entry.flags
        ? new RegExp(entry.search, entry.flags)
        : new RegExp(entry.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    count: 0,
}));

for (const file of walk(APPS_ROOT)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const c of checks) {
        const matches = content.match(c.re);
        if (matches) c.count += matches.length;
    }
}

let failed = false;

for (const { entry, count } of checks) {
    if (entry.exact !== undefined) {
        if (count !== entry.exact) {
            console.error(`verify-replacements: FAIL  ${entry.id}  expected=${entry.exact} actual=${count}`);
            failed = true;
        } else {
            console.log(`verify-replacements: ok    ${entry.id}  count=${count}`);
        }
    } else {
        if (count < entry.minCount) {
            console.error(
                `verify-replacements: FAIL  ${entry.id}  expected>=${entry.minCount} actual=${count}` +
                `  (drop detected — idiom may have been refactored past the shim)`
            );
            failed = true;
        } else {
            if (count > entry.minCount) {
                console.log(
                    `verify-replacements: ok    ${entry.id}  count=${count}` +
                    `  (increased from baseline ${entry.minCount} — consider re-baselining)`
                );
            } else {
                console.log(`verify-replacements: ok    ${entry.id}  count=${count}`);
            }
        }
    }
}

if (failed) {
    console.error(
        'verify-replacements: FAILED\n' +
        '  Update minCount/exact in build/replacements.manifest.mjs in the same commit\n' +
        '  as the source change that caused the count to change.'
    );
    process.exit(1);
}

console.log('verify-replacements: all checks passed');

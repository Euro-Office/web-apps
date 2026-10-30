#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Runs the browser unit tests (test/unit-tests/common/index.html) in headless
// Chrome and prints mocha's results. Exits 1 when a test fails.
//
// With --coverage, also records the V8 coverage of the page and writes
// coverage/browser/lcov.info at the repository root, for the coverage check of
// pull requests (.github/workflows/unit-tests.yml). requirejs loads the
// sources themselves, so the coverage maps to them directly. It covers the
// code unit tests can reach: the shared components, utilities, models and
// collections. The views and controllers, which need the editor, and the
// mobile apps are left out. Files no test loads count as uncovered.
//
// Chrome: puppeteer's own, or PUPPETEER_EXECUTABLE_PATH.

const fs        = require('fs');
const path      = require('path');
const url       = require('url');
const util      = require('util');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT     = path.resolve(__dirname, '../..');
const PAGE     = path.join(ROOT, 'test/unit-tests/common/index.html');
const COVERAGE = path.join(ROOT, 'coverage/browser');
const TIMEOUT  = 60000;

const COVERAGE_INCLUDE = [
    'apps/common/main/lib/{component,core,util,model,collection}/**/*.js',
    'apps/*/main/app/{model,collection}/**/*.js',
];
// keymaster.js is a third-party library
const COVERAGE_EXCLUDE = [
    'apps/common/main/lib/core/keymaster.js',
];

function writeCoverage(entries) {
    const scripts = entries
        .filter(entry => entry.url.startsWith('file://'))
        .filter(entry => path.relative(ROOT, url.fileURLToPath(entry.url)).startsWith('apps' + path.sep))
        .map(entry => entry.rawScriptCoverage);

    const tempDir = path.join(COVERAGE, 'tmp');
    fs.rmSync(COVERAGE, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'coverage-browser.json'), JSON.stringify({ result: scripts }));

    const args = [require.resolve('c8/bin/c8.js'), 'report', '--temp-directory', tempDir,
        '--reports-dir', COVERAGE, '--reporter', 'lcovonly', '--reporter', 'text-summary',
        '--all', '--src', path.join(ROOT, 'apps')];
    COVERAGE_INCLUDE.forEach(pattern => args.push('--include', pattern));
    COVERAGE_EXCLUDE.forEach(pattern => args.push('--exclude', pattern));
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
}

async function main() {
    const coverage = process.argv.includes('--coverage');
    const browser  = await puppeteer.launch({ args: ['--allow-file-access-from-files', '--no-sandbox'] });
    try {
        const page = await browser.newPage();
        // In order, with mocha's format strings (%s, %d) filled in
        let output = Promise.resolve();
        page.on('console', message => {
            const args = Promise.all(message.args().map(arg => arg.jsonValue().catch(() => String(arg))));
            output = output.then(() => args).then(values => {
                let text = values.length ? util.format(...values) : message.text();
                if (message.type() === 'error' && message.location().url)
                    text += ` (${message.location().url})`;
                console.log(text);
            });
        });
        page.on('pageerror', error => console.error(error.message));
        // Tells the page to report to the console (spec) instead of the HTML
        // report, and where to leave the number of failures
        await page.evaluateOnNewDocument(() => { window.__unitTestRunner = true; });
        if (coverage)
            await page.coverage.startJSCoverage({ includeRawScriptCoverage: true });

        await page.goto(url.pathToFileURL(PAGE).href);
        await page.waitForFunction(() => window.__mochaFailures !== undefined, { timeout: TIMEOUT });
        const failures = await page.evaluate(() => window.__mochaFailures);
        await output;

        if (coverage)
            writeCoverage(await page.coverage.stopJSCoverage());
        return failures;
    } finally {
        await browser.close();
    }
}

main().then(failures => {
    process.exitCode = failures ? 1 : 0;
}, error => {
    console.error(error);
    process.exitCode = 1;
});

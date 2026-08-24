#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Full grunt-free build pipeline for Euro Office web-apps.
//
// Usage (from web-apps/build/):
//   PRODUCT_VERSION=9.2.1 BUILD_ROOT=/var/www/... THEME=euro-office node scripts/build-pipeline.js
//
// Options (env vars):
//   PRODUCT_VERSION  required; rejected if major < 6
//   BUILD_ROOT       default: ../deploy (matches grunt's default)
//   BUILD_NUMBER     default: GITHUB_RUN_NUMBER, then common.json.build
//   THEME            default: default
//
// Phase layout (wall-clock optimised):
//   Phase 1 — all parallel:
//     sprites.sh, deploy-common, deploy-html, deploy-reporter,
//     deploy-embed, webpack ×6, mobile ×4
//   Phase 2 — sequential after Phase 1:
//     deploy-mobile     (copies mobile output from source tree to BUILD_ROOT)
//   Phase 3 — parallel (start as soon as Phase 2 done):
//     deploy-resources  (deploys per-editor toolbar/icons.svg)
//     deploy-theme-img  (overwrites common/mobile images; must follow deploy-mobile)
//   Phase 4 — sequential (must follow Phase 3):
//     inline-svgs       (inlines icons.svg from deploy-resources + HTML from Phase 1)

const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');

const BUILD_DIR  = path.resolve(__dirname, '..');
const REPO_ROOT  = path.resolve(BUILD_DIR, '..');
const COMMON_JSON = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, 'common.json'), 'utf8'));

// ---- env resolution ---------------------------------------------------------

const BUILD_ROOT = process.env.BUILD_ROOT
    ? path.resolve(process.env.BUILD_ROOT)
    : path.resolve(BUILD_DIR, '..', 'deploy');

const PRODUCT_VERSION = process.env.PRODUCT_VERSION || COMMON_JSON.version;
const PV_MAJOR = parseInt(PRODUCT_VERSION.split('.')[0], 10);
if (isNaN(PV_MAJOR) || PV_MAJOR < 6) {
    process.stderr.write(
        `FATAL: PRODUCT_VERSION=${PRODUCT_VERSION} (major ${PV_MAJOR} < 6)\n` +
        `Set PRODUCT_VERSION in the environment (e.g. PRODUCT_VERSION=9.2.1)\n`
    );
    process.exit(1);
}

// In CI, GITHUB_RUN_NUMBER auto-increments; locally falls back to common.json
const BUILD_NUMBER = String(
    process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || COMMON_JSON.build
);

const THEME = process.env.THEME || 'default';

// Default every child to production so mobile (webpack.config.js defaults to
// 'development') and desktop (defaults to 'production') agree — without this the
// pipeline could silently emit a dev mobile bundle. Overridable: NODE_ENV=development.
const NODE_ENV = process.env.NODE_ENV || 'production';

// Env passed to every child process
const CHILD_ENV = {
    ...process.env,
    BUILD_ROOT,
    PRODUCT_VERSION,
    BUILD_NUMBER,
    THEME,
    NODE_ENV,
    // Never inherit watch mode from the parent shell — a watching mobile child
    // (webpack.config.js: watch === WATCH==='1') never exits and hangs the pipeline.
    WATCH: '0',
};

// ---- output helpers ---------------------------------------------------------

const BOLD  = s => `\x1b[1m${s}\x1b[0m`;
const DIM   = s => `\x1b[2m${s}\x1b[0m`;
const GREEN = s => `\x1b[32m${s}\x1b[0m`;
const RED   = s => `\x1b[31m${s}\x1b[0m`;
const CYAN  = s => `\x1b[36m${s}\x1b[0m`;
const PAD   = 22; // label column width

function banner(msg) {
    process.stdout.write(`\n${BOLD(CYAN('▶ ' + msg))}\n`);
}

function elapsed(ms) {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ---- task runner ------------------------------------------------------------

// Returns a lazy task spec — nothing is spawned until phase() or runTask() is called.
function task(label, cmd, args = [], opts = {}) {
    return { label, cmd, args, opts };
}

// Spawns a task spec. Returns { promise, kill, label }.
// promise resolves to { label, ms, code } where code=-1 means killed by phase abort.
function runTask({ label, cmd, args, opts = {} }) {
    let child = null;
    const promise = new Promise(resolve => {
        const start = Date.now();
        const paddedLabel = label.padEnd(PAD);
        const stderrBuf = [];

        child = spawn(cmd, args, {
            env: { ...CHILD_ENV, ...(opts.env || {}) },
            cwd: opts.cwd || BUILD_DIR,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        child.stdout.on('data', chunk => {
            for (const line of chunk.toString().split('\n')) {
                if (line.trim()) process.stdout.write(`  ${DIM('[' + label + ']')} ${line}\n`);
            }
        });

        child.stderr.on('data', chunk => { stderrBuf.push(chunk.toString()); });

        child.on('error', err => {
            const ms = Date.now() - start;
            process.stdout.write(`  ${RED('✗')} ${paddedLabel} ${RED('FAILED')} ${DIM(elapsed(ms))}\n`);
            process.stderr.write(`  spawn error: ${err.message}\n`);
            resolve({ label, ms, code: 1 });
        });

        child.on('exit', (code, signal) => {
            const ms = Date.now() - start;
            if (signal) {
                process.stdout.write(`  ${DIM('○')} ${paddedLabel} ${DIM('killed ' + elapsed(ms))}\n`);
                if (stderrBuf.length) process.stderr.write(stderrBuf.join(''));
                resolve({ label, ms, code: -1 });
            } else if (code === 0) {
                process.stdout.write(`  ${GREEN('✓')} ${paddedLabel} ${DIM(elapsed(ms))}\n`);
                resolve({ label, ms, code: 0 });
            } else {
                process.stdout.write(`  ${RED('✗')} ${paddedLabel} ${RED('FAILED')} ${DIM(elapsed(ms))}\n`);
                if (stderrBuf.length) process.stderr.write(stderrBuf.join(''));
                resolve({ label, ms, code });
            }
        });
    });
    return { promise, kill: () => child && child.kill('SIGTERM'), label };
}

// Word-wrap a list of labels into indented lines separated by ' · '.
function formatTaskList(labels, maxWidth = 80) {
    const SEP = ' · ';
    const INDENT = '  ';
    const lines = [];
    let line = INDENT;
    for (const label of labels) {
        const chunk = line === INDENT ? label : SEP + label;
        if (line !== INDENT && line.length + chunk.length > maxWidth) {
            lines.push(line);
            line = INDENT + label;
        } else {
            line += chunk;
        }
    }
    if (line !== INDENT) lines.push(line);
    return lines.join('\n');
}

// Run a set of task specs in parallel; kills siblings on first failure.
// Prints the banner and task list BEFORE spawning, so output order is always correct.
// Returns results array (code=-1 entries are killed tasks, not counted as failures).
async function phase(title, taskSpecs) {
    const count = taskSpecs.length;
    banner(`${title} — ${count} task${count !== 1 ? 's' : ''}`);
    process.stdout.write(DIM(formatTaskList(taskSpecs.map(t => t.label))) + '\n\n');

    const running = taskSpecs.map(runTask);
    let aborted = false;
    const results = await Promise.all(
        running.map(t =>
            t.promise.then(r => {
                if (r.code > 0 && !aborted) {
                    aborted = true;
                    running.forEach(o => { try { o.kill(); } catch (_) {} });
                }
                return r;
            })
        )
    );
    const failed = results.filter(r => r.code > 0);
    if (failed.length) {
        process.stderr.write(RED(`\n✗ ${failed.map(r => r.label).join(', ')} failed — aborting\n`));
        process.exit(1);
    }
    return results;
}

// ---- pipeline ---------------------------------------------------------------

const node = process.execPath; // same node version as the parent
const wp   = path.join(BUILD_DIR, 'node_modules', '.bin', 'webpack');

const WEBPACK_CONFIGS = [
    'webpack.documenteditor.mjs',
    'webpack.spreadsheeteditor.mjs',
    'webpack.presentationeditor.mjs',
    'webpack.visioeditor.mjs',
    'webpack.pdfeditor.mjs',
    'webpack.forms.mjs',
];

const MOBILE_EDITORS = ['word', 'cell', 'slide', 'visio'];
const FRAMEWORK7_DIR = path.join(REPO_ROOT, 'vendor', 'framework7-react');

async function main() {
    const wallStart = Date.now();

    process.stdout.write([
        BOLD('Euro Office web-apps build pipeline'),
        `  BUILD_ROOT       ${BUILD_ROOT}`,
        `  PRODUCT_VERSION  ${PRODUCT_VERSION}`,
        `  BUILD_NUMBER     ${BUILD_NUMBER}`,
        `  THEME            ${THEME}`,
        `  NODE_ENV         ${NODE_ENV === 'production'
            ? GREEN(NODE_ENV)
            : RED(`${NODE_ENV}  ⚠ DEV BUILD — minifier off; not for deploy or fix-validation`)}`,
        '',
    ].join('\n'));

    // ---- preflight: source-side replacement audit (Check A) -----------------
    // Runs before Phase 1 — no point building if load-bearing idioms have drifted.
    const p0 = await phase('Preflight', [
        task('verify-replacements', node, ['scripts/verify-replacements.mjs']),
    ]);

    // ---- phase 1: all independent work in parallel --------------------------

    const phase1Tasks = [
        task('sprites',           node,   ['scripts/deploy-sprites.js']),
        task('deploy-common',     node,   ['scripts/deploy-common.js']),
        task('deploy-html',       node,   ['scripts/deploy-html.js']),
        task('deploy-reporter',   node,   ['scripts/deploy-reporter.js']),
        task('deploy-embed',      node,   ['scripts/deploy-embed.js']),
    ];

    for (const cfg of WEBPACK_CONFIGS) {
        const name = cfg.replace('webpack.', '').replace('.mjs', '');
        phase1Tasks.push(task(`webpack:${name}`, wp, ['--config', cfg]));
    }

    // Mobile: npm install first (sequential), then 4 editors in parallel.
    // Run as a pre-phase so all 4 editor tasks appear individually in the summary.
    const install = await runTask(task('mobile:install', 'npm',
        ['install', '--include=dev', '--production=false'],
        { cwd: FRAMEWORK7_DIR }
    )).promise;
    if (install.code !== 0) {
        process.stderr.write(RED(`\n✗ mobile:install failed — aborting\n`));
        process.exit(1);
    }
    MOBILE_EDITORS.forEach(editor =>
        phase1Tasks.push(task(`mobile:${editor}`, node, ['build/build.js'],
            { cwd: FRAMEWORK7_DIR, env: { TARGET_EDITOR: editor } } // NODE_ENV now in CHILD_ENV
        ))
    );

    const p1 = await phase('Phase 1 — parallel', phase1Tasks);

    // ---- phase 2: deploy-mobile ----------------------------------------------
    // Must run before deploy-theme-images: both write to <editor>/mobile/resources/img/
    // and theme images must win the overlay (deploy-theme-images.js:69).
    const pMobile = await phase('Phase 2 — mobile deploy', [
        task('deploy-mobile', node, ['scripts/deploy-mobile.js']),
    ]);

    // ---- phase 3: deps resolved after phases 1 + 2 --------------------------
    // deploy-resources deploys per-editor toolbar/icons.svg (the sprite inlined into HTML).
    // deploy-theme-img overwrites common/mobile images — disjoint from deploy-resources, safe to run together.
    const p2 = await phase('Phase 3 — parallel', [
        task('deploy-resources', node, ['scripts/deploy-resources.js']),
        task('deploy-theme-img', node, ['scripts/deploy-theme-images.js']),
    ]);

    // Phase 4: inline-svgs MUST run after Phase 3 — it inlines per-editor toolbar/icons.svg
    // (written by deploy-resources) as well as common sprites and HTML from Phase 1.
    // Running it concurrently with deploy-resources races the per-editor icons.svg.
    const p3 = await phase('Phase 4 — inline', [
        task('inline-svgs', node, ['scripts/inline-svgs.js']),
    ]);

    // ---- phase 5: output-side gates (Check B + Check C + Check D) -----------
    // verify-bundles:        scans built bundles for surviving {{TOKEN}} literals.
    // verify-deploy:         asserts every required vendor/embed/main artifact exists.
    // verify-browser-target: asserts no hardcoded targets; consumers import browser-floor.mjs.
    // All are independent reads — safe to run in parallel.
    const p4 = await phase('Phase 5 — gates', [
        task('verify-bundles',        node, ['scripts/verify-bundles.mjs']),
        task('verify-deploy',         node, ['scripts/verify-deploy.mjs']),
        task('verify-browser-target', node, ['scripts/verify-browser-target.mjs']),
    ]);

    // ---- summary -------------------------------------------------------------

    const all = [...p0, install, ...p1, ...pMobile, ...p2, ...p3, ...p4];
    const wallMs = Date.now() - wallStart;

    const longestLabel = Math.max(...all.map(r => r.label.length));
    const lines = all.map(r => {
        const mark = r.code === 0 ? GREEN('✓') : r.code < 0 ? DIM('○') : RED('✗');
        return `  ${mark} ${r.label.padEnd(longestLabel + 2)} ${DIM(elapsed(r.ms))}`;
    });

    process.stdout.write([
        '',
        BOLD('Summary'),
        ...lines,
        '',
        `  Wall clock: ${BOLD(elapsed(wallMs))}`,
        '',
    ].join('\n'));
}

main().catch(err => {
    process.stderr.write(RED(`\nFatal: ${err.message || err}\n`));
    process.exit(1);
});

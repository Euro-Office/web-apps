/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Run from web-apps/build/: npm run test:scripts

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VENDORS } from '../../vendor.manifest.mjs';

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('a task killed by a signal fails the phase', () => {
    const selfKill = `process.kill(process.pid, 'SIGKILL')`;
    const script = `
        const { task, phase } = require(${JSON.stringify(path.join(SCRIPTS, 'build-pipeline.js'))});
        phase('test', [task('oom', process.execPath, ['-e', ${JSON.stringify(selfKill)}])])
            .then(() => process.exit(0));
    `;
    const res = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
    assert.equal(res.status, 1, res.stdout + res.stderr);
    assert.match(res.stdout, /oom\s+.*FAILED \(SIGKILL\)/);
});

const tempDirs = [];
after(() => tempDirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true })));

function fakeDeploy() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-deploy-'));
    tempDirs.push(root);
    const out = path.join(root, 'web-apps');
    const write = rel => {
        fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
        fs.writeFileSync(path.join(out, rel), 'x');
    };
    for (const v of VENDORS) write(v.dir ? `${v.dest}/file` : v.dest);
    for (const ed of ['documenteditor', 'spreadsheeteditor', 'presentationeditor', 'visioeditor', 'pdfeditor']) {
        write(`apps/${ed}/main/app.js`);
        write(`apps/${ed}/main/code.js`);
        if (ed === 'pdfeditor') continue;
        write(`apps/${ed}/embed/app-all.js`);
        for (const f of ['index.html', 'index_loader.html', 'dist/js/app.js', 'css/framework7.css',
            'css/framework7-rtl.css', 'locale/en.json']) {
            write(`apps/${ed}/mobile/${f}`);
        }
    }
    write('apps/documenteditor/forms/app.js');
    write('apps/documenteditor/forms/code.js');
    return root;
}

function verifyDeploy(root, startedAt) {
    return spawnSync(process.execPath, [path.join(SCRIPTS, 'verify-deploy.mjs')], {
        encoding: 'utf8',
        env: { ...process.env, BUILD_ROOT: root, BUILD_STARTED_AT_MS: String(startedAt) },
    });
}

test('verify-deploy passes when every bundle was rebuilt', () => {
    const startedAt = Math.floor(Date.now() / 1000) * 1000;
    const res = verifyDeploy(fakeDeploy(), startedAt);
    assert.equal(res.status, 0, res.stdout + res.stderr);
});

test('verify-deploy fails on a main bundle left over from a previous build', () => {
    const startedAt = Math.floor(Date.now() / 1000) * 1000;
    const root = fakeDeploy();
    const stale = path.join(root, 'web-apps/apps/spreadsheeteditor/main/app.js');
    fs.utimesSync(stale, new Date(startedAt - 3600e3), new Date(startedAt - 3600e3));

    const res = verifyDeploy(root, startedAt);
    assert.equal(res.status, 1, res.stdout + res.stderr);
    assert.match(res.stderr, /STALE\s+apps\/spreadsheeteditor\/main\/app\.js/);
});

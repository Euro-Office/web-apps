#!/usr/bin/env node

// Validates that test dependency versions in package.json match
// the versions installed in vendor/framework7-react/node_modules.
// Runs automatically via `pretest` — see package.json.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const vendorModules = join(root, 'vendor/framework7-react/node_modules');

const depsToCheck = ['react', 'react-dom', 'mobx', 'mobx-react', 'i18next'];
const mismatches = [];

for (const dep of depsToCheck) {
  const testVersion = pkg.devDependencies[dep];
  if (!testVersion) continue;

  try {
    const vendorPkg = JSON.parse(
      readFileSync(join(vendorModules, dep, 'package.json'), 'utf8')
    );
    if (vendorPkg.version !== testVersion) {
      mismatches.push({ dep, test: testVersion, vendor: vendorPkg.version });
    }
  } catch {
    mismatches.push({ dep, test: testVersion, vendor: 'not installed' });
  }
}

if (mismatches.length > 0) {
  const pad = Math.max(...mismatches.map((m) => m.dep.length));

  console.error(`\n${red(bold('✗'))} ${bold('Version mismatches found:')}\n`);
  for (const m of mismatches) {
    console.error(
      `  ${m.dep.padEnd(pad)}  ${dim('test=')}${red(m.test)}  ${dim('vendor=')}${green(m.vendor)}`
    );
  }
  console.error(`\n  Update ${bold('package.json')} to match vendor versions.\n`);
  process.exit(1);
} else {
  console.log(`${green('✓')} All pinned versions match vendor.`);
}

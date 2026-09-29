/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Shared filesystem and image-processing utilities for the deploy scripts.
// Used by deploy-common.js, deploy-resources.js, deploy-reporter.js.
// Do not import from webpack configs — this module uses Node.js fs/path APIs.

const fs   = require('fs');
const path = require('path');
const { optimize: svgoOptimize } = require('svgo');

// ---- svgo config ------------------------------------------------------------

// Mirrors grunt-svgmin's config exactly.
// removeHiddenElems:false — svgo 3.2.0 deletes <symbol> elements otherwise.
// cleanupIds:false — sprite sheets rely on stable symbol IDs.
const SVGO_CONFIG = {
    plugins: [{
        name: 'preset-default',
        params: {
            overrides: {
                cleanupIds:        false,
                removeHiddenElems: false,
            },
        },
    }],
};

// ---- filesystem helpers -----------------------------------------------------

function cleanDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

// Copy a single file, creating parent dirs as needed. No-ops if src is absent.
// With { required: true }, throws instead of silently no-oping on a missing src.
function copyFile(src, dest, opts = {}) {
    if (!fs.existsSync(src)) {
        if (opts.required) throw new Error(`copyFile: required source not found: ${src}`);
        return;
    }
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
}

// ---- glob helpers -----------------------------------------------------------

// Convert a glob pattern to a RegExp.
// Supports: *, **, {a,b,c}, literal chars. Does not support ? or character classes.
function globToRegex(pattern) {
    // Brace expansion: {a,b} → (a|b)
    pattern = pattern.replace(/\{([^}]+)\}/g, (_, list) => `(${list.split(',').join('|')})`);
    // Escape regex special chars (not *, which we handle below)
    pattern = pattern.replace(/[.+^$[\]\\]/g, '\\$&');
    // **/  (globstar with trailing slash) → any path prefix, including empty
    pattern = pattern.replace(/\*\*\//g, '(.*\\/)?');
    // Remaining ** (at end, no trailing slash) → any string
    pattern = pattern.replace(/\*\*/g, '.*');
    // * → any non-separator chars
    pattern = pattern.replace(/\*/g, '[^/]*');
    return new RegExp('^' + pattern + '$');
}

function matchesAny(relPath, patterns) {
    return patterns.some(p => globToRegex(p).test(relPath));
}

// ---- directory traversal ----------------------------------------------------

// Walk srcDir recursively and yield [relPath, absPath] for every file.
function* walkDir(srcDir, rel) {
    if (!fs.existsSync(srcDir)) return;
    rel = rel || '';
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const childRel = rel ? `${rel}/${entry.name}` : entry.name;
        const childAbs = path.join(srcDir, entry.name);
        if (entry.isDirectory()) {
            yield* walkDir(childAbs, childRel);
        } else {
            yield [childRel, childAbs];
        }
    }
}

// Copy files from srcDir to destDir preserving relative paths.
// include: file must match at least one pattern (OR logic); omit to include all.
// exclude: file is skipped if it matches any pattern.
function copyDirFiltered(srcDir, destDir, { include, exclude } = {}) {
    for (const [rel, abs] of walkDir(srcDir)) {
        if (include && !matchesAny(rel, include)) continue;
        if (exclude && matchesAny(rel, exclude)) continue;
        const dest = path.join(destDir, rel);
        ensureDir(path.dirname(dest));
        fs.copyFileSync(abs, dest);
    }
}

function copyDir(srcDir, destDir) {
    copyDirFiltered(srcDir, destDir);
}

// ---- token replacement ------------------------------------------------------

// Replace tokens in every file under dir that matches the given extensions.
function replaceTokensIn(dir, replacements, { exts = ['.js'] } = {}) {
    for (const [rel, abs] of walkDir(dir)) {
        if (!exts.some(e => rel.endsWith(e))) continue;
        let content = fs.readFileSync(abs, 'utf8');
        let changed  = false;
        for (const [from, to] of replacements) {
            const next = content.replace(from, () => to);
            if (next !== content) { content = next; changed = true; }
        }
        if (changed) fs.writeFileSync(abs, content, 'utf8');
    }
}

function replaceTokensInJS(dir, replacements) {
    replaceTokensIn(dir, replacements, { exts: ['.js'] });
}

// ---- image optimisation -----------------------------------------------------

// Optimise and write a single SVG file using svgo.
function writeSVG(srcPath, destPath) {
    const content = fs.readFileSync(srcPath, 'utf8');
    const result  = svgoOptimize(content, { path: srcPath, ...SVGO_CONFIG });
    ensureDir(path.dirname(destPath));
    fs.writeFileSync(destPath, result.data, 'utf8');
}

// Optimise and write a single raster image using sharp.
// PNG: lossless zlib compression (matches optipng behaviour).
// JPEG: quality 95 (near-lossless; jpegtran would be lossless but sharp always re-encodes).
// GIF: sharp 0.33+ optimizer via libvips.
async function writeRaster(srcPath, destPath) {
    const sharp = require('sharp');
    ensureDir(path.dirname(destPath));
    const ext = path.extname(srcPath).toLowerCase();
    const img  = sharp(srcPath);
    if (ext === '.png') {
        await img.png({ compressionLevel: 9 }).toFile(destPath);
    } else if (ext === '.jpg' || ext === '.jpeg') {
        await img.jpeg({ quality: 95 }).toFile(destPath);
    } else if (ext === '.gif') {
        await img.gif().toFile(destPath);
    }
}

// Optimise all images under srcDir into destDir.
//
// File handling:
//   SVG  → svgo optimise
//   PNG/JPG/GIF → sharp optimise
//   ICO  → plain copy (sharp does not support ICO output)
//
// Options:
//   exclude[]   — glob patterns to skip
//   rastersOnly — process rasters+ico only, skip SVGs
//   svgOnly     — process SVGs only, skip rasters+ico
//
// rastersOnly/svgOnly are useful when calling with different source dirs for
// rasters and SVGs in the same destination (e.g. per-editor image passes).
async function optimizeImages(srcDir, destDir, { exclude = [], rastersOnly = false, svgOnly = false } = {}) {
    const rasterPromises = [];

    for (const [rel, abs] of walkDir(srcDir)) {
        if (exclude.length && matchesAny(rel, exclude)) continue;
        const dest = path.join(destDir, rel);
        if (!svgOnly && /\.(png|jpe?g|gif)$/i.test(rel)) {
            rasterPromises.push(writeRaster(abs, dest));
        } else if (!svgOnly && /\.ico$/i.test(rel)) {
            ensureDir(path.dirname(dest));
            fs.copyFileSync(abs, dest);
        } else if (!rastersOnly && rel.endsWith('.svg')) {
            writeSVG(abs, dest);
        }
    }
    await Promise.all(rasterPromises);
}

// ---- exports ----------------------------------------------------------------

module.exports = {
    SVGO_CONFIG,
    cleanDir,
    ensureDir,
    copyFile,
    globToRegex,
    matchesAny,
    walkDir,
    copyDirFiltered,
    copyDir,
    replaceTokensIn,
    replaceTokensInJS,
    writeSVG,
    writeRaster,
    optimizeImages,
};

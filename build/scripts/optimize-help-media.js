#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

// Shrinks the editor help media in the source tree. The help comes from
// upstream as finished files, so re-run this after syncing it and commit the
// result.
//
// - Animated GIFs become a WebM (VP9) and an MP4 (H.264) fallback, and the
//   <img> tags pointing at them become <video>. A GIF is kept when the two
//   videos together are not smaller. WebM comes first because CEF builds
//   without proprietary codecs cannot play H.264.
// - PNGs are recompressed with sharp and kept only when that is smaller.
//
// Needs ffmpeg built with libvpx and libx264. Run from web-apps/build/:
//   node scripts/optimize-help-media.js

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const sharp  = require('sharp');
const { walkDir } = require('./lib/build-utils');

const APPS_DIR = path.resolve(__dirname, '..', '..', 'apps');

const VIDEO_FORMATS = [
    { ext: '.webm', type: 'video/webm', args: ['-c:v', 'libvpx-vp9', '-crf', '33', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4'] },
    { ext: '.mp4',  type: 'video/mp4',  args: ['-c:v', 'libx264', '-crf', '28', '-movflags', '+faststart'] },
];

const IMG_GIF_RE = /<img\b([^>]*?)\s*\bsrc="([^"]+)\.gif"([^>]*?)\s*\/?>/g;

function helpFiles() {
    const files = [];
    for (const editor of fs.readdirSync(APPS_DIR)) {
        for (const [rel, abs] of walkDir(path.join(APPS_DIR, editor, 'main', 'resources', 'help'))) {
            if (!rel.split('/').includes('src')) files.push(abs);
        }
    }
    return files;
}

function sha1(buf) {
    return crypto.createHash('sha1').update(buf).digest('hex');
}

function encodeVideos(gif) {
    const base = gif.slice(0, -'.gif'.length);
    for (const { ext, args } of VIDEO_FORMATS) {
        execFileSync('ffmpeg', [
            '-loglevel', 'error', '-y', '-i', gif, '-an', '-pix_fmt', 'yuv420p',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', ...args, base + ext,
        ]);
    }
    return VIDEO_FORMATS.map(({ ext }) => base + ext);
}

// Identical GIFs are repeated per language and editor; encode each once.
function convertGifs(gifs) {
    const encoded = new Map();
    const converted = new Set();
    for (const gif of gifs) {
        const hash = sha1(fs.readFileSync(gif));
        const base = gif.slice(0, -'.gif'.length);
        if (!encoded.has(hash)) {
            const videos = encodeVideos(gif);
            const videoSize = videos.reduce((sum, file) => sum + fs.statSync(file).size, 0);
            encoded.set(hash, videoSize < fs.statSync(gif).size ? videos : null);
            if (!encoded.get(hash)) videos.forEach(file => fs.unlinkSync(file));
        } else if (encoded.get(hash)) {
            encoded.get(hash).forEach((file, i) => fs.copyFileSync(file, base + VIDEO_FORMATS[i].ext));
        }
        if (encoded.get(hash)) converted.add(gif);
    }
    // Delete only after all copies are made, the first copy is the source for the rest.
    converted.forEach(gif => fs.unlinkSync(gif));
    return converted;
}

function videoTag(before, src, after) {
    const attrs = `${before}${after}`.replace(/\balt=/, 'aria-label=');
    const sources = VIDEO_FORMATS.map(({ ext, type }) => `<source src="${src}${ext}" type="${type}" />`).join('');
    return `<video${attrs} autoplay loop muted playsinline>${sources}</video>`;
}

function rewritePages(pages, converted) {
    let count = 0;
    for (const page of pages) {
        const html = fs.readFileSync(page, 'utf8');
        const out = html.replace(IMG_GIF_RE, (tag, before, src, after) => {
            if (!converted.has(path.resolve(path.dirname(page), `${src}.gif`))) return tag;
            count++;
            return videoTag(before, src, after);
        });
        if (out !== html) fs.writeFileSync(page, out, 'utf8');
    }
    return count;
}

async function optimizePngs(pngs) {
    let saved = 0;
    for (const png of pngs) {
        const input = fs.readFileSync(png);
        const output = await sharp(input).png({ compressionLevel: 9 }).toBuffer();
        if (output.length < input.length) {
            fs.writeFileSync(png, output);
            saved += input.length - output.length;
        }
    }
    return saved;
}

(async () => {
    const files = helpFiles();
    const converted = convertGifs(files.filter(f => f.endsWith('.gif')));
    const tags = rewritePages(files.filter(f => /\.html?$/.test(f)), converted);
    console.log(`optimize-help-media: ${converted.size} GIFs converted, ${tags} tags rewritten`);
    const saved = await optimizePngs(files.filter(f => f.endsWith('.png')));
    console.log(`optimize-help-media: PNGs ${(saved / 1048576).toFixed(1)} MB smaller`);
})().catch(err => {
    console.error(err);
    process.exit(1);
});

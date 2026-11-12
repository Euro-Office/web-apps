/**
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Single source of truth for vendor artifact paths.
 *
 * Consumed by:
 *   build/scripts/deploy-common.js  — copies vendor files from src to dest
 *   build/scripts/verify-deploy.mjs — asserts each dest exists and is non-empty (Check C)
 *
 * Fields:
 *   name   — human label used in log output
 *   src    — path relative to web-apps/build/node_modules/ (npm packages, kept current by Renovate),
 *            or to web-apps/vendor/ when local is true (our own code, or not published to npm)
 *   dest   — path relative to BUILD_ROOT/web-apps/ (BUILD_OUT)
 *   local  — true: src lives in web-apps/vendor/
 *   dir    — true: src is a directory, copied with the optional include/exclude globs
 *   minify — true: src is minified with terser before writing dest
 *   jquery — true: src is the jquery package, built by scripts/lib/jquery-min.js
 *
 * The vendor/<lib> paths that unbuilt pages load (apps/<editor>/main/index.html, app_dev.js,
 * test/) are symlinks into build/node_modules.
 */
export const VENDORS = [
    // ---- jquery ---------------------------------------------------------------
    { name: 'jquery',         src: 'jquery',                                    dest: 'vendor/jquery/jquery.min.js', jquery: true },
    { name: 'jquery.browser', src: 'jquery.browser/dist/jquery.browser.min.js', dest: 'vendor/jquery/jquery.browser.min.js' },

    // ---- simple file copies ---------------------------------------------------
    { name: 'socketio',       src: 'socket.io-client/dist/socket.io.min.js',    dest: 'vendor/socketio/socket.io.min.js' },
    { name: 'xregexp',        src: 'xregexp/xregexp-all-min.js',                dest: 'vendor/xregexp/xregexp-all-min.js', local: true },
    { name: 'underscore',     src: 'underscore/underscore-min.js',              dest: 'vendor/underscore/underscore-min.js' },

    // ---- requirejs ------------------------------------------------------------
    { name: 'requirejs',      src: 'requirejs/require.js',                      dest: 'vendor/requirejs/require.js', minify: true },

    // ---- monaco: our wrappers, then the editor itself into vendor/monaco/monaco
    { name: 'monaco',         src: 'monaco',        dest: 'vendor/monaco',        dir: true, local: true, exclude: ['monaco'] },
    { name: 'monaco-editor',  src: 'monaco-editor', dest: 'vendor/monaco/monaco', dir: true, include: ['*'] },
    { name: 'monaco-editor/min', src: 'monaco-editor/min', dest: 'vendor/monaco/monaco/min', dir: true },
];

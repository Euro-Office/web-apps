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
 *   src    — path relative to web-apps/vendor/ (VENDOR_SRC)
 *   dest   — path relative to BUILD_ROOT/web-apps/ (BUILD_OUT)
 *   dir    — true: src is a directory; verify-deploy checks dest is a non-empty directory
 *   minify — true: deploy-common handles this entry specially (requirejs minification)
 *
 * Entries without dir/minify are plain file copies consumed by the generic vendor loop.
 */
export const VENDORS = [
    // ---- jquery ---------------------------------------------------------------
    { name: 'jquery',        src: 'jquery/jquery.min.js',                   dest: 'vendor/jquery/jquery.min.js' },
    { name: 'jquery.browser', src: 'jquery.browser/dist/jquery.browser.min.js', dest: 'vendor/jquery/jquery.browser.min.js' },

    // ---- simple file copies ---------------------------------------------------
    { name: 'socketio',      src: 'socketio/socket.io.min.js',              dest: 'vendor/socketio/socket.io.min.js' },
    { name: 'xregexp',       src: 'xregexp/xregexp-all-min.js',             dest: 'vendor/xregexp/xregexp-all-min.js' },
    { name: 'underscore',    src: 'underscore/underscore-min.js',           dest: 'vendor/underscore/underscore-min.js' },

    // ---- requirejs (minified before copy — deploy-common handles specially) ---
    { name: 'requirejs',     src: 'requirejs/require.js',                   dest: 'vendor/requirejs/require.js', minify: true },

    // ---- monaco (directory copy) ---------------------------------------------
    { name: 'monaco',        src: 'monaco',                                 dest: 'vendor/monaco', dir: true },
];

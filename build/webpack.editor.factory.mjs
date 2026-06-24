/**
 * (c) Copyright Ascensio System SIA 2010-2024
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Shared webpack 5 config factory for all desktop editors.
 *
 * AMD / requirejs handling (applies to all editors):
 *  - require.config() calls in source are no-ops; webpack ignores them.
 *  - define([deps], factory) is handled natively by webpack 5.
 *  - require([deps], callback) in entry files creates async chunks by default.
 *    asyncChunks: false disables this — all AMD require() calls inside define()
 *    factories are resolved at build time and bundled synchronously.
 *  - text! plugin: NormalModuleReplacementPlugin strips the prefix; .template
 *    files are served as raw strings via asset/source.
 *  - externals use externalsType: 'amd' so webpack emits AMD define([dep], ...)
 *    instead of the broken `void 0` produced by the per-key { amd: 'sdk' }
 *    multi-format object when library.type is only set per-entry.
 */

import webpack from 'webpack';
import path from 'path';
import { fileURLToPath } from 'url';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { assertBuildEnv, themeDefines, themeFormVars, themeGlobalVars, themeReplacements } from './theme.config.mjs';
import { LOAD_BEARING } from './replacements.manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Returns the webpack config for a desktop editor or sub-app.
 * @param {string} editorName - e.g. 'documenteditor', 'spreadsheeteditor'
 * @param {object} opts
 * @param {string} [opts.subpath='main']     - sub-directory under apps/<editor>/
 * @param {string} [opts.lessEntry]          - LESS entry path (relative to APPS_ROOT);
 *                                             defaults to <editor>/<subpath>/resources/less/app.less
 */
export function editorConfig(editorName, opts = {}) {
    assertBuildEnv();

    const subpath = opts.subpath || 'main';

    const env = process.env.NODE_ENV || 'production';

    const BUILD_ROOT = process.env.BUILD_ROOT
        ? path.resolve(process.env.BUILD_ROOT)
        : path.resolve(__dirname, '../deploy');

    const APPS_ROOT   = path.resolve(__dirname, '../apps');
    const VENDOR_ROOT = path.resolve(__dirname, '../vendor');
    const OUT_DIR     = path.join(BUILD_ROOT, `web-apps/apps/${editorName}/${subpath}`);

    const lessEntry = opts.lessEntry
        ? path.join(APPS_ROOT, opts.lessEntry)
        : path.join(APPS_ROOT, `${editorName}/${subpath}/resources/less/app.less`);

    // LESS compiled alongside JS; MiniCssExtractPlugin pulls it to app.css (root of OUT_DIR)
    const productVersion = process.env.PRODUCT_VERSION
        ? `${process.env.PRODUCT_VERSION}${process.env.BUILD_NUMBER ? `.${process.env.BUILD_NUMBER}` : ''}`
        : '0.0.0';

    return {
        mode: env,

        cache: {
            type: 'memory',
        },

        entry: {
            app: {
                import: [
                    lessEntry,
                    path.join(APPS_ROOT, `${editorName}/${subpath}/app.js`),
                ],
                library: { type: 'amd', name: 'app' },
            },
            code: {
                import: path.join(APPS_ROOT, `${editorName}/${subpath}/app_pack.js`),
                library: { type: 'amd', name: `${editorName}/${subpath}/code` },
            },
        },

        output: {
            path: OUT_DIR,
            filename: '[name].js',
            chunkFilename: '[name].chunk.js',
            publicPath: '',
            // clean:false is intentional — all six editors share BUILD_ROOT; wiping it would
            // destroy sibling editors' output. Safe only because the output set is fixed
            // ([name].js, [name].css, locale/*). Do not enable splitChunks or dynamic import()
            // without also adding per-editor output cleaning or content-hashed filenames —
            // a build that stops emitting a chunk leaves a stale file the SW will cache.
            clean: false,
            // asyncChunks:false keeps all AMD require() calls bundled synchronously.
            asyncChunks: false,
        },

        resolve: {
            extensions: ['.js'],
            // r.js paths config translated to webpack aliases.
            // baseUrl was '../apps/' in the r.js build config, so paths here
            // are relative to APPS_ROOT.
            alias: {
                underscore:       path.join(VENDOR_ROOT, 'underscore/underscore-min.js'),
                backbone:         path.join(VENDOR_ROOT, 'backbone/backbone-min.js'),
                perfectscrollbar: path.join(APPS_ROOT,   'common/main/lib/mods/perfect-scrollbar.js'),
                jmousewheel:      path.join(VENDOR_ROOT, 'perfect-scrollbar/src/jquery.mousewheel.js'),
                core:             path.join(APPS_ROOT,   'common/main/lib/core/application.js'),
                notification:     path.join(APPS_ROOT,   'common/main/lib/core/NotificationCenter.js'),
                keymaster:        path.join(APPS_ROOT,   'common/main/lib/core/keymaster.js'),
                tip:              path.join(APPS_ROOT,   'common/main/lib/util/Tip.js'),
                localstorage:     path.join(APPS_ROOT,   'common/main/lib/util/LocalStorage.js'),
                analytics:        path.join(APPS_ROOT,   'common/Analytics.js'),
                gateway:          path.join(APPS_ROOT,   'common/Gateway.js'),
                locale:           path.join(APPS_ROOT,   'common/locale.js'),
                irregularstack:   path.join(APPS_ROOT,   'common/IrregularStack.js'),
            },
            // Mirrors r.js baseUrl: unaliased module IDs resolve against APPS_ROOT first.
            modules: [APPS_ROOT, 'node_modules'],
        },

        // r.js `empty:` paths are excluded from the bundle.
        // Provided at runtime by DocumentServer (sdkjs, socketio, etc.).
        externalsType: 'amd',
        externals: {
            jquery:        'jquery',
            xregexp:       'xregexp',
            socketio:      'socketio',
            coapisettings: 'coapisettings',
            allfonts:      'allfonts',
            sdk:           'sdk',
            api:           'api',
        },

        module: {
            rules: [
                {
                    test: /\.js$/,
                    include: APPS_ROOT,
                    loader: 'string-replace-loader',
                    options: { multiple: themeReplacements(productVersion) },
                },
                {
                    // locale.js contains a dead fetch/Promise polyfill branch that uses
                    // require([...], cb) inside an IIFE body, which crashes the AMD parser
                    // (addPresentationalDependency TypeError). Remove it — fetch and Promise
                    // are always native in modern browsers.
                    test: /common[/\\]locale\.js$/,
                    loader: 'string-replace-loader',
                    options: {
                        multiple: (() => {
                            const e = LOAD_BEARING.find(x => x.id === 'locale-fetch');
                            return [{ search: e.search, replace: '    _requireLang();', flags: e.flags }];
                        })(),
                    },
                },
                {
                    test: /(?:main|forms)[/\\]app\.js$/,
                    parser: { requireJs: true },
                },
                {
                    test: /\.template$/,
                    type: 'asset/source',
                },
                {
                    // LESS → CSS (extracted to resources/css/app.css)
                    test: /\.less$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        { loader: 'css-loader', options: { url: false } },
                        {
                            loader: 'less-loader',
                            options: {
                                lessOptions: {
                                    javascriptEnabled: true,
                                    globalVars: {
                                        // Compile-time path vars (browser-relative, for url() in CSS)
                                        'app-image-const-path':    "'../img'",
                                        'common-image-const-path': "'../../../../common/main/resources/img'",
                                        ...themeGlobalVars(env, editorName),
                                        // Forms logo vars use absolute source paths for data-uri() at compile time.
                                        // Empty for non-forms configs — vars not consumed in their LESS.
                                        ...(subpath === 'forms' ? themeFormVars() : {}),
                                    },
                                },
                            },
                        },
                    ],
                },
            ],
        },

        plugins: [
            // Anchored to the start of the request string — avoids false hits on
            // module IDs that happen to contain 'text!' elsewhere in the path.
            new webpack.NormalModuleReplacementPlugin(
                /^text!/,
                resource => { resource.request = resource.request.replace(/^text!/, ''); }
            ),

            new webpack.DefinePlugin({
                __PRODUCT_VERSION__: JSON.stringify(productVersion),
                ...themeDefines(),
            }),

            new webpack.BannerPlugin({
                banner: `\n* (c) Copyright Ascensio System SIA 2010-2024\n* Version: ${productVersion}\n`,
                entryOnly: true,
                raw: false,
            }),

            new MiniCssExtractPlugin({
                filename: '[name].css',
            }),

            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.join(APPS_ROOT, `${editorName}/${subpath}/locale`),
                        to:   path.join(OUT_DIR, 'locale'),
                        // would be silently missing from the deployed package if
                        // the locale dir doesn't exist — noErrorOnMissing would hide it.
                    },
                ],
            }),
        ],

        optimization: {
            // splitChunks:false — see clean:false note above. Enabling this without
            // content-hashed filenames or per-editor cleaning leaves stale chunks on disk.
            splitChunks: false,
            minimize: env === 'production',
            minimizer: [
                new TerserPlugin({
                    extractComments: false,
                    terserOptions: {
                        format: {
                            comments: /AGPL|Copyright|Ascensio|License/i,
                        },
                        compress: {
                            drop_console: env === 'production',
                        },
                        // mangle:false is load-bearing — 117 source files use `var Common = Common || {}`
                        // as a namespace guard. Inside webpack's module factory `this`/global scope
                        // differs, so the guard never fires and mangling breaks Common.* access.
                        // See .claude/findings/webpack5-var-common-scoping.md before changing this.
                        mangle: false,
                    },
                }),
            ],
        },

        devtool: env === 'production' ? false : 'source-map',
    };
}

/*
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
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */
module.exports = function(grunt) {
    require('time-grunt')(grunt);

    var _ = require('lodash'),
        defaultConfig,
        packageFile;

    const copyrightHeader = 'Copyright (c) Ascensio System SIA <%= grunt.template.today("yyyy") %>. All rights reserved'
    var copyright = '/*!\n' +
                    ' * ' + (process.env['APP_COPYRIGHT'] || copyrightHeader) + '\n' +
                    ' *\n' +
                    ' * <%= pkg.homepage %> \n' +
                    ' *\n' +
                    ' * Version: <%= pkg.version %> (build:<%= pkg.build %>)\n' +
                    ' */\n';
    global.copyright = copyright;

    let iconv_lite, encoding = process.env.SYSTEM_ENCODING;
    grunt.log.writeln('platform: ' + process.platform.green);
    if (process.platform == 'win32') {
        const cmdencoding = require('child_process').execSync('chcp');
        grunt.log.writeln(cmdencoding);
        if ( !encoding ) {
            if ( cmdencoding.includes('866') ) encoding = '1251'; else
            if ( cmdencoding.includes('437') ) encoding = '1252'; else
            if ( cmdencoding.includes('65001') ) encoding = 'utf8';
        }

        if ( !!encoding && !/utf-?8/i.test(encoding) ) {
            iconv_lite = require('iconv-lite');
        }
    }

    let _encode = (string) => {
        return !!string && !!iconv_lite ? iconv_lite.encode(string,encoding) : string;
    };

    // Helper: resolve a brand value with priority: env var > theme config.json > ''
    // Empty strings from config are respected (row will be hidden in templates).
    let _themVal = (envVal, configKey) => {
        return function() {
            if (envVal != null && envVal !== '') return _encode(envVal);
            var configVal = configKey && global.themeMeta && global.themeMeta[configKey];
            if (configVal != null) return _encode(configVal);
            return '';
        };
    };

    global.jsreplacements = [
                {
                    from: /\{\{SUPPORT_EMAIL\}\}/g,
                    to: _themVal(process.env.SUPPORT_EMAIL, 'support_email')
                },{
                    from: /\{\{SUPPORT_URL\}\}/g,
                    to: _themVal(process.env.SUPPORT_URL, 'support_url')
                },{
                    from: /\{\{SALES_EMAIL\}\}/g,
                    to: _themVal(process.env.SALES_EMAIL, 'sales_email')
                },{
                    from: /\{\{PUBLISHER_URL\}\}/g,
                    to: _themVal(process.env.PUBLISHER_URL, 'publisher_url')
                },{
                    from: /\{\{PUBLISHER_PHONE\}\}/,
                    to: _themVal(process.env.PUBLISHER_PHONE, 'publisher_phone')
                },{
                    from: /\{\{PUBLISHER_NAME\}\}/g,
                    to: _themVal(process.env.PUBLISHER_NAME, 'publisher_name')
                },{
                    from: /\{\{PUBLISHER_ADDRESS\}\}/,
                    to: _themVal(process.env.PUBLISHER_ADDRESS, 'publisher_address')
                },{
                    from: /\{\{ATTRIBUTION\}\}/g,
                    to: _themVal(process.env.ATTRIBUTION, 'attribution')
                },{
                    from: /\{\{API_URL_EDITING_CALLBACK\}\}/,
                    to: _themVal(process.env.API_URL_EDITING_CALLBACK, 'api_url_editing_callback')
                },{
                    from: /\{\{COMPANY_NAME\}\}/g,
                    to: _themVal(process.env.COMPANY_NAME, 'company_name')
                }, {
                    from: /\{\{APP_TITLE_TEXT\}\}/g,
                    to: _themVal(process.env.APP_TITLE_TEXT, 'app_title')
                }, {
                    from: /\{\{HELP_URL\}\}/g,
                    to: _themVal(process.env.HELP_URL, 'help_url')
                }, {
                    from: /\{\{HELP_CENTER_WEB_DE\}\}/g,
                    to: _themVal(process.env.HELP_CENTER_WEB_DE, 'help_center_web_de')
                }, {
                    from: /\{\{HELP_CENTER_WEB_SSE\}\}/g,
                    to: _themVal(process.env.HELP_CENTER_WEB_SSE, 'help_center_web_sse')
                }, {
                    from: /\{\{HELP_CENTER_WEB_PE\}\}/g,
                    to: _themVal(process.env.HELP_CENTER_WEB_PE, 'help_center_web_pe')
                }, {
                    from: /\{\{DEFAULT_LANG\}\}/g,
                    to: function() { return _themVal(process.env.DEFAULT_LANG, 'default_lang')() || 'en'; }
                }, {
                    from: /\{\{SUGGEST_URL\}\}/g,
                    to: _themVal(process.env.SUGGEST_URL, 'suggest_url')
                }];

    var helpreplacements = [
                {
                    from: /\{\{COEDITING_DESKTOP\}\}/g,
                    to: _encode(process.env.COEDITING_DESKTOP) || 'Подключиться к облаку'
                },{
                    from: /\{\{PLUGIN_LINK\}\}/g,
                    to: _encode(process.env.PLUGIN_LINK) || 'https://api.onlyoffice.com/plugin/basic'
                },{
                    from: /\{\{PLUGIN_LINK_MACROS\}\}/g,
                    to: _encode(process.env.PLUGIN_LINK_MACROS) || 'https://api.onlyoffice.com/plugin/macros'
                }];

    let path = require('path');
    let addons = grunt.option('addon') || [];
    if (!Array.isArray(addons))
        addons = [addons];

    addons.forEach((element,index,self) => self[index] = path.join('../..', element, '/build'));
    addons = addons.filter(element => grunt.file.isDir(element));

    // Theme support — load theme.less directly from theme/ folder (no copy to source tree)
    const defaultTheme = 'euro-office';
    const theme = process.env.THEME || defaultTheme;
    grunt.log.writeln('theme: ' + theme.green);
    const themeEntry = path.join('..', 'theme', theme, 'assets', 'less', 'theme.less');
    let themeFiles = null; // null = not yet resolved

    // Helper to append theme files to a LESS source array (resolves lazily)
    global.appendThemeFiles = function(src) {
        if (themeFiles === null) {
            if (grunt.file.exists(themeEntry)) {
                themeFiles = [themeEntry];
                grunt.log.writeln('Theme: ' + theme.green);
            } else {
                themeFiles = [];
                if (theme !== defaultTheme) {
                    grunt.log.warn('Theme not found: ' + themeEntry);
                }
            }
        }
        let srcArray = Array.isArray(src) ? src : [src];
        if (themeFiles.length > 0) {
            return srcArray.concat(themeFiles);
        }
        return srcArray;
    };

    // Initialize themeMeta for config.json values (populated by deploy-theme task)
    global.themeMeta = {};

    // deploy-theme: load config.json from theme folder.
    // LESS files are referenced directly from theme/ via appendThemeFiles — no copy needed.
    grunt.registerTask('deploy-theme', 'Load theme config', function() {
        const themeRoot = path.join('..', 'theme', theme);

        global.themeMeta = {};

        const configPath = path.join(themeRoot, 'meta', 'config.json');
        if (grunt.file.exists(configPath)) {
            global.themeMeta = grunt.file.readJSON(configPath);
            grunt.log.writeln('Theme config loaded: ' + configPath);
        }

        // Populate forms logo vars from theme config
        global.themeFormVars = {};
        if (global.themeMeta.forms_logo_light) {
            var relPath = '../../../../theme/' + theme + '/assets/img/header';
            global.themeFormVars['theme-forms-logo-light-path'] = "'" + relPath + '/' + global.themeMeta.forms_logo_light + "'";
            global.themeFormVars['theme-forms-logo-dark-path'] = "'" + relPath + '/' + (global.themeMeta.forms_logo_dark || global.themeMeta.forms_logo_light) + "'";
            grunt.log.writeln('Theme forms logo vars set');
        }

        if (!grunt.file.isDir(themeRoot) && theme !== 'default') {
            grunt.log.warn('Theme directory not found: ' + themeRoot);
        }
    });

    // deploy-theme-images: copy theme images to BUILD_ROOT.
    // Runs after all editor deploys so that theme images overwrite stock versions.
    grunt.registerTask('deploy-theme-images', 'Copy theme images to build output', function() {
        const themeRoot = path.join('..', 'theme', theme);
        const imgSrc = path.join(themeRoot, 'assets', 'img');

        if (grunt.file.isDir(imgSrc)) {
            const editors = ['documenteditor', 'spreadsheeteditor', 'presentationeditor', 'visioeditor'];

            // Desktop + mobile common dirs, plus each editor's mobile dir.
            // The editor/mobile copy is required because mobile production URLs
            // resolve to apps/<editor>/mobile/resources/img/ (copy:images-app
            // flattens common/mobile into each editor's mobile dir from SOURCE,
            // which never sees theme files — so we deploy them directly here).
            const imgDests = [
                path.join(BUILD_ROOT, 'web-apps', 'apps', 'common', 'main', 'resources', 'img'),
                path.join(BUILD_ROOT, 'web-apps', 'apps', 'common', 'mobile', 'resources', 'img'),
                ...editors.map(e => path.join(BUILD_ROOT, 'web-apps', 'apps', e, 'mobile', 'resources', 'img'))
            ];
            imgDests.forEach(function(imgDest) {
                grunt.file.expandMapping('**/*', imgDest, { cwd: imgSrc, flatten: false, filter: 'isFile' })
                    .forEach(function(f) {
                        grunt.file.copy(f.src[0], f.dest);
                    });
            });

            // Embed logo — copy to each editor's embed img dir
            var embedLogo = path.join(imgSrc, 'embed', 'logo.svg');
            if (grunt.file.exists(embedLogo)) {
                editors.forEach(function(editor) {
                    var dest = path.join(BUILD_ROOT, 'web-apps', 'apps', editor, 'embed', 'resources', 'img', 'logo.svg');
                    grunt.file.copy(embedLogo, dest);
                });
                grunt.log.writeln('Theme embed logo deployed');
            }

            grunt.log.writeln('Theme images deployed to ' + BUILD_ROOT);
        }
    });

    const BUILD_ROOT = path.resolve(process.env.BUILD_ROOT || path.join('..', 'deploy'));

    const SRC_ROOT = path.resolve(__dirname, "..")

    function replaceDeployPaths(obj) {
        const deployRoot = BUILD_ROOT.replace(/\\/g, '/');

        if (typeof obj === 'string') {
            return obj.replace(/\$BUILD_ROOT/g, deployRoot);
        }
        if (Array.isArray(obj)) {
            return obj.map(replaceDeployPaths);
        }
        if (typeof obj === 'object' && obj !== null) {
            const out = {};
            for (const k in obj) {
                const newKey = k.replace(/\$BUILD_ROOT/g, deployRoot);
                out[newKey] = replaceDeployPaths(obj[k]);
            }
            return out;
        }
        return obj;
    }

    require('./appforms')(grunt, replaceDeployPaths);


    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-json-minify');
    grunt.loadNpmTasks('grunt-text-replace');
    // grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-inline');
    grunt.loadNpmTasks('grunt-svgmin');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-terser');
    grunt.loadNpmTasks('grunt-babel');

    function doRegisterTask(name, callbackConfig) {
        return grunt.registerTask(name + '-init', function() {
            var additionalConfig = {},
                initConfig = {};

            if (_.isFunction(callbackConfig)) {
                additionalConfig = callbackConfig.call(this, defaultConfig, packageFile);
            }

            if (!_.isUndefined(packageFile[name]['clean'])) {
                initConfig['clean'] = {
                    options: {
                        force: true
                    },
                    files: packageFile[name]['clean']
                }
            }

            if (!_.isUndefined(packageFile[name]['copy'])) {
                initConfig['copy'] = packageFile[name]['copy'];
            }

            grunt.initConfig(_.assign(initConfig, additionalConfig || {}));
        });
    }

    function doRegisterInitializeAppTask(name, appName, configFile) {
        if (!!process.env['OO_BRANDING'] &&
                grunt.file.exists('../../' + process.env['OO_BRANDING'] + '/web-apps-pro/build/' + configFile))
        {
            var _extConfig = require('../../' + process.env['OO_BRANDING'] + '/web-apps-pro/build/' + configFile);
        }

        function _merge(target, ...sources) {
            if (!sources.length) return target;
            const source = sources.shift();

            if (_.isObject(target) && _.isObject(source)) {
                for (const key in source) {
                    let targetkey = key;

                    if ( key[0] == '!' ) {
                        targetkey = key.substring(1);

                        if ( _.isArray(target[targetkey]) || _.isObject(target[targetkey]) )
                            target[targetkey] = undefined;
                    }

                    if (_.isObject(source[key]) && target[targetkey]) {
                        // if (!target[targetkey]) Object.assign(target, { [targetkey]: {} });
                        // else
                        if (_.isArray(source[key])) target[targetkey].push(...source[key]);
                        else _merge(target[targetkey], source[key]);
                    } else {
                        Object.assign(target, { [targetkey]: source[key] });
                    }
                }
            }

            return _merge(target, ...sources);
        }

        return grunt.registerTask('init-build-' + name, 'Initialize build ' + appName, function(){
            defaultConfig = configFile;
            packageFile = require('./' + defaultConfig);

            packageFile.version = (process.env['PRODUCT_VERSION'] || packageFile.version);
            packageFile = replaceDeployPaths(packageFile);

            if (packageFile) {
                grunt.log.ok(appName + ' config loaded successfully'.green);

                addons.forEach(element => {
                    let _path = path.join(element,configFile);
                    if (grunt.file.exists(_path)) {
                        _merge(packageFile, require(_path));
                        grunt.log.ok('addon '.green + element + ' is merged successfully'.green);
                    }
                });

                if ( !!_extConfig && _extConfig.name == packageFile.name ) {
                    _merge(packageFile, _extConfig);
                }

                global.packageFile = packageFile;
            } else grunt.log.error().writeln('Could not load config file'.red);
        });
    }

    grunt.initConfig({
        mocha: {
            test: {
                options: {
                    reporter: 'Spec'
                },
                src: [
                    '../test/common/index.html'
                ]
            }
        },

        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                eqnull: true,
                browser: true,
                globals: {
                    jQuery: true
                },
                force: true
            },
            common: ['../apps/common/main/lib/**/*.js']
        }
    });

    doRegisterTask('sdk');
    doRegisterTask('api', function(defaultConfig, packageFile){
        return {
            pkg: packageFile,
            replace: {
                  writeVersion: {
                      src: ['<%= pkg.api.copy.script.dest %>' +  '/**/*.js'],
                      overwrite: true,
                      replacements: [{
                          from: /\{\{PRODUCT_VERSION\}\}/g,
                          to: packageFile.version
                      },{
                          from: /\{\{APP_CUSTOMER_NAME\}\}/g,
                          to: process.env['APP_CUSTOMER_NAME'] || 'ONLYOFFICE'
                      },{
                          from: /\/\*\*[\s\S]+\.com\s+\*\//,
                          to: copyright
                      }]
                  }
            }
        }
    });

    const svgmin_opts = {
            plugins: [{
                name: 'preset-default',
                params: {
                    overrides: {
                        cleanupIds: false,
                        removeHiddenElems: false,   // plugin ver 3.2.0 deletes <symbol> as non rendering element
                    }
                },
            }, {
                name: 'convertPathData',
                params: {
                    floatPrecision: 4
                }
            }]
    };

    doRegisterTask('apps-common', (defaultConfig, packageFile) => {
        return {
            imagemin: {
                options: {
                    optimizationLevel: 3
                },
                dynamic: {
                    files: packageFile['apps-common']['imagemin']['images-common']
                }
            },
            copy: {
                ...packageFile['apps-common'].copy,
                'images-app': {
                    files: packageFile['apps-common']['imagemin']['images-common']
                }
            },
            svgmin: {
                options: {...svgmin_opts},
                dist: {
                    files: packageFile['apps-common'].svgicons.common
                },
                toolbar: {
                    files: packageFile['apps-common'].svgicons['toolbar-icons-flat']
                }
            },
            replace: {
                dist: {
                    src: packageFile['apps-common'].copy.indexhtml.dest + '/*.html',
                    overwrite: true,
                    replacements: [{
                        from: /\@\@SRC_ROOT\@\@/g,
                        to: SRC_ROOT
                    }]
                },
                cachescripts: {
                    src: packageFile['api'].copy.script.dest + 'documents/*.html',
                    overwrite: true,
                    replacements: [{
                        from: /\@\@SRC_ROOT\@\@/g,
                        to: SRC_ROOT
                    }]
                }
            },
            inline: {
                dist: {
                    src: packageFile['apps-common'].copy.indexhtml.dest + '/*.html'
                },
                cachescripts: {
                    src: packageFile['api'].copy.script.dest + 'documents/*.html',
                },
            }
        }
    });
    doRegisterTask('socketio');
    doRegisterTask('xregexp');
    doRegisterTask('megapixel');
    doRegisterTask('jquery');
    doRegisterTask('underscore');
    doRegisterTask('zeroclipboard');
    doRegisterTask('bootstrap');
    doRegisterTask('iscroll');
    doRegisterTask('fetch');
    doRegisterTask('es6-promise');
    doRegisterTask('common-embed');
    doRegisterTask('monaco');
    doRegisterTask('requirejs', function(defaultConfig, packageFile) {
        return {
            terser: {
                options: {
                    format: {
                        preamble: '/** vim: et:ts=4:sw=4:sts=4\n' +
                            ' * @license RequireJS 2.1.2 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.\n' +
                            ' * Available via the MIT or new BSD license.\n' +
                            ' * see: http://github.com/jrburke/requirejs for details\n' +
                            ' */\n',
                    },
                },
                build: {
                    src:  packageFile['requirejs']['min']['src'],
                    dest: packageFile['requirejs']['min']['dest']
                }
            }
        }
    });

    grunt.registerTask('prebuild-svg-sprites', function() {
        require('./sprites/Gruntfile.js')(grunt, '../');
        grunt.task.run('all-svg');
    });

    grunt.registerTask('main-app-init', function() {
        grunt.initConfig({
            pkg: packageFile,

            clean: {
                options: {
                    force: true
                },
                prebuild: {
                    src: packageFile.main.clean.prebuild
                },
                postbuild: {
                    src: [...packageFile.main.clean.postbuild]
                }
            },

            less: {
                production: {
                    options: {
                        compress: true,
                        ieCompat: false,
                        modifyVars: packageFile['main']['less']['vars'],
                        plugins: [
                            new (require('less-plugin-clean-css'))()
                        ]
                    },
                    files: {
                        "<%= pkg.main.less.files.dest %>": global.appendThemeFiles(packageFile['main']['less']['files']['src'])
                    }
                }
            },

            requirejs: {
                options: {
                    optimize: "none",
                },
                compile: {
                    options: packageFile['main']['js']['requirejs']['options']
                },
                postload: {
                    options: packageFile.main.js.postload.options
                },
            },

            replace: {
                writeVersion: {
                    // When --skip-babel is used, don't include ie/ directory (it won't exist)
                    src: grunt.option('skip-babel')
                        ? ['<%= pkg.main.js.requirejs.options.out %>', '<%= pkg.main.js.postload.options.out %>']
                        : ['<%= pkg.main.js.requirejs.options.out %>', '<%= pkg.main.js.postload.options.out %>', packageFile.main.js.babel.files[0].dest],
                    overwrite: true,
                    replacements: [{
                        from: /\{\{PRODUCT_VERSION\}\}/g,
                        to: `${packageFile.version}.${packageFile.build}`
                    }, ...global.jsreplacements]
                },
                prepareHelp: {
                    src: ['<%= pkg.main.copy.help[0].dest %>/ru/**/*.htm*'],
                    overwrite: true,
                    replacements: [...helpreplacements]
                },
                indexhtml: {
                    src: ['<%= pkg.main.copy.indexhtml[0].dest %>/*.html'],
                    overwrite: true,
                    replacements: [{
                        from: /\@\@SRC_ROOT\@\@/g,
                        to: SRC_ROOT
                    }]
                }
            },

            concat: {
                options: {
                    stripBanners: true,
                    banner: copyright
                },
                dist: {
                    src: [packageFile['main']['js']['requirejs']['options']['out']],
                    dest: packageFile['main']['js']['requirejs']['options']['out']
                }
            },

            imagemin: {
                options: {
                    optimizationLevel: 3
                },
                dynamic: {
                    files: []
                        .concat(packageFile['main']['imagemin']['images-app'])
                        // .concat(packageFile['main']['imagemin']['images-common'])    skip copy images from common to editor in 7.2
                }
            },

            'json-minify': {
                build: {
                    files: packageFile['main']['jsonmin']['files']
                }
            },

            copy: {
                localization: {
                    files: packageFile['main']['copy']['localization']
                },
                help: {
                    files: packageFile['main']['copy']['help']
                },
                indexhtml: {
                    files: packageFile['main']['copy']['indexhtml']
                },
                'images-app': {
                    files: packageFile['main']['imagemin']['images-app']
                }
            },

            inline: {
                options: {
                    uglify: true
                },
                dist: {
                    src: '<%= pkg.main.copy.indexhtml[0].dest %>/*.html'
                }
            },

            svgmin: {
                options: {...svgmin_opts},
                dist: {
                    files: packageFile.main.svgicons.common
                }
            },

            // Terser tasks are broken out separately (build, postload, iecompat) rather than
            // using a single 'terser' task. This allows deploy-app-main to run only the tasks
            // it needs (terser:build, terser:postload) and skip terser:iecompat, which handles
            // IE compatibility for babel-transpiled files - unnecessary overhead for modern builds.
            terser: {
                options: {
                    format: {
                        comments: false,
                        preamble: "/* minified by terser */",
                    },
                    sourceMap: true,
                },
                build: {
                    src: [packageFile['main']['js']['requirejs']['options']['out']],
                    dest: packageFile['main']['js']['requirejs']['options']['out']
                },
                postload: {
                    src: packageFile.main.js.postload.options.out,
                    dest: packageFile.main.js.postload.options.out,
                },
                iecompat: {
                    options: {
                        sourceMap: false,
                    },
                    files: [{
                        expand: true,
                        cwd: packageFile.main.js.babel.files[0].dest,
                        src: `*.js`,
                        dest: packageFile.main.js.babel.files[0].dest
                    }]
                },
            },

            babel: {
                options: {
                    sourceMap: false,
                    presets: [['@babel/preset-env', {modules: false}]]
                },
                dist: {
                    files: packageFile.main.js.babel.files
                }
            },
        });

        // var replace = grunt.config.get('replace');
        // replace.writeVersion.replacements.push(...global.jsreplacements);
        // replace.prepareHelp.replacements.push(...helpreplacements);
        // grunt.config.set('replace', replace);
    });

    grunt.registerTask('deploy-reporter', function(){
        grunt.initConfig({
            pkg: packageFile,
            terser: {
                options: {
                    format: {
                        comments: false,
                        preamble: copyright,
                    },
                },
                reporter: {
                    src: packageFile.main.reporter.uglify.src,
                    dest: packageFile.main.reporter.uglify.dest
                },
            },
            inline: {
                options: {
                    uglify: true
                },
                dist: {
                    src: '<%= Object.keys(pkg.main.reporter.copy)[0] %>'
                }
            },
            copy: packageFile.main.reporter.copy
        });


        grunt.task.run(['terser', 'copy', 'inline']);
    });

    grunt.registerTask('mobile-app-init', function() {
        grunt.initConfig({
            pkg: packageFile,

            clean: {
                options: {
                    force: true
                },
                'deploy': packageFile['mobile']['clean']['deploy'],
                'template-backup': packageFile.mobile.copy['template-backup'][0].dest
            },


            concat: {
                options: {
                    stripBanners: true,
                    banner: copyright
                },
                dist: {
                    src: packageFile.mobile.js.dest,
                    dest: packageFile.mobile.js.dest
                }
            },

            cssmin: {
                // options: {level: { 1: { roundingPrecision: 'all=3' }}}, // to round fw7 numbers in styles. need clean-css 4.0
                target: {
                    files: {
                        "<%= pkg.mobile.css.ios.dist %>" : packageFile['mobile']['css']['ios']['src'],
                        "<%= pkg.mobile.css.material.dist %>" : packageFile['mobile']['css']['material']['src']
                    }
                }
            },

            htmlmin: {
                dist: {
                    options: {
                        removeComments: true,
                        collapseWhitespace: true
                    },
                    files: packageFile['mobile']['htmlmin']['templates']
                }
            },

            'json-minify': {
                build: {
                    files: packageFile['mobile']['jsonmin']['files']
                }
            },

            copy: {
                'template-backup': {
                    files: packageFile['mobile']['copy']['template-backup']
                },
                'template-restore': {
                    files: packageFile['mobile']['copy']['template-restore']
                },
                'localization': {
                    files: packageFile['mobile']['copy']['localization']
                },
                'index-page': {
                    files: packageFile['mobile']['copy']['index-page']
                },
                'images-app': {
                    files:[]
                        .concat(packageFile['mobile']['copy']['images-app'])
                        .concat(packageFile['mobile']['copy']['images-common'])
                },
                'webpack-dist': {
                    files: packageFile.mobile.copy['assets']
                },
            },
            
            // replace: {
                // writeVersion: {
                //     src: ['<%= pkg.mobile.js.requirejs.options.out %>'],
                //     overwrite: true,
                //     replacements: [{
                //         from: /\{\{PRODUCT_VERSION\}\}/,
                //         to: packageFile.version
                //     }]
                // },
                // fixResourceUrl: {
                //     src: ['<%= pkg.mobile.js.requirejs.options.out %>',
                //             '<%= pkg.mobile.css.ios.dist %>',
                //             '<%= pkg.mobile.css.material.dist %>'],
                //     overwrite: true,
                //     replacements: [{
                //         from: /(?:\.{2}\/){4}common\/mobile\/resources\/img/g,
                //         to: '../img'
                //     },{
                //         from: /(?:\.{2}\/){2}common\/mobile/g,
                //         to: '../mobile'
                //     }]
                // }
            // },


            exec: {
                webpack_app_build: {
                    options: {
                        cwd: '../vendor/framework7-react',
                        env: {...process.env, ...{addon: grunt.option('addon')}},
                    },
                    cmd: function() {
                        const editor = packageFile.name == 'presentationeditor' ? 'slide' :
                                        packageFile.name == 'spreadsheeteditor' ? 'cell' :
                                        packageFile.name == 'visioeditor' ? 'visio' : 'word';
                        return `npm run deploy-${editor}`;

                        // const addon_path = `${packageFile.mobile.js.reactjs && !!packageFile.mobile.js.reactjs.features ? `ADDON_ENV=${packageFile.mobile.js.reactjs.features}` : ''}`;
                        // return `npx cross-env TARGET_EDITOR=${editor} NODE_ENV=production ${addon_path} node ./build/build.js`;
                    },
                },
                webpack_install: {
                    options: {
                        cwd: '../vendor/framework7-react',
                    },
                    cmd: 'npm i --include=dev --production=false',
                },
            }
        });

        // var replace = grunt.config.get('replace');
        // replace.writeVersion.replacements.push(...jsreplacements);
        // grunt.config.set('replace', replace);
    });

    grunt.registerTask('embed-app-init', function() {
        grunt.initConfig({
            pkg: packageFile,

            clean: {
                options: {
                    force: true
                },
                postbuild: packageFile['embed']['clean']['postbuild'],
                prebuild: packageFile['embed']['clean']['prebuild']
            },

            terser: {
                options: {
                    format: {
                        comments: false,
                        preamble: copyright,
                    },
                    sourceMap: true,
                },
                build: {
                    src: packageFile['embed']['js']['src'],
                    dest: packageFile['embed']['js']['dist']
                }
            },

            less: {
                production: {
                    options: {
                        compress: true,
                        ieCompat: false
                    },
                    files: {
                        "<%= pkg.embed.less.files.dist %>": packageFile['embed']['less']['files']['src']
                    }
                }
            },

            copy: {
                localization: {
                    files: packageFile['embed']['copy']['localization']
                },
                indexhtml: {
                    files: packageFile['embed']['copy']['indexhtml']
                },
                'images-app': {
                    files: packageFile['embed']['copy']['images-app']
                }
            },

            replace: {
                indexhtml: {
                    src: ['<%= pkg.embed.copy.indexhtml[0].dest %>/*.html'],
                    overwrite: true,
                    replacements: [{
                        from: /\@\@SRC_ROOT\@\@/g,
                        to: SRC_ROOT
                    }, ...global.jsreplacements]
                }
            },

            inline: {
                options:{
                    uglify: true,
                },
                dist: {
                    src: '<%= pkg.embed.copy.indexhtml[0].dest %>/*.html'
                }
            }
        });
    });

    grunt.registerTask('test-app-init', function() {
        grunt.initConfig({
            pkg: packageFile,

            clean: {
                options: {
                    force: true
                },
                prebuild: packageFile['test']['clean']['prebuild']
            },

            terser: {
                options: {
                    format: {
                        comments: false,
                        preamble: copyright,
                    },
                },
                build: {
                    src: packageFile['test']['js']['src'],
                    dest: packageFile['test']['js']['dist']
                }
            },

            less: {
                production: {
                    options: {
                        compress: true,
                        ieCompat: false
                    },
                    files: {
                        "<%= pkg.test.less.files.dist %>": packageFile['test']['less']['files']['src']
                    }
                }
            },

            copy: {
                'index-page': {
                    files: packageFile['test']['copy']['index-page']
                }
            }
        });
    });

    grunt.registerTask('increment-build', function() {
        var pkg = grunt.file.readJSON(defaultConfig);
        pkg.build = parseInt(pkg.build) + 1;
        packageFile.homepage = (process.env['PUBLISHER_URL'] || pkg.homepage);
        packageFile.version = (process.env['PRODUCT_VERSION'] || pkg.version);
        packageFile.build = (process.env['BUILD_NUMBER'] || pkg.build);
        grunt.file.write(defaultConfig, JSON.stringify(pkg, null, 4));
    });

    //quick workaround for build desktop version
    var copyTask = grunt.option('desktop')? "copy": "copy:script";
    var imageminTask = grunt.option('skip-imagemin') ? ['copy:images-app'] : ['imagemin'];
    var spritesTask = grunt.option('skip-sprites') ? [] : ['prebuild-svg-sprites'];
    // Skip babel ES5 transpilation for modern-only builds (use --skip-babel flag)
    // When skipped, no ie/ directory is created - only ES6 output is produced
    var babelTask = grunt.option('skip-babel') ? [] : ['babel'];

    grunt.registerTask('deploy-api',                    ['api-init', 'clean', copyTask, 'replace:writeVersion']);
    grunt.registerTask('deploy-apps-common',            ['apps-common-init', 'clean', 'copy', 'replace', 'inline', ...imageminTask, 'svgmin']);
    grunt.registerTask('deploy-sdk',                    ['sdk-init', 'clean', copyTask]);

    grunt.registerTask('deploy-socketio',               ['socketio-init', 'clean', 'copy']);
    grunt.registerTask('deploy-xregexp',                ['xregexp-init', 'clean', 'copy']);
    grunt.registerTask('deploy-megapixel',              ['megapixel-init', 'clean', 'copy']);
    grunt.registerTask('deploy-jquery',                 ['jquery-init', 'clean', 'copy']);
    grunt.registerTask('deploy-underscore',             ['underscore-init', 'clean', 'copy']);
    grunt.registerTask('deploy-iscroll',                ['iscroll-init', 'clean', 'copy']);
    grunt.registerTask('deploy-fetch',                  ['fetch-init', 'clean', 'copy']);
    grunt.registerTask('deploy-bootstrap',              ['bootstrap-init', 'clean', 'copy']);
    grunt.registerTask('deploy-requirejs',              ['requirejs-init', 'clean', 'terser']);
    grunt.registerTask('deploy-es6-promise',            ['es6-promise-init', 'clean', 'copy']);
    grunt.registerTask('deploy-monaco',                 ['monaco-init', 'clean', 'copy']);
    grunt.registerTask('deploy-common-embed',           ['common-embed-init', 'clean', 'copy']);

    grunt.registerTask('deploy-app-main',               [...spritesTask, 'main-app-init', 'clean:prebuild', ...imageminTask, 'less',
                                                            'requirejs', ...babelTask, 'terser:build', 'terser:postload', 'concat', 'copy', 'svgmin', 'replace:indexhtml', 'inline', 'json-minify',
                                                            'replace:writeVersion', 'replace:prepareHelp', 'clean:postbuild']);

    grunt.registerTask('deploy-app-mobile',             ['mobile-app-init', 'clean:deploy', /*'cssmin',*/ /*'copy:template-backup',*/
                                                            'htmlmin', /*'requirejs',*/ 'exec:webpack_install', 'exec:webpack_app_build', /*'copy:template-restore',*/
                                                            /*'clean:template-backup',*/ 'copy:localization', 'copy:index-page',
                                                            'copy:images-app', 'copy:webpack-dist', 'concat', 'json-minify'/*,*/
                                                            /*'replace:writeVersion', 'replace:fixResourceUrl'*/]);

    grunt.registerTask('deploy-app-embed',              ['embed-app-init', 'clean:prebuild', 'terser', 'less', 'copy', 'replace:indexhtml', 'inline', 'clean:postbuild']);
    grunt.registerTask('deploy-app-test',               ['test-app-init', 'clean:prebuild', 'terser', 'less', 'copy']);

    doRegisterInitializeAppTask('common',               'Common',               'common.json');
    doRegisterInitializeAppTask('documenteditor',       'DocumentEditor',       'documenteditor.json');
    doRegisterInitializeAppTask('spreadsheeteditor',    'SpreadsheetEditor',    'spreadsheeteditor.json');
    doRegisterInitializeAppTask('presentationeditor',   'PresentationEditor',   'presentationeditor.json');
    doRegisterInitializeAppTask('pdfeditor',            'PDFEditor',            'pdfeditor.json');
    doRegisterInitializeAppTask('visioeditor',          'VisioEditor',          'visioeditor.json');

    doRegisterInitializeAppTask('testdocumenteditor',    'TestDocumentEditor',           'testdocumenteditor.json');
    doRegisterInitializeAppTask('testpresentationeditor', 'TestPresentationEditor',      'testpresentationeditor.json');
    doRegisterInitializeAppTask('testspreadsheeteditor',  'TestSpreadsheetEditor',       'testspreadsheeteditor.json');

    grunt.registerTask('deploy-app', 'Deploy application.', function(){
        if (packageFile) {
            if (packageFile['tasks']['deploy'])
                grunt.task.run(packageFile['tasks']['deploy']);
            else
                grunt.log.error().writeln('Not found "deploy" task in configure'.red);
        } else {
            grunt.log.error().writeln('Is not load configure file.'.red);
        }
    });

    grunt.registerTask('deploy-common-component',             ['init-build-common', 'deploy-app']);
    grunt.registerTask('deploy-documenteditor-component',     ['init-build-documenteditor', 'deploy-app']);
    grunt.registerTask('deploy-spreadsheeteditor-component',  ['init-build-spreadsheeteditor', 'deploy-app']);
    grunt.registerTask('deploy-presentationeditor-component', ['init-build-presentationeditor', 'deploy-app']);
    grunt.registerTask('deploy-pdfeditor-component',          ['init-build-pdfeditor', 'deploy-app']);
    grunt.registerTask('deploy-visioeditor-component',        ['init-build-visioeditor', 'deploy-app']);
    // This task is called from the Makefile, don't delete it.
    grunt.registerTask('deploy-documents-component',          ['deploy-common-component']);   

    grunt.registerTask('deploy-documenteditor',     ['deploy-common-component', 'deploy-documenteditor-component']);
    grunt.registerTask('deploy-spreadsheeteditor',  ['deploy-common-component', 'deploy-spreadsheeteditor-component']);
    grunt.registerTask('deploy-presentationeditor', ['deploy-common-component', 'deploy-presentationeditor-component']);
    grunt.registerTask('deploy-pdfeditor',          ['deploy-common-component', 'deploy-pdfeditor-component']);
    grunt.registerTask('deploy-visioeditor',        ['deploy-common-component', 'deploy-visioeditor-component']);

    grunt.registerTask('deploy-testdocumenteditor', ['init-build-testdocumenteditor', 'deploy-app']);
    grunt.registerTask('deploy-testpresentationeditor', ['init-build-testpresentationeditor', 'deploy-app']);
    grunt.registerTask('deploy-testspreadsheeteditor', ['init-build-testspreadsheeteditor', 'deploy-app']);

    // Build LESS only for all editors
    // Note: common styles are imported into each editor's app.less, no separate common build needed
    grunt.registerTask('less-all', [
        'deploy-theme',
        'init-build-documenteditor', 'main-app-init', 'less',
        'init-build-spreadsheeteditor', 'main-app-init', 'less',
        'init-build-presentationeditor', 'main-app-init', 'less',
        'init-build-pdfeditor', 'main-app-init', 'less',
        'init-build-visioeditor', 'main-app-init', 'less'
    ]);

    grunt.registerTask('default', ['deploy-theme',
                                    ...spritesTask,
                                   'deploy-common-component',
                                   'deploy-documenteditor-component',
                                   'deploy-spreadsheeteditor-component',
                                   'deploy-presentationeditor-component',
                                   'deploy-pdfeditor-component',
                                   'deploy-visioeditor-component',
                                   'deploy-theme-images']);
};

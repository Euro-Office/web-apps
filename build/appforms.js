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
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

module.exports = (grunt, replaceDeployPaths) => {
    grunt.registerTask('forms-app-init', function() {
        const packageFile = global.packageFile;
        if ( !global.packageFile )
            grunt.log.ok('no package file'.red);
        else {
            config = require('./appforms.json');
            if ( config ) {
                //packageFile.tasks.deploy.push(...config.tasks.deploy);
                config = replaceDeployPaths(config)
                packageFile.forms = config.forms;
            }
        }

        let path = require('path');
        const SRC_ROOT = path.resolve(__dirname, "..")

        grunt.initConfig({
            pkg: packageFile,

            clean: {
                options: {
                    force: true
                },
                postbuild: packageFile.forms.clean.postbuild,
                prebuild: packageFile.forms.clean.prebuild
            },

            requirejs: {
                options: {
                    optimize: "none",
                },
                compile: {
                    options: packageFile.forms.js.requirejs.options
                },
                postload: {
                    options: packageFile.forms.js.postload.options
                },
            },

            less: {
                production: {
                    options: {
                        compress: true,
                        ieCompat: false,
                        modifyVars: Object.assign({}, packageFile.forms.less.vars, global.themeFormVars || {}),
                        plugins: [
                            new (require('less-plugin-clean-css'))()
                        ]
                    },
                    files: {
                        "<%= pkg.forms.less.files.dest %>": packageFile.forms.less.files.src
                    }
                }
            },

            concat: {
                options: {
                    stripBanners: true,
                    banner: global.copyright
                },
                dist: {
                    src: [packageFile.forms.js.requirejs.options.out],
                    dest: packageFile.forms.js.requirejs.options.out
                }
            },

            copy: {
                localization: {
                    files: packageFile.forms.copy.localization
                },
                indexhtml: {
                    files: packageFile.forms.copy.indexhtml
                }
            },

            replace: {
                varsEnviroment: {
                    src: ['<%= pkg.forms.js.requirejs.options.out %>'],
                    overwrite: true,
                    replacements: [{
                        from: /\{\{PRODUCT_VERSION\}\}/g,
                        to: packageFile.version
                    }, ...global.jsreplacements]
                },
                indexhtml: {
                    src: packageFile.forms.copy.indexhtml[0].dest + '/*.html',
                    overwrite: true,
                    replacements: [{
                        from: /\@\@SRC_ROOT\@\@/g,
                        to: SRC_ROOT
                    }]
                }
            },

            inline: {
                dist: {
                    src: packageFile.forms.inline.src
                }
            },

            terser: {
                options: {
                    format: {
                        comments: false,
                        preamble: "/* minified by terser */",
                    },
                },
                build: {
                    src: [packageFile.forms.js.requirejs.options.out],
                    dest: packageFile.forms.js.requirejs.options.out
                },
                postload: {
                    src: packageFile.forms.js.postload.options.out,
                    dest: packageFile.forms.js.postload.options.out,
                },
                iecompat: {
                    options: {
                        sourceMap: false,
                    },
                    files: [{
                        expand: true,
                        cwd: packageFile.forms.js.babel.files[0].dest,
                        src: `*.js`,
                        dest: packageFile.forms.js.babel.files[0].dest
                    }]
                },
            },

            babel: {
                options: {
                    sourceMap: false,
                    presets: [['@babel/preset-env', {modules: false}]]
                },
                dist: {
                    files: packageFile.forms.js.babel.files
                }
            },
        });
    });

    var babelTask = grunt.option('skip-babel') ? [] : ['babel', 'terser:iecompat'];

    grunt.registerTask('deploy-app-forms', ['forms-app-init', 'clean:prebuild', /*'imagemin',*/ 'less',
                                                            'requirejs', ...babelTask, 'terser:build', 'terser:postload', 'concat', 'copy','replace:indexhtml', 'inline', /*'json-minify',*/
                                                            'replace:varsEnviroment', /*'replace:prepareHelp',*/ 'clean:postbuild']);
}

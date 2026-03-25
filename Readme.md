[![License](https://img.shields.io/badge/License-GNU%20AGPL%20V3-green.svg?style=flat)](https://www.gnu.org/licenses/agpl-3.0.en.html)

## web-apps

The frontend for [Euro-Office Document Server][2] and [Euro-Office Desktop Editors](https://github.com/Euro-Office/DesktopEditors). Builds the program interface and allows the user create, edit, save and export text documents, spreadsheets, and presentations.

## Previous versions

Until 2019-10-23 the repository was called web-apps-pro.

## Project information

Official website: [https://github.com/Euro-Office](https://github.com/Euro-Office "https://github.com/Euro-Office")

Code repository: [https://github.com/Euro-Office/web-apps](https://github.com/Euro-Office/web-apps "https://github.com/Euro-Office/web-apps")

## User feedback and support

If you have any problems with or questions about [Euro-Office Document Server][2], please visit our official forum: [github.com/euro-office][1] or you can ask and answer Euro-Office development questions on [Stack Overflow][3].

  [1]: https://github.com/Euro-Office
  [2]: https://github.com/Euro-Office/DocumentServer

## Styling

Styling is accomplished via LESS, there is the content set by Euro-Office. Before you do anything, please read the section under this about modifications.

There are several hundred LESS files, organised in several folders:

#### Common (shared)

```shell
apps/common/embed/resources/less/
apps/common/forms/resources/less/
apps/common/main/resources/less/
apps/common/main/resources/mods/less/
apps/common/mobile/resources/less/
```

Common is the most important and many of the others just import common.

They use variables:

`apps/common/main/resources/less/variables.less` <- majority seem to be shared from there.

The variables seem to be a bit haphazard in approach. There is some structure, but not uniformly adhered to. The variables are used in other files, so the lack of structure is not so much an issue.

Importing is via relative paths.

#### Document Editor

```shell
apps/documenteditor/embed/resources/less/
apps/documenteditor/forms/resources/less/
apps/documenteditor/main/resources/less/
apps/documenteditor/mobile/src/less/
```

#### Spreadsheet Editor

```shell
apps/spreadsheeteditor/main/resources/less/
apps/spreadsheeteditor/mobile/src/less/
```

#### Presentation Editor

```shell
apps/presentationeditor/embed/resources/less/
apps/presentationeditor/main/resources/less/
apps/presentationeditor/mobile/src/less/
```

#### PDF Editor

```shell
apps/pdfeditor/main/resources/less/
```


#### Visio Editor

```shell
apps/visioeditor/main/resources/less/
```


Each directory has a range of LESS files broken down by area, eg slider, search, buttons etc - too many to list here, but should be helpful in finding the correct place to make style changes

## Building

### Full Build

Run `docker compose` from the `euro-office/fork/build` directory:

```bash
# From euro-office/fork/build, enter the container:
docker compose exec eo bash

# Then inside the container:
export BUILD_NUMBER=0 THEME=euro-office && cd /var/www/onlyoffice/web-apps-develop/build && grunt --skip-imagemin --skip-babel
```

### Build Flags

| Flag | Description |
|------|-------------|
| `--skip-imagemin` | Skip image optimization (faster builds) |
| `--skip-babel` | Skip ES5 transpilation for IE compatibility (modern browsers only, no `ie/` directory created) |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `THEME` | Theme name to use (e.g., `euro-office`, `default`) |
| `BUILD_NUMBER` | Build number for versioning |

## Style modifications
## Building

To build this project execute the following commands

```shell
cd build
npm install
grunt [optional grunt command]
```

### Building to specified directory

A build directory can be specified by using an env variable

```shell
BUILD_ROOT=/path/to/build grunt [optional grunt command]
```



Two new build-time variables were introduced to the code to remove hard-coded paths and make the build configuration more flexible:

```shell
BUILD_ROOT
SRC_ROOT
```

#### `BUILD_ROOT`

Several JSON files define build instructions and previously contained hard-coded relative paths, for example:

```shell
build/common.json
build/presentationeditor.json
build/documenteditor.json
...
```


These paths have been replaced with the `$BUILD_ROOT` variable. During the build process, `$BUILD_ROOT` is resolved to the actual build root directory, allowing the same configuration to work regardless of where the project is built or deployed.

 #### `SRC_ROOT`

Some HTML files include inline script replacements during the build (for example, `apps/api/documents/cache-scripts.html`). The referenced JavaScript paths were previously in `SRC_ROOT` relative to the file location in `BUILD_ROOT`.

These paths have been updated to use the `@@SRC_ROOT@@` placeholder instead. At build time, this placeholder is replaced with the absolute source directory, ensuring that script references resolve correctly in all environments.



### Building using a theme

We want to make upstream updates as painless as possible. From the perspective of making modifications we have added theming capability to the office package.

#### Theme folder structure

Each theme is a self-contained folder under `theme/` at the web-apps root:

```
theme/euro-office/
  meta/
    config.json           # Brand values (company name, URLs, logo filenames)
  assets/
    img/header/           # Logo SVGs (copied to desktop + mobile resource dirs at build time)
    less/                 # LESS variable overrides and CSS rule overrides
```

#### config.json

Contains brand values that replace `{{PLACEHOLDER}}` tokens in JS and webpack `DefinePlugin` constants. Priority: environment variable > config.json > hardcoded default.

> **Note:** Mobile and forms logo fields (`mobile_logo_*`, `forms_logo_*`) are in this file because the mobile editors use webpack, not Grunt. `build/theme.config.mjs` reads `config.json` directly to provide LESS `globalVars` (logo paths) and `DefinePlugin` constants (brand values) for the mobile webpack builds. This makes `config.json` the shared contract between the Grunt build (desktop) and the webpack build (mobile).

```json
{
  "company_name": "Euro Office",
  "publisher_name": "Euro Office",
  "publisher_url": "https://github.com/Euro-Office",
  "publisher_address": "",
  "publisher_phone": "",
  "sales_email": "",
  "support_email": "",
  "support_url": "https://github.com/Euro-Office",
  "help_url": "https://github.com/Euro-Office",
  "app_title": "Euro Office",
  "mobile_logo_light": "eo_logo_light.svg",
  "mobile_logo_dark": "eo_logo_dark.svg",
  "forms_logo_light": "eo_logo_dark.svg",
  "forms_logo_dark": "eo_logo_light.svg"
}
```

#### Build

```shell
THEME=euro-office grunt
```

The `deploy-theme` task runs first and:
1. Reads `config.json` into `global.themeMeta` for brand replacements
2. Copies images to `apps/common/main/resources/img/` (desktop) and `apps/common/mobile/resources/img/` (mobile)
3. Copies LESS to `apps/common/main/resources/less/themes/{THEME}/`

LESS compilation and JS replacements then proceed as normal with theme files in place.

#### Creating a new theme

1. Copy `theme/euro-office/` to `theme/yourtheme/`
2. Edit `meta/config.json` with your brand values
3. Replace logo SVGs in `assets/img/header/`
4. Adjust LESS variables in `assets/less/theme.less`
5. Build with `THEME=yourtheme`

#### LESS guidelines

Use variables in `theme.less` as much as possible — this avoids duplicate CSS in the final output. Only use `overrides/` for rules that cannot be changed via variables. The overrides directory should mirror the structure of the main app for clarity.

## License

web-apps is released under an GNU AGPL v3.0 license. See the LICENSE file for more information.

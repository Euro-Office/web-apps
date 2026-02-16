[![License](https://img.shields.io/badge/License-GNU%20AGPL%20V3-green.svg?style=flat)](https://www.gnu.org/licenses/agpl-3.0.en.html)

## web-apps

The frontend for [ONLYOFFICE Document Server][2] and [ONLYOFFICE Desktop Editors](https://github.com/ONLYOFFICE/DesktopEditors). Builds the program interface and allows the user create, edit, save and export text documents, spreadsheets, and presentations.

## Previous versions

Until 2019-10-23 the repository was called web-apps-pro.

## Project information

Official website: [https://www.onlyoffice.com/](https://www.onlyoffice.com "https://www.onlyoffice.com")

Code repository: [https://github.com/ONLYOFFICE/web-apps](https://github.com/ONLYOFFICE/web-apps "https://github.com/ONLYOFFICE/web-apps")

## User feedback and support

If you have any problems with or questions about [ONLYOFFICE Document Server][2], please visit our official forum: [forum.onlyoffice.com][1] or you can ask and answer ONLYOFFICE development questions on [Stack Overflow][3].

  [1]: https://forum.onlyoffice.com
  [2]: https://github.com/ONLYOFFICE/DocumentServer
  [3]: http://stackoverflow.com/questions/tagged/onlyoffice

## Styling

Styling is accomplished via LESS, there is the content set by ONLYOFFICE. Before you do anything, please read the section under this about modifications.

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
export BUILD_NUMBER=0 THEME=nextcloud && cd /var/www/onlyoffice/web-apps-develop/build && grunt --skip-imagemin --skip-babel
```

### Build Flags

| Flag | Description |
|------|-------------|
| `--skip-imagemin` | Skip image optimization (faster builds) |
| `--skip-babel` | Skip ES5 transpilation for IE compatibility (modern browsers only, no `ie/` directory created) |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `THEME` | Theme name to use (e.g., `nextcloud`, `default`) |
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

You need to use a env variable.

#### Set ENV var

```shell
THEME=[your theme] grunt [optional grunt command]
```
eg
```shell
THEME=nextcloud grunt less-all
```
> If you do this, you need to restart the docker eo, as the css files are cache busted
> `docker compose exec eo bash`

> If you add images, these need to be copied, to do that, you need to run `grunt` with no params (or on AMR64, with --skip-imagemin)

#### Setting up a theme

Look at `apps/common/main/resources/less/themes/nextcloud` as an example.

The idea is to use variables set in the `theme` file as much as possible, and use the overrides feature if it is not possible to just use a variable. By using variables, we don't introduce extra CSS in the final output.

The `overrides` directory should match the structure of the existing app. It is only when it is not possible to accomplish the styling using variables.

## Testing

Mobile editor tests use [Vitest](https://vitest.dev/) and live co-located with source files in `__tests__/` directories.

### Why a separate `package.json`?

This project has three `package.json` files, each owning a distinct concern:

| File | Purpose |
|------|---------|
| `build/package.json` | Grunt build tools (desktop editor) |
| `vendor/framework7-react/package.json` | Webpack build + runtime deps (mobile editor) |
| `package.json` (root) | Test infrastructure (Vitest, Testing Library) |

The root `package.json` exists because:

- `vendor/` should remain immutable — it tracks upstream dependencies and shouldn't be coupled to our test tooling
- `build/` owns the Grunt pipeline — mixing test deps there conflates two unrelated concerns
- Runtime deps (react, mobx) are pinned to exact versions matching `vendor/framework7-react/node_modules/` to ensure tests run against the same code the app ships

### Running tests

Tests must run inside the Docker container (the host is ARM64, dependencies are x64).

First, start the dev environment from `fork/develop/`:

```bash
cd fork/develop
make local       # starts containers and opens a shell in eo
```

Then inside the container:

```bash
cd /develop/web-apps
npm install       # first time only
npm test          # watch mode
npm run test:run  # single run
```

Or without an interactive shell:

```bash
# From fork/develop/
docker compose exec eo bash -c 'cd /develop/web-apps && npm run test:run'
```

## License

web-apps is released under an GNU AGPL v3.0 license. See the LICENSE file for more information.

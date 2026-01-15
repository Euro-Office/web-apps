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

Common (shared)
apps/common/embed/resources/less/
apps/common/forms/resources/less/
apps/common/main/resources/less/
apps/common/main/resources/mods/less/
apps/common/mobile/resources/less/

Common is the most important and many of the others just import common.

They use variables:

apps/common/main/resources/less/variables.less <- majority seem to be shared from there.

The variables seem to be a bit haphazard in approach. There is some structure, but not uniformly adhered to. The variables are used in other files, so the lack of structure is not so much an issue.

Importing is via relative paths.

Document Editor
apps/documenteditor/embed/resources/less/
apps/documenteditor/forms/resources/less/
apps/documenteditor/main/resources/less/
apps/documenteditor/mobile/src/less/

Spreadsheet Editor
apps/spreadsheeteditor/main/resources/less/
apps/spreadsheeteditor/mobile/src/less/

Presentation Editor
apps/presentationeditor/embed/resources/less/
apps/presentationeditor/main/resources/less/
apps/presentationeditor/mobile/src/less/

PDF Editor
apps/pdfeditor/main/resources/less/

Visio Editor
apps/visioeditor/main/resources/less/

Each directory has a range of LESS files broken down by area, eg slider, search, buttons etc - too many to list here, but should be helpful in finding the correct place to make style changes

## Style modifications

We want to make upstream updates as painless as possible. From the perspective of making modifications we have added theming capability to the office package.

### Building using a theme

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

## License

web-apps is released under an GNU AGPL v3.0 license. See the LICENSE file for more information.

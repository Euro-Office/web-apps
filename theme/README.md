# Themes & branding

Each subdirectory here is a theme (e.g. `euro-office`, the default). A theme supplies brand
assets and a `meta/config.json`; branding is applied at build time, so there is no
hard-coded brand text or logo in the editor templates.

Select a theme with the `THEME` environment variable (defaults to `euro-office`).

## How branding is applied

`build/Gruntfile.js` loads the active theme's `meta/config.json` into `global.themeMeta`
(`deploy-theme` task) and substitutes `{{TOKEN}}` placeholders found in the source
templates. Image assets under `<theme>/assets/img/` are copied over the stock images last
(`deploy-theme-images`), so any logo referenced by its deployed path automatically shows
the active theme's brand.

### Tokens substituted in editor HTML (`apps/*/main/*.html.deploy`)

| Token | Resolves to | Config key (fallback) |
|-------|-------------|-----------------------|
| `{{APP_TITLE_TEXT}}` | `<title>` brand prefix, e.g. "Euro Office Document Editor" | `app_title` |
| `{{LOADER_LOGO}}` | Splash logo on a light background | `loader_logo` (`dark-logo_s.svg`) |
| `{{LOADER_LOGO_DARK}}` | Splash logo on a dark background | `loader_logo_dark` (`header-logo_s.svg`) |

Logo paths resolve to `apps/common/main/resources/img/header/<file>`, which
`deploy-theme-images` overwrites with the active theme's versions. An environment variable
of the same name (e.g. `APP_TITLE_TEXT`) overrides the config value when set. **Note:**
`loader_logo` and `loader_logo_dark` are config-file-only keys — they have no env-var
override path.

The splash loader shows `{{LOADER_LOGO}}` by default and `{{LOADER_LOGO_DARK}}` when the
page is in dark mode (`.theme-type-dark`). This replaces the upstream animated "romb"
diamonds, which were the ONLYOFFICE logo.

## Branding customization is unlocked (issue #89)

Upstream gates integrator branding — `customization.loaderLogo`, `loaderName`, header
`logo`, custom fonts — behind the commercial license (`asc_getCanBranding()`), so passing
those options on the community build raised a "paid feature" dialog. As an AGPL fork we
drop that license factor in each editor's `Main.js` and mobile `appOptions.js` (`appOptions.canBrandingExt`), so
integrators can use the documented OnlyOffice branding API without the dialog.

## Adding a theme / replacing assets

Create `theme/<name>/` with a `meta/config.json` and `assets/` (`img/`, `less/`). Drop
brand SVGs into `assets/img/header/`, keeping the stock filenames to avoid build changes.
To point the splash loader at differently named files, add `loader_logo` /
`loader_logo_dark` keys to `meta/config.json`.

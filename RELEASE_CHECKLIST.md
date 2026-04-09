# Post-Migration Release Checklist

## Go / No-Go Release Gate

- Go only if all pre-release checks pass.
- Go only if `artifacts/wp-custom-dashboard.zip` and `artifacts/wp-custom-dashboard.zip.sha256` were freshly generated from the intended release state.
- Go only if the install and smoke-test steps pass in a WordPress test environment.
- No-Go if wp-admin shell boot fails, asset resolution returns 404s, REST contract behavior changes, or rollback readiness is unclear.

## 1. Pre-release checks

- Confirm the working tree is in the intended release state.
- Run frontend tests: `./node_modules/.bin/vitest run`
- Run PHP tests: `COMPOSER_ALLOW_SUPERUSER=1 composer test`
- Run production build: `npm run build`
- Build the deployable artifact: `npm run package:plugin`
- Verify the artifact: `npm run verify:artifact`
- Confirm the packaged zip exists: [artifacts/wp-custom-dashboard.zip](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/artifacts/wp-custom-dashboard.zip)
- Confirm the checksum exists: [artifacts/wp-custom-dashboard.zip.sha256](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/artifacts/wp-custom-dashboard.zip.sha256)
- Confirm the staged artifact exists: [artifacts/wp-custom-dashboard](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/artifacts/wp-custom-dashboard)
- Sanity-check the plugin entrypoint is still [wp-custom-dashboard.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/wp-custom-dashboard.php)
- Sanity-check the packaged runtime still contains `wp-custom-dashboard.php`, `app/`, `includes/`, and `dist/`

## 2. Install / activation steps

- Take a backup or snapshot of the WordPress test environment first.
- Keep the previously known-good plugin zip available for rollback.
- In wp-admin, go to `Plugins > Add New > Upload Plugin`.
- Upload [wp-custom-dashboard.zip](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/artifacts/wp-custom-dashboard.zip).
- If WordPress prompts to replace the existing plugin, allow replacement only in the test environment.
- Activate the plugin.
- Open `wp-admin/` in a fresh tab.
- Hard-refresh once after activation so new hashed assets are requested.
- If available, open browser devtools and confirm there are no fatal JS errors during shell boot.

## 3. Dashboard smoke tests

- Open `wp-admin/` and confirm the React shell appears instead of broken native chrome.
- Confirm the shell mounts once and the admin content loads inside the iframe.
- Confirm the dashboard renders without a blank page, spinner loop, or fallback warning.
- Confirm key dashboard widgets/sections appear and populate.
- Refresh the page and confirm the shell still boots cleanly.
- Open one normal admin page from the sidebar and return to the dashboard.
- Confirm browser Back/Forward works across shell navigation.
- Confirm one breakout screen such as `post.php` opens correctly as a top-level document, not a broken iframe state.

## 4. Branding smoke tests

- Go to `Settings > WP React UI Branding`.
- Confirm the settings page loads and saves without PHP notices.
- Upload or select a light logo and save.
- Upload or select a dark logo and save.
- Reload wp-admin and confirm the shell branding updates.
- Toggle light/dark theme and confirm the correct logo is used.
- Remove one logo and save; confirm fallback behavior still works.
- Update `Open Links In New Tab` patterns and save.
- Open a matching admin link and confirm it behaves as expected.

## 5. Navigation / session / theme / preferences smoke tests

- Click through several sidebar items and confirm iframe navigation is stable.
- Confirm the active menu item tracks the current page.
- Collapse and expand the sidebar; reload and confirm the preference persists.
- On a mobile-width viewport, confirm the drawer opens and closes correctly.
- Toggle theme light/dark; reload and confirm persistence.
- If multiple user accounts are available, confirm theme preference is not obviously broken across users.
- Open the user dropdown and confirm it renders and actions are clickable.
- Trigger logout from the dropdown and confirm WordPress logs out normally.
- If feasible, expire the session in another tab or log out elsewhere, then confirm the current tab fails safely rather than hanging or white-screening.

## 6. Artifact verification steps

- Verify checksum locally:
  - `sha256sum artifacts/wp-custom-dashboard.zip`
  - Compare with [artifacts/wp-custom-dashboard.zip.sha256](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/artifacts/wp-custom-dashboard.zip.sha256)
- Inspect zip contents:
  - `unzip -l artifacts/wp-custom-dashboard.zip`
- Confirm the zip contains:
  - `wp-custom-dashboard/wp-custom-dashboard.php`
  - `wp-custom-dashboard/app/`
  - `wp-custom-dashboard/includes/`
  - `wp-custom-dashboard/dist/`
- Confirm the zip does not contain obvious dev-only content such as:
  - `src/`
  - `tests/`
  - `node_modules/`
  - `.git/`
- Optionally unpack to a temp folder and confirm [artifact-manifest.json](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/artifacts/wp-custom-dashboard/artifact-manifest.json) is present in the staged artifact.
- After install, load wp-admin and confirm hashed `dist/assets/*` files return `200` in the network panel.
- Confirm no asset 404s for `main`, `embedBridge`, or CSS files.

## 7. Rollback steps if the installed artifact fails

- If wp-admin is still usable:
  - Deactivate `WP React UI`.
  - Delete the failed installed version in the test environment.
  - Reinstall the previous known-good zip.
  - Activate it.
  - Hard-refresh wp-admin.
- If wp-admin is not usable:
  - Remove or rename the plugin directory on disk.
  - Restore the previous known-good plugin directory or zip.
  - Re-activate via wp-admin or WP-CLI.
- WP-CLI rollback option:
  - `wp plugin deactivate wp-custom-dashboard`
  - replace the plugin directory with the previous known-good version
  - `wp plugin activate wp-custom-dashboard`
- After rollback:
  - Clear browser cache.
  - Clear any opcode/server cache if applicable.
  - Confirm wp-admin loads normally.
  - Preserve the failed zip and logs for diagnosis instead of rebuilding over it immediately.

## 8. Retained transitional wrappers / shims not to remove casually

- `includes/class-wp-react-ui-*.php`
  - These are stable WordPress-facing compatibility loaders.
- [src/App.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/App.tsx)
  - Stable frontend entrypoint shim.
- [src/bootstrapShell.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/bootstrapShell.tsx)
  - Stable frontend bootstrap shim.
- `src/components/**`
  - Compatibility re-export surface for old import paths.
- `src/services/*.ts`, `src/context/*.tsx`, `src/store/*.ts`
  - Some are still compatibility surfaces and should only be removed after a full import-graph audit.
- [src/utils/spaNavigate.ts](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/utils/spaNavigate.ts)
  - Explicitly retained as a compatibility shim.

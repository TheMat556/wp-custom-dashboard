# Architecture Decisions & Tricky Implementation Notes

This document captures design rationale, tradeoffs, and non-obvious implementation details not covered in `AGENTS.md`.

---

## Why iframe instead of fetch-and-swap SPA?

The previous architecture tried to parse WordPress admin pages client-side and swap content. This broke constantly because WordPress uses raw `$menu`, `$submenu`, inline JS, `<script>` tags mid-body, and plugin-specific hooks that no SPA could anticipate.

**Decision**: iframe model with `wp_shell_embed=1` query param. Each admin page gets a clean execution context. The shell is just a chrome wrapper. This means:
- No need to parse/rewrite WordPress admin HTML
- Every plugin's admin screen works unmodified
- Browser back/forward must be handled manually via `postMessage` + history API
- A breakout page list (`breakout_pagenow`) is needed for full-page screens like `post.php`

## Boot flash prevention

The critical bootstrap script is **inlined in PHP** (`admin_head`) rather than loaded as an external asset. This avoids a flash of unstyled content (FOUC) where the native WordPress chrome is briefly visible before the React shell mounts.

The inline script:
1. Sets `data-theme` on body before paint
2. Restores sidebar width from localStorage
3. Creates `#react-shell-root` if not present
4. Sets `wpwrap` class for shell layout CSS

All before the React bundle loads.

## Why two PHP namespaces?

This plugin has a dual-namespace PHP architecture:

- **`WpReactUi\` (PSR-4, `app/`)**: Modern namespaced classes. Composition root is `PluginBootstrap`.
- **`WP_React_UI_*` prefix (`includes/`)**: Legacy class-prefixed loaders kept for stability.

The legacy includes are loaded explicitly in `wp-custom-dashboard.php` before `Plugin::boot()`. This is not ideal but necessary — several WordPress hooks reference the old class names.

If adding new PHP code, use `WpReactUi\` in `app/`. Only touch `includes/` for urgent fixes to stable WordPress-facing loaders.

## Contract generation pipeline (why it exists)

PHP and TypeScript must agree on boot payload shapes, REST route names, and permission keys. Without contracts, a change in one side silently breaks the other.

The pipeline works as follows:
- **`contracts/source/manifests/`**: JSON files defining routes, permissions, and feature flags (author-edited)
- **`contracts/source/schemas/`**: JSON Schema files defining boot payloads and DTOs (author-edited)
- **`scripts/generate-contracts.mjs`**: Reads source, produces PHP + TS type files
- **Generated outputs**: `app/Contracts/Generated/` and `src/generated/contracts/` — never hand-edit these

The `src/types/wp.ts` file exists as a **compatibility layer** that existed before the contract pipeline. New types should come from the contract pipeline, not be added to `wp.ts`.

## CMS-specific Ant Design theming

This is not a standalone React app. It runs inside WordPress's DOM. This creates several constraints:

1. **z-index conflicts**: WordPress's admin bar, notices, and modals use various z-index values. Ant Design components get `zIndexPopupBase: 100100` to sit above WordPress chrome.
2. **Popup containers**: Ant Design popups default to `document.body` (not a React portal wrapper) via `getPopupContainer={() => document.body}`.
3. **CSS reset isolation**: `src/outside.css` is loaded as a separate Vite entry for global resets. Component-scoped styles come through Ant Design's CSS-in-JS.
4. **Dark theme navy palette**: The standard Ant Design dark algorithm uses a generic dark background. The shell overrides `colorBgContainer`, `colorBgElevated`, `colorBgLayout` and other tokens to match the custom navy palette (`#131c2b`, `#192437`, `#0f1723`).

## Vite entry points — why four inputs?

Vite input entries (`main`, `embedBridge`, `outside`, `sessionStore`) serve four independent concerns:

1. **`main.tsx`** — Shell mount + store bootstrap. Loads on every eligible admin page.
2. **`embedBridge.ts`** — Injected into the iframe content. Communicates navigation events, title changes, and session expiry to the parent shell via `postMessage`. Only loads when `wp_shell_embed=1`.
3. **`outside.css`** — Global CSS reset and shell layout grid. Loaded alongside `main.tsx`.
4. **`sessionStore.ts`** — Standalone bundle imported by embed mode for session heartbeat. Exists so the iframe can report session state without loading the full shell JS.

## Debug logging stripped in production

Vite config drops `console.*` and `debugger` from production bundles via esbuild's `drop` option. This is intentional — it prevents internal state, store shapes, and React component structure from leaking to anyone with browser devtools open.

During development, console logs work normally. Do not add permanent `console.log` calls expecting them to survive production builds.

## The `sessionStore` Vite input quirk

`sessionStore` is both a shared module (imported by `bootstrapShell.tsx`) and a standalone Vite input. This is unusual. When Vite builds it as a separate entry, it creates a duplicate module instance in the iframe. The embed bridge (`embedBridge.ts`) imports the same store module to report session status to the parent shell.

This works because each instance communicates via `postMessage` rather than shared memory. If either changes the store API, the `postMessage` protocol must be updated in sync.

**Current state (2026-04-27)**: The standalone `sessionStore` Vite entry produces a deployed `sessionStore-[hash].js` artifact that is **never enqueued by PHP**. The `ShellEmbedMode::enqueue_bridge_script()` method loads only the bridge script. There is only one running instance of the session store (in the parent shell). The standalone entry should either be removed or wired as an enqueued embed-mode script.

## Shell feature as composition root (FSD tension)

`bootstrapShell.tsx` lives in `features/shell/` but imports directly from other feature internals (`activity/store/activityStore`, `branding/store/brandingStore`, `dashboard/store/dashboardStore`, `license/store/licenseStore`, etc.) rather than through feature barrels. This violates the FSD cross-feature import rules documented in `FSD_GUIDELINES.md`.

**Why this happened**: The bootstrap functions (`bootstrap*Store`, `reset*Store`) are intentionally excluded from feature barrels — they're framework construction internals, not public API. But the shell feature needs them to wire up the application. Neither approach is wrong, but the inconsistency needs resolution.

**Options**:
1. Export bootstrap/reset functions from each feature's barrel (making them public API)
2. Move bootstrap logic into the shell feature entirely
3. Acknowledge `bootstrapShell.tsx` as a privileged composition root exempt from FSD rules

**Current approach**: The code uses deep imports; `FSD_GUIDELINES.md` is silent on this exception.

## PHP test stubs

PHPUnit tests require WordPress function stubs. These are in `tests/php/wp-stubs.php` — a minimal set of mocked WordPress functions needed by the unit tests under `tests/php/`.

When writing new PHP tests, add function stubs to `wp-stubs.php` as needed. Do not load the full WordPress test suite (this is not a WordPress plugin integration test — it's a unit test suite for the plugin's PHP code).

## Menu caching

Menu payloads are cached per-user with a versioned namespace (`MenuCache.php`). The cache is invalidated when:
- A plugin is activated/deactivated
- A menu item is added/removed
- The shell asset version changes (deploy)

The REST `GET /menu` endpoint is **advisory**. The source of truth is always the PHP-localized `window.wpReactUi` payload. The REST endpoint exists for cases where the menu must be refreshed without a full page reload.

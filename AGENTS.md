# AGENTS.md

## Project

**WP React UI** — A WordPress admin shell plugin. A React + Ant Design shell replaces the native sidebar/top bar. Real admin pages render inside an iframe with `?wp_shell_embed=1`. The shell stays mounted while the iframe navigates.

## Commands

```bash
bun run dev              # Vite HMR on :5173
bun run build            # tsc -b && vite build → dist/
bun run test             # vitest run (frontend)
bun run test:coverage    # vitest with v8 coverage
bun run lint             # biome check ./src
bun run format           # biome format --write ./src
bun run verify           # lint + test + build + composer lint (CI gate)

composer run lint        # PHPCS only
composer run test        # PHPUnit (integration; requires WordPress stubs)
npm run package:plugin   # build + zip deployable artifact
npm run verify:artifact  # validate staged artifact
```

## Architecture

### Shell + iframe model

The plugin mounts one React root (`#react-shell-root`). React renders the Sidebar, Navbar, and ContentFrame (an iframe). Admin pages load inside the iframe with `wp_shell_embed=1`. PHP strips native chrome in embed mode and injects a `postMessage` bridge.

If the shell bundle can't be resolved, PHP falls back to native WordPress admin (no broken shell).

### Boot sequence

1. PHP inlines critical CSS + early-state script in `admin_head` (theme/sidebar restore before first paint)
2. `main.tsx` creates/finds `#react-shell-root`, removes legacy `react-navbar-root` / `react-sidebar-root` nodes
3. `bootstrapShell()` bootstraps all stores and mounts React
4. Shell renders grid: Sidebar | Navbar | ContentFrame(iframe)

### PHP class layout

```
app/                          → WpReactUi\ namespace (PSR-4)
app/Bootstrap/PluginBootstrap → composition root, calls legacy_init_sequence()
app/WordPress/Shell/          → ShellBootstrap, ShellEmbedMode, ShellEarlyBoot, ShellAdminAssets
includes/                     → WP_React_UI_* prefix, WordPress-facing compatibility loaders
```

`wp-custom-dashboard.php` is the plugin entrypoint. `\WpReactUi\Plugin::boot()` → `PluginBootstrap::boot()` → `OptionsMigration::run()` → legacy init sequence.

### Frontend layout

```
src/
├── main.tsx                  → entrypoint (Vite input)
├── embedBridge.ts            → postMessage bridge for iframe (Vite input)
├── outside.css               → global reset/outside styles (Vite input)
├── features/                 → FSD feature modules (shell, navigation, dashboard, session, etc.)
│   └── shell/bootstrapShell.tsx → mounts React, bootstraps all stores
├── store/                    → legacy compatibility re-exports
├── types/wp.ts               → compatibility layer for boot config types
├── platform/wordpress/embedBridge.ts → actual embed bridge implementation
└── generated/contracts/      → auto-generated cross-boundary types (DO NOT edit)
```

Vite inputs: `embedBridge`, `main`, `outside`, `sessionStore`.

### REST API

Namespace: `/wp-json/wp-react-ui/v1/`
- `GET /menu` — refresh menu payload (advisory; PHP-localized boot data is source of truth)
- `GET|POST /theme` — read/write theme preference

## Key patterns

### Store pattern (Zustand, vanilla)

Each store in `src/features/*/store/` exports:
- `create<Name>Store()` — factory
- `bootstrap<Name>Store(config?)` — init from boot config/localStorage, return teardown fn
- `reset<Name>Store()` — clear state for remount

Stores are not React-bound at bootstrap. Teardown is explicit (returns a cleanup function).

### Service pattern

Factory functions returning typed interfaces:
```ts
function createDashboardService(config: {restUrl, nonce}): DashboardService { ... }
```

### Contract generation

```
contracts/source/manifests/   ← Author-edited: routes, permissions, feature flags
contracts/source/schemas/     ← Author-edited: boot payloads, REST DTOs
     ↓ node scripts/generate-contracts.mjs
app/Contracts/Generated/      ← Auto-generated PHP contracts (DO NOT hand-edit)
src/generated/contracts/      ← Auto-generated TS contracts (DO NOT hand-edit)
contracts/php/                ← Hand-written PHP contract constraints
contracts/ts/                 ← Hand-written TS contract constraints
```

- **Always edit `contracts/source/`**, never the generated files.
- Verify: `node scripts/verify-generated-contracts.mjs`

### i18n

Simple record-based translations in `src/utils/i18n.ts`. English (fallback) + German. Locale from `window.wpReactUi.locale`.

## FSD import rules

Features live in `src/features/*/`. Cross-feature imports must use barrel exports only:
```ts
// ✅ Allowed
import { useLicense } from "../../../license";
// ❌ Forbidden — direct internal path
import { useLicense } from "../../../license/context/LicenseContext";
```

Each feature has an `index.ts` barrel. PRs enforce no deep feature imports.

## Conventions

- **Biome**: 100 char line width, double quotes, trailing commas (es5), semicolons always
- **Tests**: Vitest + jsdom + @testing-library/react. Tests co-located as `*.test.ts(x)`. Setup in `src/test/setup.ts`
- **CSS vars**: `--sidebar-width`, `--font-display`, `--color-accent-primary`, etc., synced from stores
- **Mobile**: 768px breakpoint. Desktop sidebar 240px/64px collapsed. Mobile uses drawer
- **Production build drops**: `console.*` and `debugger` stripped from production bundles
- **Dark theme**: Navy palette via Ant Design `ConfigProvider` token overrides

## Legacy compatibility shims

The following files are **retained compatibility surfaces** from a previous architecture. Do not refactor or remove them without a full import-graph audit:
- `src/App.tsx`, `src/bootstrapShell.tsx`
- `src/components/`, `src/services/*.ts`, `src/context/*.tsx`
- `src/store/*.ts`, `src/utils/spaNavigate.ts`
- `includes/class-wp-react-ui-*.php` files (stable WordPress-facing loaders)

## Release

```bash
bun run verify              # gate
npm run package:plugin      # build + stage + zip → artifacts/wp-custom-dashboard.zip
npm run verify:artifact     # validate artifact structure
```

After deploy: hard-refresh wp-admin so new hashed assets are requested. See `RELEASE_CHECKLIST.md`.

## Source of truth

| Thing | Source |
|-------|--------|
| Menu structure | PHP `$menu` / `$submenu` → localized `window.wpReactUi` → menuStore |
| iframe/browser URL | navigationStore |
| Theme | themeStore (localStorage + user-meta persistence) |
| Boot config | `window.wpReactUi` (immutable, not a runtime store) |
| Cross-boundary contracts | `contracts/source/` (never generated files) |

## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules

For deep work on a specific folder, also read that folder's `codemap.md`.

## Known Issues (2026-04-27 Review)

### Release Blockers

**RB-1**: `permission_webhook_request()` in `app/WordPress/Rest/RestApi.php:510-534` is dead code. Webhook endpoint uses `__return_true`. Remove or wire it.

**RB-2**: PHP test class/file name collisions:
- `tests/php/LicenseCacheDomainTest.php` defines `class LicenseCacheTest` (collision with `LicenseCacheTest.php`) — rename to `LicenseCacheDomainTest`
- `tests/php/LicenseGracePeriodDomainTest.php` defines `class LicenseGracePeriodTest` (collision with `LicenseGracePeriodTest.php`) — rename to `LicenseGracePeriodDomainTest`

Run `composer run test` and verify no warnings after fixing.

### Before touching sessionStore

The `sessionStore` is both a shared module and a standalone Vite entry. The standalone entry produces a `sessionStore-[hash].js` artifact that is **never enqueued by PHP**. If changing the store API, keep the `postMessage` protocol in sync. See `ARCHITECTURE.md` → "The sessionStore Vite input quirk".

### FSD import rules in bootstrapShell.tsx

`bootstrapShell.tsx` uses deep imports to feature internals (violates FSD barrel rule). Some symbols ARE available in barrels and should use them:
- `SessionExpiredModal`, `SessionHeartbeatEffect` → `../session`
- `bootstrapSessionStore`, `resetSessionStore`, `sessionStore` → `../session`
- `navigationStore` → `../navigation`
- `brandingStore` → `../branding`
- `LicenseProvider` → `../license`

Bootstrap/reset functions for other features are NOT in their barrels and need an architectural decision (see `ARCHITECTURE.md` → "Shell feature as composition root").

### Biome warnings (non-blocking)

- 4 cognitive complexity violations (max 15): `LicenseSettings` at 35, `BusinessSection`, `SummaryTiles`, `dashboardViewModel` at 16 each
- 1 unnecessary `useEffect` dependency in `MessageList/index.tsx:20` (`messageCount`)
- Run `bun run lint` to see current state

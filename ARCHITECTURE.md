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

## Shell feature as composition root (FSD tension) — RESOLVED

`bootstrapShell.tsx` lives in `features/shell/` but imports from other feature internals. This violated FSD cross-feature import rules.

**Resolution (2026-04-27)**: All features now export `bootstrap*Store` and `reset*Store` functions from their barrel (`index.ts`):

- `src/features/activity/index.ts` — exports `bootstrapActivityStore`, `resetActivityStore`
- `src/features/branding/index.ts` — exports `bootstrapBrandingStore`, `resetBrandingStore`  
- `src/features/dashboard/index.ts` — exports `bootstrapDashboardStore`, `resetDashboardStore`
- `src/features/license/index.ts` — exports `bootstrapLicenseStore`, `resetLicenseStore`
- `src/features/navigation/index.ts` — exports `bootstrapMenuStore`, `resetMenuStore`, `bootstrapMenuCountsStore`, `resetMenuCountsStore`, `bootstrapNavigationStore`, `resetNavigationStore`
- `src/features/session/index.ts` — had them already

**Decision**: Option 1 — bootstrap/reset functions are public construction API. The shell is the composition root and uses barrel imports like any other consumer. `bootstrapShell.tsx` now imports exclusively through barrels.

## Cognitive complexity decomposition patterns

Biome enforces a **max 15** cognitive complexity score. Several components exceeded this threshold. The following patterns were used to bring them under the limit:

### LicenseSettings (complexity 35 → ≤15)

The biggest offender. Decomposition:

1. **`getLicenseStatusDisplay()`** — Pure function extracting the 5-branch if/else chain for status icon/label/color. Moved conditional logic out of the component body.
2. **`LicenseKpiSection`** — Sub-component rendering the 4 KPI tiles. Isolated all tile-level conditionals from the main component.
3. **`LicenseKeySurface`** — Sub-component encapsulating ALL key editing state and handlers (`licenseKey`, `handleLicenseKeyKeyDown`, `handleLicenseKeyPaste`, `applyLicenseKeyEdit`, `handleActivate`, `handleDeactivate`). This was the biggest win — the keyboard handler alone had 4 early-return conditions.

**Critical rule**: `useLicenseServerSettings()` must be called exactly ONCE per component tree. Extracting `LicenseKeySurface` as a sub-component required passing server settings as props rather than calling the hook again. Calling the hook in two components creates duplicate store instances and desynchronized state.

### BusinessSection (complexity 16 → ≤15)

Extracted 3 row sub-components: `BookingsRow`, `ContactFormsRow`, `EmailDeliveryRow`. Each row was a self-contained `<Flex>` block with its own conditionals. Moving them into named components broke the complexity chain.

### SummaryTiles — `getConversionsProps` (complexity 16 → ≤15)

Extracted a `renderConversionTags()` helper for the nested sub-rendering logic. The sub-building had an if/else with two inner ifs. The helper isolates the branching from the value/color/tooltip computation.

### dashboardViewModel — `extractDataFields` (complexity 16 → ≤15)

Introduced `val<T>()` and `arr<T>()` helper functions that wrap `?? null` / `?? []` behind a function call. This moves the nullish coalescing operators (each counting toward cognitive complexity) out of the calling function. The function went from 15 `??` operators to 2 function calls.

### MessageList — useEffect dependency

Biome flagged `messageCount` as an unnecessary dependency. The effect uses only `bottomRef` (a stable ref). The dependency was kept with a `biome-ignore` comment — `messages` is a prop, and when the parent passes a new array the component needs to re-scroll. The correct dependency is `[messages]` since it's the prop reference that changes on new messages.
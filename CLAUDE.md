# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WP React UI — a WordPress admin shell plugin that replaces the native sidebar and top bar with a React + Ant Design shell, loading real admin screens inside an iframe.

## Commands

```bash
bun run dev          # Vite dev server on :5173 with HMR
bun run build        # tsc check + vite build → dist/
bun run test         # vitest run (all tests)
bun run test:watch   # vitest in watch mode
bun run test:coverage # vitest with v8 coverage
bun run lint         # biome check ./src
bun run lint:fix     # biome check --write ./src
bun run format       # biome format --write ./src
bun run verify       # lint + test + build + composer lint (full CI gate)
composer run lint    # PHP linting only
```

## Stack

React 19, Ant Design 6, TypeScript 5.9, Vite 8, Zustand 5, Recharts 3, Vitest 3, Biome 2, PHP (WordPress).

## Architecture

### Single Shell + iframe model

The plugin mounts one React root (`#react-shell-root`) containing Sidebar, Navbar, and ContentFrame. Admin pages load inside an iframe with `?wp_shell_embed=1`. PHP strips native chrome in embed mode and injects a `postMessage` bridge (`embedBridge.ts`) so the shell reacts to title changes, navigation, and session expiry.

If the shell bundle can't be resolved, PHP falls back to native WordPress admin.

### Boot sequence

1. PHP inlines critical CSS and early-state script in `admin_head` (theme/sidebar restore before first paint)
2. `main.tsx` creates/finds `#react-shell-root`, removes legacy dual-root nodes, normalizes `window.wpReactUi`
3. `bootstrapShell()` bootstraps all stores (menu, theme, sidebar, navigation, etc.) and mounts the React root
4. Shell renders grid layout: Sidebar | Navbar | ContentFrame(iframe)

### Source of truth

- **Menu structure**: PHP (`$menu` / `$submenu`) → localized as `window.wpReactUi` → menuStore (REST refresh is advisory)
- **iframe URL / browser URL / loading state**: navigationStore
- **Theme**: themeStore (localStorage + user-meta persistence)
- **`window.wpReactUi`**: immutable boot config, not a runtime store

### Store pattern

All Zustand stores are vanilla (not React-bound at init). Each store module exports:
- `create<Name>Store()` — store factory
- `bootstrap<Name>Store(config?)` — init from localStorage/config, set up listeners, return teardown fn
- `reset<Name>Store()` — clear state for remount

### Service pattern

Services are factory functions returning typed interfaces, created with `{restUrl, nonce}` from boot config:
```ts
export function createDashboardService(config): DashboardService { ... }
```

### REST API

Namespace: `/wp-json/wp-react-ui/v1/`
- `GET /menu` — menu payload
- `GET|POST /theme` — theme preference

### i18n

Simple record-based translations in `src/utils/i18n.ts` with interpolation. English (fallback) + German. Locale from `window.wpReactUi.locale`.

### PHP class naming

All PHP classes use prefix `WP_React_UI_` (e.g., `WP_React_UI_Shell_Bootstrap`).

## Conventions

- **Linting**: Biome — 100 char line width, double quotes, trailing commas (es5)
- **Tests**: Vitest + jsdom + @testing-library/react. Tests co-located as `*.test.ts(x)`. Setup in `src/test/setup.ts`.
- **CSS**: Ant Design theming via ConfigProvider. CSS vars for shell/iframe integration. Critical CSS inlined via PHP.
- **Mobile**: 768px breakpoint. Desktop sidebar 240px/64px collapsed. Mobile uses drawer.
- **Responsive CSS var**: `--sidebar-width` synced from sidebarStore.

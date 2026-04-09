# WP React UI

A WordPress admin shell plugin that replaces the native sidebar and top bar with a React + Ant Design shell while loading real admin screens inside an iframe.

## Overview

| Feature | Details |
|---|---|
| Stack | React 19, Ant Design 6, TypeScript, Vite 8, WordPress PHP |
| Navigation model | Persistent parent shell + iframe-loaded admin screens |
| Theme | Light / dark with localStorage + user-meta persistence |
| Branding | Configurable light/dark logos under Settings |
| Mobile | Drawer-based sidebar below 768px |

## Architecture

### Runtime model

The plugin now uses a **single React shell root**:

```text
#wpwrap
├── #react-shell-root   -> single React root for sidebar + navbar + iframe
├── #wpcontent          -> still rendered by WordPress, hidden from the user
└── #wpfooter           -> still rendered by WordPress, hidden from the user
```

The shell stays mounted while the iframe navigates between admin pages. WordPress still renders each target page normally, but when `wp_shell_embed=1` is present the plugin strips native chrome, forces the embedded document to fill the iframe height, and injects a small `postMessage` bridge.

If the shell bundle cannot be resolved, the plugin falls back to native WordPress admin instead of trying to boot a broken shell.

### Boot sequence

1. PHP inlines critical CSS and an early-state script in `admin_head`.
2. The early-state script restores theme and sidebar width before first paint and ensures `#react-shell-root` exists.
3. `src/main.tsx` removes any legacy `react-navbar-root` / `react-sidebar-root` nodes left over from older builds.
4. `src/main.tsx` normalizes `window.wpReactUi`, tears down any previous shell instance, and calls `bootstrapShell(host, config)`.
5. `bootstrapShell()` bootstraps the menu, theme, sidebar, and navigation stores and mounts one React root.
6. The shell renders `<Sidebar />`, `<Navbar />`, and `<ContentFrame />`.
7. The iframe loads the current admin URL with `wp_shell_embed=1`.

### Source of truth

- PHP is the source of truth for menu structure.
- The React app consumes the localized `window.wpReactUi` payload once at boot and uses shared stores for runtime state.
- `window.wpReactUi` is boot config, not a mutable runtime store.
- The navigation store is the source of truth for iframe URL, browser URL, and loading state.

## File layout

```text
wp-custom-dashboard/
├── wp-custom-dashboard.php
├── app/
│   ├── Branding/
│   ├── Dashboard/
│   ├── Rest/
│   └── WordPress/
│       ├── Assets/
│       ├── Menu/
│       ├── Rest/
│       └── Shell/
├── includes/
│   ├── class-wp-react-ui-*.php    -> compatibility loaders kept for WordPress-facing runtime stability
│   └── critical.css
├── src/
│   ├── main.tsx
│   ├── bootstrapShell.tsx
│   ├── app/                      -> compatibility shims
│   ├── components/               -> compatibility shims
│   ├── features/
│   │   ├── branding/
│   │   ├── dashboard/
│   │   ├── navigation/
│   │   ├── session/
│   │   └── shell/
│   ├── config/
│   ├── store/
│   ├── utils/
│   └── types/
└── dist/
```

## Development

```bash
bun run dev
bun run verify
bun run build
bun run test
bun run lint
npm run package:plugin
npm run verify:artifact
composer run lint
```

## Deploy checklist

Before deploying:

1. Run `bun run verify`.
2. Run `npm run package:plugin` to stage and zip the deployable plugin artifact.
3. Run `npm run verify:artifact` to verify runtime files, manifest entries, and zip contents.
4. Deploy the packaged plugin artifact, or deploy the staged runtime files from `artifacts/wp-custom-dashboard/`.
5. Hard-refresh wp-admin after deploy so the new hashed assets are requested.
6. Smoke-test the main flows:
   - dashboard load
   - breadcrumb navigation
   - browser back/forward
   - sidebar collapse and mobile drawer
   - theme toggle
   - profile dropdown and logout
   - one breakout screen such as `post.php`

## Notes

- The plugin does not use separate navbar/sidebar React roots anymore. Everything mounts under `#react-shell-root`.
- `src/utils/spaNavigate.ts` is retained only as a compatibility shim around active-key subscription.
- The plugin no longer uses the old fetch-and-swap SPA approach.

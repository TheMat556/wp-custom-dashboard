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
├── #react-shell-root   -> React shell (sidebar + navbar + iframe)
├── #wpcontent          -> still rendered by WordPress, hidden from the user
└── #wpfooter           -> still rendered by WordPress, hidden from the user
```

The shell stays mounted while the iframe navigates between admin pages. WordPress still renders each target page normally, but when `wp_shell_embed=1` is present the plugin strips native chrome and injects a small `postMessage` bridge.

If the shell bundle cannot be resolved, the plugin falls back to native WordPress admin instead of trying to boot a broken shell.

### Boot sequence

1. PHP inlines critical CSS and an early-state script in `admin_head`.
2. The early-state script restores theme and sidebar width before first paint.
3. PHP creates or preserves `#react-shell-root`.
4. React bootstraps explicit stores for theme, sidebar, and navigation.
5. The shell renders `<Sidebar />`, `<Navbar />`, and `<ContentFrame />`.
6. The iframe loads the current admin URL with `wp_shell_embed=1`.

### Source of truth

- PHP is the source of truth for menu structure.
- The React app consumes the localized `window.wpReactUi` payload and optional REST refreshes.
- The navigation store is the source of truth for iframe URL, browser URL, and loading state.

## File layout

```text
wp-custom-dashboard/
├── wp-custom-dashboard.php
├── includes/
│   ├── class-wp-react-ui-asset-loader.php
│   ├── class-wp-react-ui-branding-settings.php
│   ├── class-wp-react-ui-menu-cache.php
│   ├── class-wp-react-ui-menu-repository.php
│   ├── class-wp-react-ui-rest-api.php
│   ├── class-wp-react-ui-shell-admin-assets.php
│   ├── class-wp-react-ui-shell-bootstrap.php
│   ├── class-wp-react-ui-shell-early-boot.php
│   ├── class-wp-react-ui-shell-embed-mode.php
│   ├── class-wp-react-ui-shell-localization.php
│   └── critical.css
├── src/
│   ├── main.tsx
│   ├── bootstrapShell.tsx
│   ├── components/
│   ├── config/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── utils/
│   └── types/
└── dist/
```

## Development

```bash
npm run dev
npm run verify
npm run build
npm test
npm run lint
composer run lint
```

## Deploy checklist

Before deploying:

1. Run `npm run verify`.
2. Deploy the updated plugin PHP files and the built `dist/` directory together.
3. Hard-refresh wp-admin after deploy so the new hashed assets are requested.
4. Smoke-test the main flows:
   - dashboard load
   - breadcrumb navigation
   - browser back/forward
   - sidebar collapse and mobile drawer
   - theme toggle
   - profile dropdown and logout
   - one breakout screen such as `post.php`

## Notes

- `src/utils/spaNavigate.ts` is retained only as a compatibility shim around active-key subscription.
- The plugin no longer uses the old fetch-and-swap SPA approach.

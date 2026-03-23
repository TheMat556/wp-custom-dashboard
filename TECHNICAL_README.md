# WP React UI Technical Notes

## Core design

WP React UI is an iframe-shell plugin, not a fetch-and-swap SPA.

- The React shell is mounted once into `#react-shell-root`.
- WordPress continues rendering real admin pages server-side.
- The content area is shown through an iframe whose URL is the current admin URL plus `wp_shell_embed=1`.
- In embed mode, PHP removes native admin chrome and injects a `postMessage` bridge so the parent shell can react to title changes and navigation.

## PHP responsibilities

### [wp-custom-dashboard.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/wp-custom-dashboard.php)

Lightweight entrypoint only:

- Loads PHP classes.
- Exposes page-configuration helpers.
- Initializes branding settings and shell bootstrap.

### [includes/class-wp-react-ui-shell-bootstrap.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-shell-bootstrap.php)

Thin orchestrator only:

- Initializes embed-mode handling.
- Initializes early boot rendering.
- Initializes admin asset lifecycle.
- Registers REST routes.

### [includes/class-wp-react-ui-shell-embed-mode.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-shell-embed-mode.php)

Owns iframe-rendered admin screens:

- Reset CSS for embed mode.
- Enqueue of the embed bridge asset.
- Redirect rewriting to preserve `wp_shell_embed=1`.

### [includes/class-wp-react-ui-shell-early-boot.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-shell-early-boot.php)

Owns pre-paint shell setup:

- Critical CSS.
- Boot config script.
- Early theme/sidebar state restoration.
- Asset preload tags.
- Theme-aware branding preload.

### [includes/class-wp-react-ui-shell-admin-assets.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-shell-admin-assets.php)

Owns runtime admin integration:

- Manifest-change cache invalidation.
- Menu-cache invalidation hooks.
- Script/style enqueue and localization payload.
- Admin notice when shell assets are unavailable.

### [includes/class-wp-react-ui-shell-localization.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-shell-localization.php)

Builds the immutable frontend boot payload localized as `window.wpReactUi`.

### [includes/class-wp-react-ui-asset-loader.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-asset-loader.php)

Owns built asset resolution:

- Detects Vite dev mode.
- Reads and caches the Vite manifest.
- Enqueues production and dev assets.
- Resolves entry URLs and preload assets.
- Clears manifest/dev caches.

### [includes/class-wp-react-ui-menu-repository.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-menu-repository.php)

Builds the canonical shell menu payload from `$menu` / `$submenu`.

### [includes/class-wp-react-ui-menu-cache.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-menu-cache.php)

Caches menu payloads per user with a versioned namespace.

If the shell entry asset cannot be resolved, the plugin falls back to native WordPress admin rather than attempting to boot the shell.

### [includes/class-wp-react-ui-branding-settings.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-branding-settings.php)

Owns Settings API integration for light/dark logos and exposes branding payload for the frontend.

### [includes/class-wp-react-ui-rest-api.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/includes/class-wp-react-ui-rest-api.php)

Exposes:

- `GET /wp-react-ui/v1/menu`
- `GET /wp-react-ui/v1/theme`
- `POST /wp-react-ui/v1/theme`

## Frontend responsibilities

### [src/main.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/main.tsx)

Explicit application bootstrap:

- Creates or finds the shell root.
- Normalizes `window.wpReactUi`.
- Tears down any prior shell instance before remount.
- Calls `bootstrapShell(host, config)`.

### [src/bootstrapShell.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/bootstrapShell.tsx)

Owns frontend composition:

- Bootstraps menu, theme, sidebar, and navigation stores.
- Mounts the React root.
- Returns teardown for remount safety.

### Store startup

The stores no longer rely on import-time side effects.

- [src/store/themeStore.ts](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/store/themeStore.ts) exports `bootstrapThemeStore()` to restore persisted theme and sync DOM attributes.
- [src/store/sidebarStore.ts](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/store/sidebarStore.ts) exports `bootstrapSidebarStore()` to restore sidebar width, bind resize handling, and sync CSS variables.
- [src/store/navigationStore.ts](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/store/navigationStore.ts) exports `bootstrapNavigationStore()` to initialize history state and bind `popstate`.
- [src/store/menuStore.ts](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/store/menuStore.ts) owns shared menu state for all consumers.

### Services

- [src/services/menuApi.ts](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/services/menuApi.ts) owns menu refresh transport.
- [src/services/themeApi.ts](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/services/themeApi.ts) owns theme persistence transport.

### Hooks and UI

- [src/context/ThemeContext.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/context/ThemeContext.tsx) and [src/context/SidebarContext.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/context/SidebarContext.tsx) are store-backed hooks, not fake providers.
- [src/components/ContentFrame/index.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/components/ContentFrame/index.tsx) renders the iframe and loading overlay.
- [src/components/navbar/index.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/components/navbar/index.tsx) and [src/components/sidebar/index.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/components/sidebar/index.tsx) render shell chrome.
- [src/hooks/useMenu.ts](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/hooks/useMenu.ts) reads the canonical PHP menu payload and refreshes it over REST when requested.

## Operational tradeoffs

- The iframe model is less “pure SPA” than the previous design, but it is much safer for WordPress compatibility because each screen still gets a clean execution context.
- The shell still depends on several inline scripts in PHP for pre-paint behavior. That is deliberate to avoid visible flicker.
- The menu refresh endpoint is advisory. The shell starts from localized server data and only refreshes on demand.
- Production deploys should ship PHP changes and the built `dist/` assets together. The simplest local gate is `npm run verify`.

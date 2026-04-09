# WP React UI Technical Notes

## Core design

WP React UI is an iframe-shell plugin, not a fetch-and-swap SPA.

- The React shell is mounted once into `#react-shell-root`.
- Any legacy `#react-navbar-root` / `#react-sidebar-root` nodes are removed during boot.
- WordPress continues rendering real admin pages server-side.
- The content area is shown through an iframe whose URL is the current admin URL plus `wp_shell_embed=1`.
- In embed mode, PHP removes native admin chrome, forces the embedded document to fill the iframe height, and injects a `postMessage` bridge so the parent shell can react to title changes and navigation.

## PHP responsibilities

### [wp-custom-dashboard.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/wp-custom-dashboard.php)

Lightweight entrypoint only:

- Loads PHP classes.
- Exposes page-configuration helpers.
- Initializes branding settings and shell bootstrap.
- Keeps requiring `includes/*` compatibility loaders so WordPress-facing entrypoints stay stable.

### [app/WordPress/Shell/ShellBootstrap.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Shell/ShellBootstrap.php)

Thin orchestrator only:

- Initializes embed-mode handling.
- Initializes early boot rendering.
- Initializes admin asset lifecycle.
- Registers REST routes.

### [app/WordPress/Shell/ShellEmbedMode.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Shell/ShellEmbedMode.php)

Owns iframe-rendered admin screens:

- Reset CSS for embed mode.
- Height normalization for the embedded HTML/body/WP wrappers.
- Enqueue of the embed bridge asset.
- Redirect rewriting to preserve `wp_shell_embed=1`.

### [app/WordPress/Shell/ShellEarlyBoot.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Shell/ShellEarlyBoot.php)

Owns pre-paint shell setup:

- Critical CSS.
- Boot config script.
- Early theme/sidebar state restoration.
- Asset preload tags.
- Theme-aware branding preload.

### [app/WordPress/Shell/ShellAdminAssets.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Shell/ShellAdminAssets.php)

Owns runtime admin integration:

- Manifest-change cache invalidation.
- Menu-cache invalidation hooks.
- Script/style enqueue and localization payload.
- Admin notice when shell assets are unavailable.

### [app/WordPress/Shell/ShellLocalization.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Shell/ShellLocalization.php)

Builds the immutable frontend boot payload localized as `window.wpReactUi`.

### [app/WordPress/Assets/AssetLoader.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Assets/AssetLoader.php)

Owns built asset resolution:

- Detects Vite dev mode.
- Reads and caches the Vite manifest.
- Enqueues production and dev assets.
- Resolves entry URLs and preload assets.
- Clears manifest/dev caches.

### [app/WordPress/Menu/MenuRepository.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Menu/MenuRepository.php)

Builds the canonical shell menu payload from `$menu` / `$submenu`.

### [app/WordPress/Menu/MenuCache.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Menu/MenuCache.php)

Caches menu payloads per user with a versioned namespace.

If the shell entry asset cannot be resolved, the plugin falls back to native WordPress admin rather than attempting to boot the shell.

### [app/WordPress/Branding/BrandingSettings.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Branding/BrandingSettings.php)

Owns Settings API integration for light/dark logos and exposes branding payload for the frontend.

### [app/WordPress/Rest/RestApi.php](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/app/WordPress/Rest/RestApi.php)

Exposes:

- `GET /wp-react-ui/v1/menu`
- `GET /wp-react-ui/v1/theme`
- `POST /wp-react-ui/v1/theme`

## Frontend responsibilities

### [src/main.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/main.tsx)

Explicit application bootstrap:

- Creates or finds the shell root.
- Removes legacy two-root mount nodes if they still exist.
- Normalizes `window.wpReactUi`.
- Tears down any prior shell instance before remount.
- Calls `bootstrapShell(host, config)`.

### [src/features/shell/bootstrapShell.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/features/shell/bootstrapShell.tsx)

Owns frontend composition:

- Bootstraps menu, theme, sidebar, and navigation stores.
- Mounts the single React root.
- Returns teardown for remount safety.

Legacy compatibility shims remain at [src/bootstrapShell.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/bootstrapShell.tsx), [src/app/App.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/app/App.tsx), and under [src/components](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/components) so existing import paths and Vite entry inputs remain stable during the migration.

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
- [src/features/shell/components/ContentFrame/index.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/features/shell/components/ContentFrame/index.tsx) renders the iframe and loading overlay.
- [src/features/shell/components/navbar/index.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/features/shell/components/navbar/index.tsx) and [src/features/shell/components/sidebar/index.tsx](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/features/shell/components/sidebar/index.tsx) render shell chrome inside that one root.
- [src/hooks/useMenu.ts](/var/www/html/wordpress/wp-content/plugins/wp-custom-dashboard/src/hooks/useMenu.ts) reads the canonical PHP menu payload and refreshes it over REST when requested.

## Operational tradeoffs

- The iframe model is less “pure SPA” than the previous design, but it is much safer for WordPress compatibility because each screen still gets a clean execution context.
- The shell still depends on several inline scripts in PHP for pre-paint behavior. That is deliberate to avoid visible flicker.
- The menu refresh endpoint is advisory. The shell starts from localized server data and only refreshes on demand.
- Production deploys should ship PHP changes and the built `dist/` assets together. The simplest local gate is `bun run verify`.

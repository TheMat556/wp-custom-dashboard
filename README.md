# WP React UI

A WordPress plugin that replaces the native admin sidebar and toolbar with a custom React + Ant Design UI. Features SPA-style navigation, light/dark theming, custom branding, and a zero-flicker load strategy.

---

## Overview

| Feature | Details |
|---|---|
| **Stack** | React 19, Ant Design 6, TypeScript, Vite 8 |
| **PHP** | WordPress plugin (tested on WP 6.x) |
| **Navigation** | SPA-style (fetch + DOM swap, no full reloads) |
| **Theming** | Light / dark, persisted per-user via REST + `localStorage` |
| **Branding** | Configurable logos (light + dark) via Settings page |
| **Mobile** | Responsive drawer at 768 px breakpoint |

---

## Directory Structure

```
wp-custom-dashboard/
├── wp-custom-dashboard.php     # Plugin entry: hooks, critical CSS, early-state script
├── includes/
│   ├── class-asset-loader.php  # Vite manifest parsing, asset enqueue, menu data + caching
│   ├── class-branding-settings.php  # Settings API page for logo uploads
│   ├── class-rest-api.php      # REST endpoints: /menu, /theme
│   └── critical.css            # Inlined CSS: hides WP chrome, grid layout, skeleton shimmer
├── src/
│   ├── main.tsx                # Bootstrap: creates two React roots, init SPA nav
│   ├── index.css               # Base styles, hover rules, View Transitions CSS
│   ├── outside.css             # WordPress content area tweaks (loaded globally)
│   ├── types/
│   │   └── wp.ts               # Window.wpReactUi type declarations
│   ├── context/
│   │   ├── SidebarContext.tsx  # Module-level sidebar store (collapse, mobile, CSS var)
│   │   └── ThemeContext.tsx    # Module-level theme store (light/dark, REST sync)
│   ├── hooks/
│   │   └── useMenu.ts          # Menu data from wpReactUi + REST refresh
│   ├── utils/
│   │   ├── wp.ts               # Admin URL helpers, navigate(), navigateHome()
│   │   └── spaNavigate.ts      # Fetch-based SPA navigation, useActiveKey() hook
│   └── components/
│       ├── ErrorBoundary.tsx   # Catches React render errors per-root
│       ├── navbar/
│       │   ├── index.tsx       # Header: burger button, breadcrumb, theme toggle
│       │   └── UserDropdown.tsx # Avatar (initials), user menu, logout
│       └── sidebar/
│           ├── index.tsx       # Desktop Sider + mobile Drawer orchestration
│           ├── SidebarContent.tsx  # Menu + Logo + BottomActions layout
│           ├── Logo.tsx        # Site name + branding logo (light/dark aware)
│           ├── BottomActions.tsx   # Refresh button + version info
│           ├── MobileDrawer.tsx    # Ant Design Drawer wrapper for mobile
│           └── menuTransform.tsx   # Converts wpReactUi.menu items to Ant Menu format
├── public/                     # Static assets (logo.svg default)
├── dist/                       # Built output (committed or CI-generated)
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── package.json
```

---

## Architecture

### Page Load Flow

Every WordPress admin page goes through this sequence:

```
1. PHP renders HTML skeleton + localizes wpReactUi data object
2. admin_head (priority 1) inlines critical.css
   → Hides native WP chrome (#adminmenu, #wpadminbar)
   → Sets CSS grid layout: [sidebar | content]
   → Starts skeleton shimmer animation
3. Early-state inline <script> runs synchronously:
   → Reads localStorage 'wp-react-sidebar-collapsed'
   → Sets --sidebar-width CSS var (240px or 64px) — zero layout shift
   → Sets data-theme on <body> from server-known user preference
4. Browser downloads preloaded JS/CSS (modulepreload hints)
5. React mounts into #react-sidebar-root and #react-navbar-root
   → .mounted class added to each root → skeleton hidden
6. #wpwrap.react-ready class applied → content fades in (80ms)
7. initSpaNavigation() wires click delegation on #wpcontent
```

### Two React Roots

The plugin mounts two independent React trees: one for the sidebar, one for the navbar. This matches the CSS grid layout where they are separate sibling elements in `#wpwrap`.

Both roots share the same module-level stores (`SidebarContext`, `ThemeContext`) — state changes in one root instantly propagate to the other without any event bus.

```
#wpwrap (CSS grid)
├── #react-navbar-root   → <Navbar />  (grid-area: navbar)
├── #react-sidebar-root  → <Sidebar /> (grid-area: sidebar)
└── #wpcontent                          (grid-area: content)
```

### SPA Navigation

After React mounts, `initSpaNavigation()` installs a click listener on `#wpcontent`. Admin link clicks are intercepted and handled without a full page reload:

1. `fetch()` the target URL with `credentials: 'same-origin'`
2. Parse the response HTML with `DOMParser`
3. Replace `#wpcontent` (and `#wpfooter`) innerHTML
4. Re-execute any `<script>` tags in the new content
5. `history.pushState()` to update the URL
6. `navigationStore.notify()` triggers `useActiveKey()` to re-render breadcrumbs and selected menu item
7. `document.startViewTransition()` wraps the swap on supported browsers (120 ms fade)

**Falls back to full reload for:**
- Editor pages (`post.php`, `post-new.php`, `site-editor.php`)
- Cross-origin or non-admin URLs
- Non-200 responses or non-HTML content types
- Any fetch error

### State Management

#### Sidebar (SidebarContext.tsx)
A module-level store using `useSyncExternalStore`. Manages:
- `desktopCollapsed` — persisted to `localStorage` key `wp-react-sidebar-collapsed`
- `isMobile` — derived from viewport width via `ResizeObserver`
- `mobileOpen` — drawer open state

On state change, `--sidebar-width` is set on `document.documentElement` to drive the CSS grid column instantly (no React re-render needed for the layout).

#### Theme (ThemeContext.tsx)
A module-level store. On toggle:
1. Updates in-memory `currentTheme`
2. Sets `data-theme` attribute on both roots + `<body>`
3. POSTs to `/wp-json/wp-react-ui/v1/theme` to persist in user meta

The PHP early-state script reads the stored user meta on the **next** page load and sets `data-theme` before React mounts — preventing any dark→light flash.

---

## PHP Architecture

### wp-custom-dashboard.php
The main plugin file. Registers all hooks:

| Hook | Priority | Purpose |
|---|---|---|
| `admin_init` | default | Cache invalidation on manifest mtime change |
| `activated_plugin` | — | Clear menu transient cache |
| `deactivated_plugin` | — | Clear menu transient cache |
| `after_switch_theme` | — | Clear menu transient cache |
| `admin_head` | **1** | Inline critical CSS, early-state script, asset preloads, logo preload |
| `admin_enqueue_scripts` | default | Enqueue JS/CSS, `wp_localize_script` with `wpReactUi` payload |
| `rest_api_init` | — | Register REST routes |

### class-asset-loader.php
Handles Vite manifest parsing and asset enqueueing. Key responsibilities:
- Reads `dist/.vite/manifest.json` (cached in a WordPress transient, invalidated on mtime change)
- Dev mode detection: checks if Vite dev server is running on port 5173
- Extracts the admin menu from `$GLOBALS['menu']` and `$GLOBALS['submenu']`, stripping HTML and invisible items — result cached per-user in a 1-hour transient
- Emits `<link rel="modulepreload">` for all JS chunks

### class-branding-settings.php
Adds **Settings → WP React UI Branding** in the WordPress admin. Uses the Settings API with two fields (light logo, dark logo). Logos are stored as attachment IDs. On `get_frontend_branding()`, attachment URLs are resolved and passed to `wpReactUi.branding` for the React frontend.

### class-rest-api.php
Two endpoints under `wp-react-ui/v1`:

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/menu` | `read` | Returns current menu data (for client refresh) |
| GET | `/theme` | `is_user_logged_in` | Read current theme preference |
| POST | `/theme` | `is_user_logged_in` | Save theme preference to user meta |

---

## CSS Architecture

### critical.css (inlined in `<head>`)
~160 lines, inlined as a `<style>` tag so it applies before any external CSS loads. Responsible for:
- Hiding native WordPress chrome: `#adminmenu`, `#adminmenuwrap`, `#wpadminbar`
- Setting up the CSS grid layout driven by `--sidebar-width`
- Skeleton shimmer animations on `#react-sidebar-root:not(.mounted)` and `#react-navbar-root:not(.mounted)`
- Content reveal: `#wpcontent` is `visibility: hidden; opacity: 0` until `#wpwrap.react-ready` is set

### CSS Variables
| Variable | Default | Set by |
|---|---|---|
| `--sidebar-width` | `240px` | Early-state script (from localStorage) + SidebarContext on toggle |
| `--sidebar-transition` | `0.2s ease` | critical.css |

### index.css (bundled with JS)
- Base font rules for the React roots
- CSS `:hover`/`:active` rules for interactive elements (replaces `useState` hover anti-pattern)
- View Transitions `::view-transition-old/new` keyframes

### outside.css (separate bundle entry)
Small stylesheet for tweaks to the WordPress content area (outside the React roots) — enqueued separately so it loads even before React mounts.

---

## Build System

```bash
npm run build   # tsc --noEmit + vite build
npm run dev     # vite dev server on :5173 (HMR)
npm run lint    # eslint
```

### Vite Configuration
- **Entry points:** `src/main.tsx` (app), `src/outside.css`
- **Output:** `dist/assets/[name]-[hash].[ext]` — all filenames are content-hashed
- **Manifest:** `dist/.vite/manifest.json` — PHP reads this to find hashed filenames
- **Manual chunks:** `react`, `antd`, `antd-icons` — split for better long-term caching
- **Target:** ES2020, minified with esbuild

### Bundle sizes (approximate, gzip)
| Chunk | Size |
|---|---|
| `antd` | ~188 KB |
| `antd-icons` | ~10 KB |
| `main` (app code) | ~7 KB |
| `react` | ~0.3 KB |

---

## `wpReactUi` Data Object

PHP localizes the following data into `window.wpReactUi`:

```ts
{
  menu: MenuItem[]        // Admin menu items extracted from $GLOBALS['menu']
  siteName: string        // get_bloginfo('name')
  branding: {
    siteName: string
    logos: {
      lightUrl: string | null   // Uploaded light logo URL
      darkUrl: string | null    // Uploaded dark logo URL
      defaultUrl: string        // Bundled fallback logo
    }
  }
  theme: 'light' | 'dark'     // User meta preference
  adminUrl: string             // wp-admin URL
  nonce: string                // wp_rest nonce for REST API calls
  restUrl: string              // Base REST URL
  logoutUrl: string            // wp_logout_url()
  logoutNonce: string          // log-out nonce
  assetsUrl: string            // dist/ directory URL
  user: {
    name: string               // display_name
    role: string               // comma-separated roles
  }
}
```

---

## Development Guide

### Prerequisites
- Node 18+ / npm 9+
- PHP 8.1+
- WordPress 6.x dev environment

### Local Development

```bash
# Install dependencies
npm install

# Start Vite dev server (HMR)
npm run dev
```

The asset loader auto-detects the Vite dev server on port 5173 and serves assets from it directly (hot reload works without rebuilding).

### Production Build

```bash
npm run build
```

Outputs to `dist/`. Commit the `dist/` directory or configure your deployment to run the build step.

### Type Checking

```bash
npx tsc --noEmit
```

---

## Extending

### Adding a new menu item to the sidebar
The sidebar reads directly from WordPress's native `$GLOBALS['menu']` — register menu pages with `add_menu_page()` or `add_submenu_page()` as usual. The plugin will pick them up automatically (menu transient cache will be invalidated on the next request after the cache expires, or immediately if you call `WP_React_UI_Asset_Loader::clear_menu_cache()`).

### Adding a new REST endpoint
Add routes in `includes/class-rest-api.php` inside the `register()` method. Follow the existing pattern: always set `permission_callback`.

### Adding a new React component
Place it in `src/components/`. Use Ant Design components for consistency. Access theme tokens via `theme.useToken()` from `antd`. Use `useActiveKey()` (not `getActiveKey()`) if the component needs to react to SPA navigations.

### Reacting to SPA navigations
Listen to the `wp-spa-navigate` custom DOM event:
```js
window.addEventListener('wp-spa-navigate', (e) => {
  console.log('Navigated to:', e.detail.url);
});
```

Or use the React hook inside a component:
```tsx
import { useActiveKey } from '../../utils/spaNavigate';
const activeKey = useActiveKey(); // Re-renders on every navigation
```

---

## Security

- All PHP output is escaped with `esc_html()`, `esc_url()`, `esc_attr()`
- REST endpoints use `permission_callback` — never `__return_true`
- `wp_verify_nonce()` on the manual cache-flush URL parameter
- Logo attachments are validated as images via `wp_attachment_is_image()` before saving
- JS bundle loaded as `type="module"` (deferred by default, no render blocking)

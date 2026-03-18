# WP React UI - Technical Documentation

A modern React + Ant Design replacement for WordPress admin navigation, replacing the native admin bar and sidebar with a performant, responsive SPA-like experience while maintaining full WordPress integration.

## 1. Plugin Overview

**WP React UI** transforms the WordPress admin interface by:

- **Replacing the admin bar and sidebar** with a custom React component tree (Navbar + Sidebar)
- **SPA-style navigation** that preserves React component state across page transitions without full reloads
- **Light/dark theme support** with user preference persistence via REST API and early script injection to prevent flash
- **Responsive mobile UI** with drawer-based navigation for screens < 768px
- **Custom branding** admin page to upload light/dark logo variants
- **Performance optimized** with critical CSS inlining, manifest-based caching, and WordPress transient caching for menu data

The plugin works by:
1. Injecting critical CSS synchronously to avoid layout shift
2. Mounting React into two isolated DOM roots (#react-navbar-root and #react-sidebar-root)
3. Hijacking admin links to perform client-side navigation instead of full reloads
4. Persisting sidebar state (collapsed/expanded) to localStorage
5. Storing theme preference in user meta via REST API with early-load script to sync state before React mounts

---

## 2. Directory & File Structure

```
wp-custom-dashboard/
├── wp-custom-dashboard.php          # Main plugin entry point (145 lines)
├── includes/
│   ├── class-asset-loader.php       # Vite manifest parsing, dev/prod mode detection, menu caching
│   ├── class-branding-settings.php  # Admin settings page for logo upload/management
│   ├── class-rest-api.php           # REST endpoints for menu refresh and theme persistence
│   └── critical.css                 # Inlined CSS (99 lines) — hides native chrome, sets grid layout
├── src/
│   ├── main.tsx                     # React bootstrap, DOM setup, Navbar/Sidebar mounting
│   ├── index.css                    # View transition animations, user dropdown hover effects
│   ├── outside.css                  # WordPress content area tweaks (border-radius, media UI)
│   ├── types/
│   │   └── wp.ts                    # Global Window.wpReactUi type definitions
│   ├── context/
│   │   ├── SidebarContext.tsx       # Sidebar state store (collapsed, mobile responsive)
│   │   └── ThemeContext.tsx         # Theme state store (light/dark, synced across roots)
│   ├── hooks/
│   │   └── useMenu.ts               # Menu data + DOM visibility filtering
│   ├── utils/
│   │   ├── spaNavigate.ts           # SPA navigation engine, useActiveKey hook
│   │   └── wp.ts                    # WordPress API helpers (navigate, navigateHome)
│   ├── components/
│   │   ├── ErrorBoundary.tsx        # Error boundary wrapper
│   │   ├── navbar/
│   │   │   ├── index.tsx            # Header with burger, breadcrumbs, theme toggle, user dropdown
│   │   │   └── UserDropdown.tsx     # User menu (name, role, logout)
│   │   └── sidebar/
│   │       ├── index.tsx            # Desktop Sider + mobile drawer wrapper
│   │       ├── SidebarContent.tsx   # Menu items, refresh button, bottom actions
│   │       ├── MobileDrawer.tsx     # Mobile sidebar drawer
│   │       ├── menuTransform.tsx    # Menu item array → Ant Design Menu.items structure
│   │       ├── MenuLabel.tsx        # Renders label + badge (with count)
│   │       ├── Logo.tsx             # Branding logo display
│   │       ├── BottomActions.tsx    # Sidebar footer actions
│   │       └── iconMap.tsx          # WordPress icon slug → Ant Design icon mapping
├── public/
│   └── logo.svg                     # Default fallback logo
├── dist/                            # Built Vite output (JS + CSS chunks + manifest.json)
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript root config
├── tsconfig.app.json                # TypeScript app-specific config
├── tsconfig.node.json               # TypeScript Vite config
├── package.json                     # React, Ant Design, Vite, TypeScript
├── eslint.config.js                 # ESLint configuration
└── index.html                       # Template (not used, React mounts into existing DOM)
```

---

## 3. PHP Architecture

### **wp-custom-dashboard.php** (Main Plugin File)

Orchestrates the entire plugin lifecycle:

**Initialization:**
- Requires three class files
- Calls `WP_React_UI_Branding_Settings::init()` to set up admin branding page

**Cache Management (admin_init hook):**
- Compares `.vite/manifest.json` mtime against stored option `wp_react_ui_manifest_mtime`
- Clears all transients if manifest changed (bust stale assets)
- Provides admin URL parameter `flush_react_cache` with nonce verification for manual cache clearing

**Menu Cache Invalidation (activated_plugin, deactivated_plugin, after_switch_theme):**
- Clears `wp_react_ui_menu_*` transients when plugins change or theme switches
- Ensures menu reflects current capabilities

**Admin Head (admin_head hook, priority 1):**
- Preloads Google Fonts (Inter)
- Skips JS/CSS preprocessing for editor pages (post.php, post-new.php, site-editor.php)
- Preloads Vite chunks via `WP_React_UI_Asset_Loader::get_preload_assets()`
- Inlines critical CSS inline: `<style id="wp-react-ui-critical">`
- **Early-state script:** Runs synchronously before paint to:
  - Read `localStorage.getItem("wp-react-sidebar-collapsed")`
  - Set `--sidebar-width` CSS variable immediately (0 layout shift)
  - Apply theme via `document.body.setAttribute("data-theme", theme)`
  - Read theme from `get_user_meta()` (server-known state)
- Preloads branding logo images

**Admin Enqueue Scripts (admin_enqueue_scripts hook):**
- Skips editor pages
- Calls `WP_React_UI_Asset_Loader::enqueue()` to register main JS bundle
- **Localizes data** via `wp_localize_script('wp-react-ui', 'wpReactUi', {...})`:
  - `menu`: Array of menu items with icons, counts, slugs
  - `siteName`: Blog name
  - `branding`: Logos (light, dark, default URLs)
  - `theme`: Current user's theme preference ('light' or 'dark')
  - `adminUrl`, `restUrl`, `nonce`: URLs and CSRF tokens
  - `logoutUrl`, `logoutNonce`: For user dropdown
  - `assetsUrl`: Dist directory URL
  - `user`: Current user name + roles

**REST API Registration (rest_api_init hook):**
- Calls `WP_React_UI_REST_API::register()` to set up endpoints

---

### **class-asset-loader.php** (Asset Management)

Handles Vite manifest parsing, dev/prod mode detection, and caching.

**Key Methods:**

`is_dev()`: Checks `WP_DEBUG` and attempts to connect to Vite dev server (http://localhost:5173/@vite/client). Caches result for 10s. Falls back to `false` on timeout.

`get_manifest()`: Parses `.vite/manifest.json` and caches for 1 day. Structure:
```json
{
  "src/main.tsx": {
    "file": "assets/main-CcIa4eVy.js",
    "css": ["assets/main-CcIa4eVy.css"]
  },
  "src/outside.css": {
    "file": "assets/outside-BABiTpYM.css"
  }
}
```

`get_preload_assets()`: Extracts JS and CSS URLs from manifest for `<link rel="preload">` and `<link rel="modulepreload">` tags in admin head.

`enqueue()`: Routes to either `enqueue_dev()` or `enqueue_prod()` based on `is_dev()`.

**enqueue_dev():** Loads Vite client and main entry as ES modules:
- `wp_enqueue_script('vite-client', 'http://localhost:5173/@vite/client', [], null, false)`
- `wp_enqueue_script('wp-react-ui', 'http://localhost:5173/src/main.tsx', ['vite-client'], ...)`
- Adds `type="module"` to script tags via filter

**enqueue_prod():** Loads built Vite bundle:
- Reads manifest to find hashed bundle filename
- Enqueues main JS: `assets/main-[hash].js`
- Enqueues entry CSS as separate `<link>` tags (no shadow DOM isolation)
- Enqueues `outside.css` for WordPress content area tweaks
- Adds `type="module" crossorigin` to main script tag

`get_menu_data()`: Processes WordPress `$GLOBALS['menu']` and `$GLOBALS['submenu']` arrays:
- Filters comments menu if comments are disabled
- Extracts label, count (badges), slug, icon, capability
- Caches per user ID for 1 hour as transient
- Returns array of MenuItem objects

`clear_menu_cache()`: Deletes all `wp_react_ui_menu_*` transients via SQL wildcard

`clear_cache()`: Clears manifest, dev mode, and menu caches

---

### **class-branding-settings.php** (Branding Admin Page)

Allows admins to upload light/dark logos via WordPress media library.

**Admin Page Location:** Settings → WP React UI Branding

**Database:** Stores in option `wp_react_ui_branding` as array:
```php
[
  'light_logo_id' => 12345,  // Attachment post ID
  'dark_logo_id'  => 12346
]
```

**Methods:**

`init()`: Registers hooks for settings page and media library

`register_settings()`: WordPress settings API:
- Registers option with sanitization callback
- Creates section + two fields (light/dark logo)
- Uses media picker JS

`render_page()`: Standard WordPress settings page with form

`render_logo_field()`: Renders hidden input + preview image + select/remove buttons with JS event handlers

`sanitize_settings()`: Validates attachment IDs are actual image attachments

`get_frontend_branding()`: Returns branding data for React:
```php
[
  'siteName' => 'My Site',
  'logos' => [
    'lightUrl' => 'https://example.com/logo-light.png',
    'darkUrl' => 'https://example.com/logo-dark.png',
    'defaultUrl' => 'https://example.com/dist/logo.svg'  // Fallback
  ]
]
```

**Client-side JS** (inline): Opens `wp.media()` frame on button click, updates preview, handles removal.

---

### **class-rest-api.php** (API Endpoints)

Two REST routes under `/wp-json/wp-react-ui/v1/`:

**GET /menu**
- Returns: `{ "menu": [...] }`
- Calls `WP_React_UI_Asset_Loader::get_menu_data()` (fresh or cached)
- Permission: `current_user_can('read')` (any logged-in user)
- Use: Client-side menu refresh without full page reload

**GET /theme**
- Returns: `{ "theme": "light" | "dark" }`
- Reads `get_user_meta(user_id, 'wp_react_ui_theme')`
- Permission: `is_user_logged_in()`

**POST /theme**
- Params: `{ "theme": "light" | "dark" }`
- Updates `update_user_meta(user_id, 'wp_react_ui_theme', $theme)`
- Returns: `{ "theme": "light" | "dark" }`
- Permission: `is_user_logged_in()`

---

## 4. React Architecture

### **Bootstrap (main.tsx)**

Mounting sequence:

1. **setupDOM()**: Creates two new divs if not present:
   - `#react-navbar-root` (inserted at wpwrap start)
   - `#react-sidebar-root` (inserted before #wpcontent or appended)
   - Both get `data-theme` attribute from `window.wpReactUi.theme`

2. **Providers Wrapper**: Nests providers:
   - `ThemeProvider` → `SidebarProvider` → `ThemedApp` (Ant ConfigProvider) → children

3. **mount()**: For each root:
   - Creates React root via `createRoot()`
   - Wraps in `<React.StrictMode>`, `ErrorBoundary`, and `Providers`
   - Renders component (Navbar or Sidebar)
   - Adds `.mounted` class when done

4. **Content Reveal**: Once React mounts, `#wpwrap` gets `.react-ready` class (via CSS, content `#wpcontent` opacity goes 0→1)

5. **SPA Init**: Calls `initSpaNavigation()` to hijack admin links

### **Context: SidebarContext.tsx**

**State Store** (outside React, uses `useSyncExternalStore`):

```typescript
let currentState = {
  desktopCollapsed: readPersistedCollapsed(),  // from localStorage
  isMobile: getViewportIsMobile(),
  mobileOpen: false
}
```

**Snapshot computation:**
- On desktop: `collapsed = desktopCollapsed`
- On mobile: `collapsed = !mobileOpen` (inverted logic: "mobile open" = sidebar visible)

**CSS Variable Application:**
- Writes `--sidebar-width` to document.documentElement:
  - Collapsed desktop: 64px
  - Expanded desktop: 240px
  - Mobile: 0px (drawer overlay instead)

**Persistence:**
- Reads: `localStorage.getItem("wp-react-sidebar-collapsed")`
- Writes on toggle: `localStorage.setItem("wp-react-sidebar-collapsed", String(collapsed))`
- Catches errors (private browsing mode)

**Mobile Detection:**
- Uses `window.innerWidth < 768` check
- Listens to `resize` event, debounced via `requestAnimationFrame`
- Auto-closes mobile drawer on width → desktop transition

**Hook: `useSidebar()`**
```typescript
{
  collapsed: boolean,
  toggle: () => void,
  isMobile: boolean,
  sidebarWidth: number,
  mobileOpen: boolean
}
```

---

### **Context: ThemeContext.tsx**

**Theme Store** (shared across Navbar/Sidebar roots):

```typescript
let currentTheme: Theme = window.wpReactUi?.theme ?? 'light'
```

**Listeners Pattern**: Set of functions that re-render when theme changes. Both shadow roots can trigger the change, both subscribe to updates.

**DOM Application:**
```typescript
// Apply to both roots
document.getElementById("react-navbar-root")?.setAttribute("data-theme", theme)
document.getElementById("react-sidebar-root")?.setAttribute("data-theme", theme)
document.body.setAttribute("data-theme", theme)
document.body.classList.toggle("wp-react-dark", theme === "dark")
```

**Persistence:**
- POST to `/wp-json/wp-react-ui/v1/theme` with nonce
- Updates `user_meta('wp_react_ui_theme', 'dark' | 'light')`
- Next page load reads from `get_user_meta()` and sets early-state script

**Hook: `useTheme()`**
```typescript
{
  theme: 'light' | 'dark',
  toggle: () => Promise<void>
}
```

---

### **Hook: useMenu()**

**Initial Data**: From `window.wpReactUi.menu` (localized via PHP)

**Refresh Method**: Fetches `/wp-json/wp-react-ui/v1/menu` and updates state

**DOM Visibility Filtering:**
- Checks native `#adminmenu` DOM to hide items marked `display:none` or `visibility:hidden`
- Maps slugs to WordPress menu item IDs (e.g., `"index.php"` → `#menu-dashboard`)
- Falls back to generic pattern: `#toplevel_page_{slug}`
- **Safe default**: If no matching `<li>` found, shows the item (doesn't hide unknown items)
- Returns: `{ menuItems, loading, refresh }`

**Use Case**: Custom plugins can hide menu items via CSS; this hook respects that visibility.

---

### **Component: Sidebar (sidebar/index.tsx)**

**Desktop View** (Ant `<Sider>`):
- Respects `collapsed` state from context
- Renders `SidebarContent` inside Layout.Sider
- Handles open/close of submenus

**Mobile View** (Drawer):
- Renders `MobileDrawer` (overlay)
- Closes drawer on item click (auto-toggles sidebar state)

**Menu Interaction:**
- `useActiveKey()` determines which menu item is highlighted
- `useMenu()` fetches menu data and applies DOM visibility filtering
- On item click: calls `navigate(slug)` via SPA or full page reload

**openKeys State**: Tracks which submenus are expanded
- Syncs to `activeKey` (opens parent when navigating to child)
- Allows only one parent open at a time (click new parent closes old)

---

### **Component: menuTransform.tsx**

Converts flat MenuItem array to Ant `Menu.items` structure:

```typescript
{
  key: item.slug,
  icon: <IconElement />,
  title: item.label,
  label: <MenuLabel />,
  children: [
    { key: child.slug, label: <MenuLabel /> }
  ]
}
```

**Collapsing Logic:**
- When collapsed, hides text labels, shows only icons
- Icon gets click handler to expand submenu (peek behavior)
- Badge shows count on icon

**Badge Types**: Determined by `getBadgeTypeForItem(slug)` (e.g., error badge for "Comments" if comments pending)

---

### **Component: Navbar (navbar/index.tsx)**

**Left Section:**
- **Burger button**: Toggles sidebar (calls `useSidebar().toggle()`)
- **Breadcrumb**: Dynamic based on `activeKey`:
  - Home > Settings (for top-level pages)
  - Home > Dashboard > Posts (for subpages)
  - Capitalized fallback if activeKey doesn't match menu

**Right Section:**
- **Theme toggle**: Button with bulb icon (outline when light, filled when dark)
  - Calls `useTheme().toggle()`
- **Divider**
- **User dropdown**: Shows user name, role, logout link

**Responsive:**
- Burger icon changes based on `isMobile` (hamburger on mobile, fold/unfold on desktop)
- Breadcrumb hidden on mobile

---

### **Component: UserDropdown.tsx**

Displays dropdown menu via Ant `Dropdown`:
- User avatar/icon
- Display name (from `window.wpReactUi.user.name`)
- Role(s) (from `window.wpReactUi.user.role`)
- Logout link (redirects to `window.wpReactUi.logoutUrl` with nonce)

---

### **Component: ErrorBoundary.tsx**

Class component that catches React errors:
```typescript
<ErrorBoundary name="react-navbar-root">
  <Navbar />
</ErrorBoundary>
```

Shows fallback UI: "Something went wrong in [name]."
Logs errors to console with component name.

---

## 5. Page Load Flow

### **Initial Render (Critical Path)**

```
PHP admin_head (priority 1)
├─ Output <link rel="preload"> for CSS + JS chunks
├─ Inline <style id="wp-react-ui-critical">
│  └─ Hide #adminmenu, #adminmenumain, #wpadminbar
│  └─ Grid layout: #wpwrap with --sidebar-width variable
│  └─ Hide #wpcontent (visibility: hidden, opacity: 0)
│  └─ Skeleton shimmer on sidebar/navbar
└─ Inline <script id="wp-react-ui-early-state">
   ├─ Read localStorage.getItem("wp-react-sidebar-collapsed")
   ├─ Set --sidebar-width CSS variable immediately (no layout shift)
   ├─ Read server-known theme from get_user_meta()
   ├─ Apply data-theme to document.body
   └─ Add wp-react-dark class if dark mode
   
[Browser renders HTML skeleton with critical CSS]

PHP admin_enqueue_scripts
├─ Enqueue wp-react-ui JS bundle (module type)
└─ Localize wpReactUi global object
   ├─ menu data
   ├─ theme
   ├─ branding
   └─ nonce, URLs, user info

[Browser downloads + parses JS]

React main.tsx
├─ setupDOM()
│  └─ Create #react-navbar-root and #react-sidebar-root
├─ mount(Navbar)
│  ├─ Providers wrap
│  ├─ ThemeProvider applies initial theme from wpReactUi.theme
│  ├─ SidebarProvider reads localStorage and syncs --sidebar-width
│  └─ Add .mounted class → skeleton ::before ::after hidden
├─ mount(Sidebar)
│  ├─ useMenu() fetches menu from wpReactUi.menu
│  └─ Add .mounted class
└─ #wpwrap.classList.add("react-ready")
   └─ CSS transitions: #wpcontent opacity 0→1 (visible)
   
[Content area becomes visible with no layout shift]
```

**Key Performance Points:**
1. **Critical CSS inlined** → no render-blocking external CSS
2. **--sidebar-width set before paint** → grid layout finalized, no jank
3. **Theme + sidebar state synced early** → no flash/flicker
4. **Content hidden until React ready** → no unstyled content flash

---

## 6. SPA Navigation

### **spaNavigate.ts**

**Navigation Store** (reactive for React):
```typescript
const navigationStore = {
  getSnapshot(): string | undefined,
  subscribe(fn: Listener): () => void,
  notify(url: string)
}
```

**useActiveKey()** Hook:
```typescript
export function useActiveKey(): string | undefined
```
Returns current page key, reactive to SPA navigations. Extracts from:
1. URL `?page=` query param
2. Last pathname segment (e.g., `/wp-admin/options.php` → `options`)

**spaNavigate(url) Function:**

Conditions to fallback to full reload:
- ❌ Non-admin URL (cross-origin)
- ❌ Editor pages: `post.php`, `post-new.php`, `site-editor.php`
- ❌ Fetch fails or non-HTML response
- ❌ No `#wpcontent` found in parsed HTML

If conditions met:
1. Fetch page HTML via `fetch(url, credentials: 'same-origin')`
2. Parse HTML with `DOMParser`
3. Extract `#wpcontent` and `#wpfooter` from fetched doc
4. Replace DOM: `oldContent.innerHTML = newContent.innerHTML`
5. Re-execute inline `<script>` tags in new content (important for WP functionality)
6. Scroll content area to top
7. Update page title from fetched doc
8. Push history: `window.history.pushState({ spa: true }, "", url)`
9. Notify React: `navigationStore.notify(url)` (updates `useActiveKey()`)
10. Dispatch custom event: `window.dispatchEvent(new CustomEvent("wp-spa-navigate", ...))`
11. Optionally use View Transitions API if available

**Click Delegation** (handleContentClick):
- Listens to clicks on `#wpcontent`
- Ignores modified clicks (ctrl+click, shift+click, new tab)
- Ignores `target="_blank"`, `download` attributes, `#` anchors, `javascript:` URLs
- Intercepts same-origin admin links, calls `spaNavigate()`

**Popstate** (back/forward buttons):
- Listens to `popstate` event
- Calls `spaNavigate(location.href)`

---

## 7. State Persistence

### **Sidebar Collapsed State**

**Storage**: Browser localStorage (key: `"wp-react-sidebar-collapsed"`)

**Flow:**
1. **First load**: `readPersistedCollapsed()` reads localStorage, defaulting to `false` (expanded)
2. **User toggles**: `sidebarStore.toggle()` flips state
3. **Persist**: `persistCollapsed(state)` writes to localStorage
4. **CSS variable**: `--sidebar-width` updated immediately via `applyCssVar()`
5. **React re-render**: `useSyncExternalStore()` triggers re-render in Sidebar component
6. **Survives**: SPA navigations (state stays in store), page reloads

**Error handling**: Catches `localStorage.setItem()` errors (private browsing, quota exceeded) and silently ignores.

---

### **Theme Preference**

**Storage**: WordPress user meta (key: `'wp_react_ui_theme'`, value: `'light'` | `'dark'`)

**Flow:**
1. **Server render**: PHP `admin_head` reads `get_user_meta()` and sets early-state script
2. **Early-state**: Applies theme before React mounts (no flash)
3. **React mount**: `ThemeProvider` reads `window.wpReactUi.theme` (matches server value)
4. **User toggles**: `toggle()` in ThemeContext
   - Updates `currentTheme` immediately
   - Applies to DOM via `applyThemeToDOM()`
   - POST to `/wp-json/wp-react-ui/v1/theme` with nonce
5. **Persistence**: Server stores in `user_meta`
6. **Next load**: Server-rendered early-state applies saved theme
7. **Survives**: Page reloads, SPA navigations, across browsers (stored server-side)

---

## 8. Caching Strategy

### **WordPress Transients**

Used for expensive computations with varying TTLs:

| Transient | Key Pattern | TTL | Invalidation |
|-----------|-------------|-----|--------------|
| Manifest | `wp_react_ui_manifest` | 1 day | manifest mtime change, manual flush |
| Dev mode | `wp_react_ui_is_dev` | 10s | checks Vite server every 10s |
| Menu | `wp_react_ui_menu_{user_id}` | 1 hour | plugin activate/deactivate, theme switch, manual flush |

### **Client-side Caching**

**localStorage**:
- `wp-react-sidebar-collapsed`: Sidebar state (no TTL, persistent)
- No versioning or cache busting needed (simple boolean)

### **Manifest-based Asset Busting**

**Vite generates**:
- `.vite/manifest.json` with hash-based filenames: `main-CcIa4eVy.js`, `antd-xYz123.js`
- Plugin detects manifest mtime changes:
  ```php
  if (filemtime($manifest) !== (int)get_option('wp_react_ui_manifest_mtime')) {
    // Assets changed, bust transients
    WP_React_UI_Asset_Loader::clear_cache();
  }
  ```
- Browser caches bundles indefinitely (hash in filename = unique URL)

### **Manual Cache Clear**

Admin URL: `?flush_react_cache=1&_wpnonce={nonce}`
- Verifies nonce
- Calls `WP_React_UI_Asset_Loader::clear_cache()`
- Redirects to admin home

---

## 9. Branding Settings

### **Admin Page UI**

Location: **Settings → WP React UI Branding**

Two fields:
1. **Light logo**: Required (fallback to default if empty in frontend)
2. **Dark logo**: Optional (falls back to light logo in dark mode)

**Interaction:**
- Buttons: "Select image", "Remove image"
- Opens WP media library modal
- Shows preview below input
- Sanitizes: Only allows image attachments
- Stores attachment IDs in option

### **Frontend Integration**

Logos passed via `wp_localize_script()`:
```javascript
window.wpReactUi.branding = {
  siteName: "My Site",
  logos: {
    lightUrl: "https://...",
    darkUrl: "https://..." || null,
    defaultUrl: "https://.../dist/logo.svg"
  }
}
```

**Logo.tsx** component logic:
```typescript
const logoUrl = theme === 'dark' && branding.logos.darkUrl
  ? branding.logos.darkUrl
  : branding.logos.lightUrl || branding.logos.defaultUrl
```

**Preload**: Admin head preloads the expected logo (based on server-known theme) via `<link rel="preload">`.

---

## 10. Build System

### **Vite Configuration (vite.config.ts)**

**Inputs**: Two entry points:
- `src/main.tsx`: React app (JS + CSS chunks)
- `src/outside.css`: WordPress content area tweaks (CSS only)

**Outputs** (hashed filenames):
```
dist/
├── assets/
│   ├── main-CcIa4eVy.js          # Main bundle
│   ├── main-CcIa4eVy.css         # Main CSS
│   ├── react-xyz.js              # React chunk
│   ├── antd-xyz.js               # Ant Design + icons chunk
│   ├── outside-BABiTpYM.css      # Outside CSS
│   └── ...other chunks
└── .vite/
    └── manifest.json             # Maps entry names to filenames
```

**Manual Chunks** (`rollupOptions.output.manualChunks`):
- `react` chunk: `node_modules/react` + scheduler
- `antd` chunk: `node_modules/antd` + `@ant-design/*` + `rc-*` components
- `antd-icons` chunk: `@ant-design/icons`
- Other deps: auto-chunked by Vite

**Benefits:**
- React + Ant rarely change → can be cached across builds
- Main chunk stays small
- Better code splitting for faster loads

**Build Target**: `es2020` (modern browsers, async/await, nullish coalescing, etc.)

**Minification**: esbuild (minify both JS and CSS)

---

### **TypeScript Configuration**

**tsconfig.json**: Root that references app and node configs

**tsconfig.app.json**:
- Target: `ES2023`
- Module: `ESNext` (Vite handles bundling)
- JSX: `react-jsx` (automatic JSX transform)
- Strict mode enabled
- No unused locals/params allowed
- Types: `vite/client` for Vite-specific globals

**tsconfig.node.json**: For Vite config + build scripts

---

## 11. Key WordPress Hooks Used

| Hook | Priority | Purpose |
|------|----------|---------|
| `admin_init` | default | Cache mtime check, manual cache flush nonce verification |
| `activated_plugin` | default | Clear menu transients on plugin activate |
| `deactivated_plugin` | default | Clear menu transients on plugin deactivate |
| `after_switch_theme` | default | Clear menu transients on theme switch |
| `admin_head` | 1 (early) | Inject critical CSS, early-state script, preload assets |
| `admin_enqueue_scripts` | default | Enqueue main JS + CSS bundles, localize data |
| `rest_api_init` | default | Register REST endpoints (/menu, /theme) |
| `wp_enqueue_scripts` | (N/A) | Not used — only admin area |
| `script_loader_tag` | 10 | Add `type="module"` and `crossorigin` to script tags |
| `admin_init` (settings) | default | Register branding settings page + fields |
| `admin_menu` | default | Add branding page to Settings menu |
| `admin_enqueue_scripts` (branding) | conditional | Enqueue `wp_enqueue_media()` for media picker |

---

## 12. CSS Architecture

### **critical.css** (99 lines, inlined in `<style>` tag)

**Purpose**: Block render until this CSS loads (FOUC prevention) + layout foundation

**Contents**:
- Hide native WordPress chrome: `#adminmenuback`, `#adminmenuwrap`, `#wpadminbar` → `display: none !important`
- Grid layout on `#wpwrap`:
  ```css
  grid-template-columns: var(--sidebar-width, 240px) 1fr;
  grid-template-rows: 64px 1fr;
  grid-template-areas: "sidebar navbar" "sidebar content";
  ```
- CSS variable `--sidebar-width` (set by early-state script before paint)
- `#wpcontent` and `#wpfooter` initially hidden (`visibility: hidden; opacity: 0`)
- Skeleton shimmer animation on navbar/sidebar while unmounted (::before and ::after pseudo-elements)
- Reveal content once React ready: `.react-ready #wpcontent { opacity: 1; visibility: visible; }`

**Result**: 
- No layout shift (grid defined before React mounts)
- No FOUC (critical CSS inlined)
- Skeleton feedback (shimmer) while loading
- Smooth content reveal (0.08s opacity transition)

---

### **index.css** (Global styles loaded via `<link>`)

**Contents**:
- Font family on React roots
- Hover/active states for user dropdown trigger
- View Transitions API fade animations for SPA navigation:
  ```css
  ::view-transition-old(root) {
    animation: wp-spa-fade-out 120ms ease-out;
  }
  ::view-transition-new(root) {
    animation: wp-spa-fade-in 120ms ease-in;
  }
  ```

---

### **outside.css** (WordPress content area tweaks)

Styles applied to `#wpcontent` area to match modern design:
- `.wp-list-table`: `border-radius: 8px`, `overflow: hidden`
- `.media-toolbar`, `.media-toolbar-secondary`: Rounded corners, padding
- `.attachment`, `.attachment-preview`: Rounded corners
- `#drag-drop-area`: `border-radius: 8px`
- `#wpbody`: `padding-top: 0` (remove padding)
- Fixes for WordPress blocks editor skeleton

---

### **CSS Variables**

**Root-level** (set by early-state script):
```css
--sidebar-width: 240px | 64px | 0px
--sidebar-transition: 0.2s ease
```

**Usage**:
- Grid column: `grid-template-columns: var(--sidebar-width) 1fr`
- Sidebar width: Ant's `<Sider width={240} collapsedWidth={64} />`
- Transition: `transition: grid-template-columns var(--sidebar-transition)`

---

## Architecture Decisions

### **Why Two Shadow Roots (Navbar + Sidebar)?**
- Namespace isolation: Navbar and Sidebar CSS don't conflict
- Independent mounting: Can update one without remounting the other
- Shared state: Context stores (SidebarContext, ThemeContext) still sync across roots via external stores
- Future: Can refresh/update roots independently if needed

### **Why Early-State Script?**
- Zero layout shift: CSS variable set before browser calculates layout
- No flash: Theme applied before React mounts
- No state loss: Sidebar state restored from localStorage immediately
- Performance: 2 inline scripts vs. waiting for JS to parse and execute

### **Why SPA Navigation?**
- Menu state persists: React components stay alive across navigations
- No flicker: Only content area updates, navbar/sidebar unchanged
- User experience: Feels like modern SPA, not traditional page reloads
- Graceful degradation: Falls back to full reload for editor pages or on fetch failure

### **Why External Store Pattern?**
- `useSyncExternalStore()` syncs React to non-React state changes
- Sidebar state persists to localStorage (survives component unmount)
- Theme state shared across two roots without prop drilling
- Reduces re-renders: Only components using context re-render on change

### **Why Manifest-based Asset Busting?**
- Vite generates unique hashes for every build
- Manifest file is small (JSON metadata only)
- mtime check is fast (one file stat)
- No query params needed (hash in filename = immutable URL)

---

## Development

### **Local Development**

```bash
npm install
npm run dev  # Vite dev server on http://localhost:5173
```

**Plugin enqueues** `http://localhost:5173/src/main.tsx` as ES module when `WP_DEBUG` is true and Vite responds.

### **Production Build**

```bash
npm run build  # tsc -b && vite build
```

Generates:
- `dist/assets/*.js` (hashed)
- `dist/assets/*.css` (hashed)
- `dist/.vite/manifest.json`
- `dist/logo.svg` (default logo)

### **Linting**

```bash
npm run lint  # ESLint with React hooks plugin
```

### **TypeScript**

```bash
tsc -b  # Build TypeScript (part of npm run build)
```

---

## Browser Support

- **Modern browsers** (ES2020+): Chrome, Firefox, Safari, Edge (all recent)
- **No IE11 support**: Uses optional chaining, nullish coalescing, Promise, async/await, View Transitions API (progressive enhancement)
- **Mobile**: Responsive at 768px breakpoint (drawer-based nav on small screens)
- **Dark mode**: CSS-based (`data-theme` attribute), CSS variables for colors via Ant Design tokens

---

## Security

- **Nonces**: REST API and cache-flush verify WordPress nonces
- **Capabilities**: Menu items check user capabilities; REST endpoints verify `current_user_can()`
- **Sanitization**: Branding settings sanitize attachment IDs; option is array of integers
- **XSS prevention**: React escapes by default; PHP uses `esc_*()` functions
- **CSRF protection**: Fetch requests include `X-WP-Nonce` header
- **Content-Type validation**: SPA navigation checks response header is `text/html`

---

## Testing Checklist

- [ ] Menu renders with correct items (check visibility against native `#adminmenu`)
- [ ] Sidebar toggles collapsed/expanded (check localStorage)
- [ ] Theme toggle saves to user meta (check database)
- [ ] SPA navigation works (check history, activeKey, menu highlight)
- [ ] Mobile drawer opens/closes (test at 768px breakpoint)
- [ ] Editor pages full-reload (post.php, site-editor.php)
- [ ] Early-state script prevents layout shift (disable JS, check grid)
- [ ] Skeleton shimmer visible while React loading
- [ ] Content reveal smooth (no flicker, opacity transition)
- [ ] Branding logo uploads (check media library integration)
- [ ] Cache invalidation on plugin activate/deactivate
- [ ] Dark mode logo fallback (no dark logo → use light logo)
- [ ] Logout nonce verification works
- [ ] Error boundary catches React errors gracefully


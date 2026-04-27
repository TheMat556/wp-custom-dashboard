# WP React UI

> A WordPress admin shell that replaces the native sidebar and top bar with a React + Ant Design interface while rendering real admin pages inside an iframe.

[![WordPress](https://img.shields.io/badge/WordPress-5.0%2B-blue)](https://wordpress.org)
[![PHP](https://img.shields.io/badge/PHP-8.0%2B-777bb4)](https://php.net)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-GPL--2.0%2B-green)](https://www.gnu.org/licenses/gpl-2.0.html)

---

## Overview

WP React UI is a WordPress plugin that enhances the admin experience by wrapping native admin pages in a modern React shell. Admin screens load inside an iframe with a persistent sidebar, top navbar, and theme support — no need to rewrite any WordPress admin screens or break plugin compatibility.

### Key Features

- **React 19 + Ant Design 6** — Modern component library with professional UI patterns
- **Light / Dark theme** — Persisted via localStorage and user meta
- **Responsive design** — Collapsible sidebar, mobile drawer at 768px breakpoint
- **Branding support** — Configurable logos (light/dark) via Settings
- **Full admin compatibility** — Every plugin's admin page works unmodified inside the iframe
- **Fallback to native** — Graceful degradation if the shell bundle fails to load

## Requirements

| Requirement | Minimum      |
|------------|--------------|
| WordPress  | 5.0+         |
| PHP        | 8.0+         |
| Node.js    | 20+ (dev)    |
| Bun        | 1.0+ (dev)   |

## Quick Start

```bash
# Clone the plugin into wp-content/plugins/
cd wp-content/plugins/
git clone https://github.com/your-org/wp-custom-dashboard.git

# Enter the plugin directory
cd wp-custom-dashboard

# Install PHP dependencies
composer install

# Install JavaScript dependencies
bun install

# Build for production
bun run build

# Activate the plugin
wp plugin activate wp-custom-dashboard
```

## Development

```bash
# Start Vite dev server with HMR on :5173
bun run dev

# Full verification (lint + test + build + PHP lint)
bun run verify

# TypeScript type checking + production build
bun run build

# Run tests
bun run test              # Unit tests
bun run test:coverage     # With coverage report
bun run test:watch        # Watch mode

# Lint and format
bun run lint              # Check for issues
bun run lint:fix          # Auto-fix
bun run format            # Format code

# PHP
composer run lint         # PHP linting
composer run test         # PHP unit tests

# Contracts
bun run contracts:generate   # Generate PHP/TS contract types
bun run contracts:verify     # Verify contract integrity

# Release packaging
bun run package:plugin       # Stage and zip deployable artifact
```

## Architecture

### How it works

The plugin mounts a **single React root** (`#react-shell-root`) containing the sidebar, top navbar, and an iframe content area. Admin pages load inside the iframe with a `wp_shell_embed=1` query parameter. In embed mode, PHP strips native admin chrome and injects a `postMessage` bridge so the shell can react to title changes, navigation events, and session expiry.

```
#wpwrap
├── #react-shell-root   → React shell (sidebar + navbar + iframe)
├── #wpcontent           → Rendered by WordPress, hidden from view
└── #wpfooter            → Rendered by WordPress, hidden from view
```

### Boot sequence

1. **PHP inlines critical CSS** and an early-state script in `admin_head` — restores theme and sidebar width before first paint
2. **React mounts** — `main.tsx` bootstraps all stores and renders the shell
3. **iframe loads** — Content area navigates to the current admin URL with `?wp_shell_embed=1`
4. **postMessage bridge** — Embedded page communicates title changes, navigation requests, and session state

### Source of truth

| Concern | Source |
|---------|--------|
| Menu structure | PHP (`$menu` / `$submenu`) → localized `window.wpReactUi` |
| Navigation state | `navigationStore` (Zustand) |
| Theme preference | `themeStore` (localStorage + user-meta) |
| Boot config | `window.wpReactUi` (immutable, not runtime) |

### Project structure

```
wp-custom-dashboard/
├── wp-custom-dashboard.php   # Plugin entrypoint
├── app/                      # PHP classes (PSR-4, WpReactUi\ namespace)
│   ├── Branding/
│   ├── Dashboard/
│   ├── Rest/
│   └── WordPress/
├── includes/                 # Legacy class-prefixed PHP loaders
├── src/                      # TypeScript/React source
│   ├── main.tsx              # Application entry
│   ├── features/             # Feature modules (branding, dashboard, navigation, shell)
│   ├── store/                # Zustand vanilla stores
│   ├── components/           # Shared React components
│   └── utils/                # Utilities (i18n, types, navigation)
├── contracts/                # PHP/TypeScript contract definitions
│   ├── source/               # Author-edited manifests and schemas
│   └── php/                  # Generated PHP contracts
├── scripts/                  # Build and verification scripts
├── tests/                    # PHP and JavaScript tests
├── public/                   # Static assets (icons, favicon)
└── dist/                     # Built bundle (gitignored)
```

## Documentation

- [Architecture Decisions](ARCHITECTURE.md) — Design rationale, tradeoffs, and implementation notes
- [AGENTS.md](AGENTS.md) — Development workflow, commands, and conventions for AI-assisted coding

## Deployment

```bash
# Run the full verification gate
bun run verify

# Package the plugin for deployment
bun run package:plugin

# Verify the packaged artifact
bun run verify:artifact

# After deploying, hard-refresh wp-admin for new hashed assets
```

### Post-deploy smoke test

- Dashboard loads correctly
- Breadcrumb navigation works
- Browser back/forward navigation
- Sidebar collapse and mobile drawer
- Theme toggle (light/dark)
- Profile dropdown and logout
- Breakout screens (e.g., `post.php`)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Write tests for your changes
4. Run `bun run verify` to ensure everything passes
5. Submit a pull request

## License

GPL-2.0-or-later — see [LICENSE](LICENSE) for details.

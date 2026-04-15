# Feature-Sliced Design (FSD) Guidelines

This project follows **Feature-Sliced Design (FSD)** principles to maintain clear module boundaries and enable scalable feature development.

## Cross-Feature Import Rules

### ✅ Allowed
```typescript
// Import from feature barrel (public API only)
import { useLicense, LicenseProvider } from "../../../license";
import { SessionExpiredModal } from "../../../session";
```

### ❌ Forbidden
```typescript
// Direct internal path imports
import { useLicense } from "../../../license/context/LicenseContext";       // ❌
import { sessionStore } from "../../../session/store/sessionStore";        // ❌
import { LicensePayloadBuilder } from "../../../license/services/...";     // ❌
```

## Enforcement

1. **TypeScript**: All exports from feature `index.ts` files define the public API. The TypeScript compiler validates imports syntactically.

2. **Linting**: While Biome doesn't have a built-in restrictedImports rule, violations are caught by:
   - Import auto-completion in IDEs showing only barrel exports
   - Code review processes catching deep imports
   - Manual audits: `grep -rn "from \.\..*features.*\(context\|store\|services\)" src/features`

3. **Code Review**: PRs must be reviewed to ensure no deep feature imports are introduced.

## Feature Index Files

Each feature folder has an `index.ts` barrel file that exports only the symbols consumed by other features:

- `src/features/license/index.ts` — License context, hooks, provider
- `src/features/session/index.ts` — Session hooks, components, store
- `src/features/chat/index.ts` — Chat page, hooks, components
- `src/features/shell/index.ts` — App shell, bootstrap, context
- `src/features/dashboard/index.ts` — Dashboard page, hooks, view model
- `src/features/branding/index.ts` — Branding settings, store
- `src/features/activity/index.ts` — Activity log panel, store
- `src/features/navigation/index.ts` — Navigation hooks, stores

## Adding New Exports

When adding a new symbol that other features need:

1. Implement the symbol in its feature folder (e.g., `license/services/MyService.ts`)
2. Add an export to the feature's `index.ts` barrel
3. Update cross-feature imports to use the barrel

## Internal Restructuring

The benefit of FSD barrel exports: you can reorganize a feature's internal structure (rename files, move hooks, refactor services) without breaking external consumers, because they import from the stable barrel, not internal paths.

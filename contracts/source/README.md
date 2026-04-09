# Contracts Source

`contracts/source/` is the only author-edited source of truth for cross-boundary contracts between PHP and TypeScript.

Rules:

- Edit manifests in `contracts/source/manifests/` for routes, permissions, and feature flags.
- Edit schemas in `contracts/source/schemas/` for boot payloads and REST DTOs.
- Do not hand-edit generated projections in `app/Contracts/Generated/` or `src/generated/contracts/`.
- Do not treat `src/types/wp.ts` as the source of truth. It is a compatibility layer only.
- Regenerate projections with `node scripts/generate-contracts.mjs`.
- Verify generated projections with `node scripts/verify-generated-contracts.mjs`.

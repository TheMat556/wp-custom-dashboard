// Branding feature public API
// NOTE: BrandingSettings is intentionally NOT re-exported here so the
// `lazy(() => import(".../BrandingSettings"))` in the shell route controller
// stays in its own chunk. Re-exporting would force it into the main chunk.
export type { BrandingStoreState } from "./store/brandingStore";
export { bootstrapBrandingStore, brandingStore, resetBrandingStore } from "./store/brandingStore";

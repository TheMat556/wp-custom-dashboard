// AUTO-GENERATED from contracts/source. Do not edit.

export const FEATURE_FLAGS = {
  dashboard: {
    default: true,
    description: "Dashboard data and widgets.",
  },
  brandingSettings: {
    default: true,
    description: "Branding settings UI and transport.",
  },
  activityLog: {
    default: true,
    description: "Activity log transport and admin UI.",
  },
  menuCounts: {
    default: true,
    description: "Menu badge count refresh endpoint.",
  },
  preferencesSync: {
    default: true,
    description: "Shell preference sync transport.",
  },
  shellRoutes: {
    default: true,
    description: "Plugin-provided shell route registration.",
  },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  dashboard: true,
  brandingSettings: true,
  activityLog: true,
  menuCounts: true,
  preferencesSync: true,
  shellRoutes: true,
};

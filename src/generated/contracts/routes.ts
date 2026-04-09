// AUTO-GENERATED from contracts/source. Do not edit.

export const REST_NAMESPACE = "wp-react-ui/v1" as const;

export const REST_ROUTE_CONTRACTS = {
  "/menu": {
    "name": "menu",
    "methods": [
      "GET"
    ],
    "permission": "read",
    "featureFlag": null,
    "requestSchema": null,
    "requestKeys": [],
    "responseSchema": "dto/menu.response",
    "responseKeys": [
      "menu"
    ]
  },
  "/theme": {
    "name": "theme",
    "methods": [
      "GET",
      "POST"
    ],
    "permission": "authenticated",
    "featureFlag": null,
    "requestSchema": "dto/theme.request",
    "requestKeys": [
      "theme"
    ],
    "responseSchema": "dto/theme.response",
    "responseKeys": [
      "theme"
    ]
  },
  "/branding": {
    "name": "branding",
    "methods": [
      "GET",
      "POST"
    ],
    "permission": "manage_options",
    "featureFlag": "brandingSettings",
    "requestSchema": "dto/branding.request",
    "requestKeys": [
      "lightLogoId",
      "darkLogoId",
      "longLogoId",
      "useLongLogo",
      "primaryColor",
      "fontPreset",
      "openInNewTabPatterns"
    ],
    "responseSchema": "dto/branding.response",
    "responseKeys": [
      "lightLogoId",
      "lightLogoUrl",
      "darkLogoId",
      "darkLogoUrl",
      "longLogoId",
      "longLogoUrl",
      "useLongLogo",
      "primaryColor",
      "fontPreset",
      "openInNewTabPatterns"
    ]
  },
  "/preferences": {
    "name": "preferences",
    "methods": [
      "GET",
      "POST"
    ],
    "permission": "authenticated",
    "featureFlag": "preferencesSync",
    "requestSchema": "dto/preferences.request",
    "requestKeys": [
      "favorites",
      "recentPages",
      "density",
      "themePreset",
      "customPresetColor",
      "dashboardWidgetOrder",
      "hiddenWidgets",
      "highContrast",
      "sidebarCollapsed"
    ],
    "responseSchema": "dto/preferences.response",
    "responseKeys": [
      "preferences"
    ]
  },
  "/menu-counts": {
    "name": "menuCounts",
    "methods": [
      "GET"
    ],
    "permission": "read",
    "featureFlag": "menuCounts",
    "requestSchema": null,
    "requestKeys": [],
    "responseSchema": "dto/menu-counts.response",
    "responseKeys": [
      "counts"
    ]
  },
  "/dashboard": {
    "name": "dashboard",
    "methods": [
      "GET"
    ],
    "permission": "read",
    "featureFlag": "dashboard",
    "requestSchema": null,
    "requestKeys": [],
    "responseSchema": "dto/dashboard.response",
    "responseKeys": [
      "atAGlance",
      "siteHealth",
      "pendingUpdates",
      "visitorTrend",
      "countryStats",
      "siteSpeed",
      "pagesOverview",
      "actionItems",
      "seoOverview",
      "seoBasics",
      "legalCompliance",
      "businessFunctions",
      "onboardingChecklist",
      "siteReadinessScore",
      "calendarPreview"
    ]
  },
  "/activity": {
    "name": "activity",
    "methods": [
      "GET"
    ],
    "permission": "manage_options",
    "featureFlag": "activityLog",
    "requestSchema": "dto/activity.query",
    "requestKeys": [
      "page",
      "perPage",
      "userId",
      "action"
    ],
    "responseSchema": "dto/activity.response",
    "responseKeys": [
      "entries",
      "total",
      "page",
      "perPage"
    ]
  }
} as const;

export type PluginRestPath = keyof typeof REST_ROUTE_CONTRACTS;

export const PLUGIN_ROUTE_PATHS = {
  "menu": "/menu",
  "theme": "/theme",
  "branding": "/branding",
  "preferences": "/preferences",
  "menuCounts": "/menu-counts",
  "dashboard": "/dashboard",
  "activity": "/activity"
} as const satisfies Record<string, PluginRestPath>;

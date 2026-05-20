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
  "/chat-settings": {
    "name": "chatSettings",
    "methods": [
      "GET",
      "POST"
    ],
    "permission": "manage_options",
    "featureFlag": null,
    "requestSchema": "dto/chat-settings.request",
    "requestKeys": [],
    "responseSchema": "dto/chat-settings.response",
    "responseKeys": []
  },
  "/chat/bootstrap": {
    "name": "chatBootstrap",
    "methods": [
      "POST"
    ],
    "permission": "read",
    "featureFlag": null,
    "requestSchema": "dto/chat.bootstrap.request",
    "requestKeys": [
      "selectedThreadId"
    ],
    "responseSchema": "dto/chat.bootstrap.response",
    "responseKeys": [
      "role",
      "threads",
      "selectedThreadId",
      "messages",
      "pollIntervalSeconds"
    ]
  },
  "/chat/poll": {
    "name": "chatPoll",
    "methods": [
      "POST"
    ],
    "permission": "read",
    "featureFlag": null,
    "requestSchema": "dto/chat.poll.request",
    "requestKeys": [
      "selectedThreadId",
      "afterMessageId"
    ],
    "responseSchema": "dto/chat.poll.response",
    "responseKeys": [
      "role",
      "threads",
      "selectedThreadId",
      "messages",
      "pollIntervalSeconds"
    ]
  },
  "/chat/send": {
    "name": "chatSend",
    "methods": [
      "POST"
    ],
    "permission": "read",
    "featureFlag": null,
    "requestSchema": "dto/chat.send.request",
    "requestKeys": [
      "selectedThreadId",
      "message"
    ],
    "responseSchema": "dto/chat.send.response",
    "responseKeys": [
      "role",
      "thread",
      "message"
    ]
  },
  "/chat/archive": {
    "name": "chatArchive",
    "methods": [
      "POST"
    ],
    "permission": "manage_options",
    "featureFlag": null,
    "requestSchema": "dto/chat.thread-action.request",
    "requestKeys": [
      "selectedThreadId"
    ],
    "responseSchema": "dto/chat.bootstrap.response",
    "responseKeys": [
      "role",
      "threads",
      "selectedThreadId",
      "messages",
      "pollIntervalSeconds"
    ]
  },
  "/chat/unarchive": {
    "name": "chatUnarchive",
    "methods": [
      "POST"
    ],
    "permission": "manage_options",
    "featureFlag": null,
    "requestSchema": "dto/chat.thread-action.request",
    "requestKeys": [
      "selectedThreadId"
    ],
    "responseSchema": "dto/chat.bootstrap.response",
    "responseKeys": [
      "role",
      "threads",
      "selectedThreadId",
      "messages",
      "pollIntervalSeconds"
    ]
  },
  "/chat/delete": {
    "name": "chatDelete",
    "methods": [
      "POST"
    ],
    "permission": "manage_options",
    "featureFlag": null,
    "requestSchema": "dto/chat.thread-action.request",
    "requestKeys": [
      "selectedThreadId"
    ],
    "responseSchema": "dto/chat.bootstrap.response",
    "responseKeys": [
      "role",
      "threads",
      "selectedThreadId",
      "messages",
      "pollIntervalSeconds"
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
  },
  "/license": {
    "name": "license",
    "methods": [
      "GET"
    ],
    "permission": "manage_options",
    "featureFlag": null,
    "requestSchema": null,
    "requestKeys": [],
    "responseSchema": "dto/license.response",
    "responseKeys": [
      "status",
      "role",
      "tier",
      "expiresAt",
      "features",
      "graceDaysRemaining",
      "hasKey",
      "keyPrefix",
      "serverConfigured"
    ]
  },
  "/license/settings": {
    "name": "licenseSettings",
    "methods": [
      "GET",
      "POST"
    ],
    "permission": "manage_options",
    "featureFlag": null,
    "requestSchema": "dto/license.settings.request",
    "requestKeys": [
      "serverUrl"
    ],
    "responseSchema": "dto/license.settings.response",
    "responseKeys": [
      "serverUrl",
      "serverConfigured",
      "storedLicenseKey"
    ]
  },
  "/license/activate": {
    "name": "licenseActivate",
    "methods": [
      "POST"
    ],
    "permission": "manage_options",
    "featureFlag": null,
    "requestSchema": "dto/license.activate.request",
    "requestKeys": [
      "licenseKey"
    ],
    "responseSchema": "dto/license.response",
    "responseKeys": [
      "status",
      "role",
      "tier",
      "expiresAt",
      "features",
      "graceDaysRemaining",
      "hasKey",
      "keyPrefix",
      "serverConfigured"
    ]
  },
  "/license/deactivate": {
    "name": "licenseDeactivate",
    "methods": [
      "POST"
    ],
    "permission": "manage_options",
    "featureFlag": null,
    "requestSchema": null,
    "requestKeys": [],
    "responseSchema": "dto/license.response",
    "responseKeys": [
      "status",
      "role",
      "tier",
      "expiresAt",
      "features",
      "graceDaysRemaining",
      "hasKey",
      "keyPrefix",
      "serverConfigured"
    ]
  },
  "/license-webhook": {
    "name": "licenseWebhook",
    "methods": [
      "POST"
    ],
    "permission": "public",
    "featureFlag": null,
    "requestSchema": null,
    "requestKeys": [],
    "responseSchema": "dto/license-webhook.response",
    "responseKeys": [
      "status",
      "event"
    ]
  }
} as const;

export type PluginRestPath = keyof typeof REST_ROUTE_CONTRACTS;

export const PLUGIN_ROUTE_PATHS = {
  "menu": "/menu",
  "theme": "/theme",
  "branding": "/branding",
  "chatSettings": "/chat-settings",
  "chatBootstrap": "/chat/bootstrap",
  "chatPoll": "/chat/poll",
  "chatSend": "/chat/send",
  "chatArchive": "/chat/archive",
  "chatUnarchive": "/chat/unarchive",
  "chatDelete": "/chat/delete",
  "preferences": "/preferences",
  "menuCounts": "/menu-counts",
  "dashboard": "/dashboard",
  "activity": "/activity",
  "license": "/license",
  "licenseSettings": "/license/settings",
  "licenseActivate": "/license/activate",
  "licenseDeactivate": "/license/deactivate",
  "licenseWebhook": "/license-webhook"
} as const satisfies Record<string, PluginRestPath>;

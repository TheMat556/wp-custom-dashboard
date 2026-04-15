// AUTO-GENERATED from contracts/source. Do not edit.

export interface ActivityQuery {
  page?: number;
  perPage?: number;
  userId?: number;
  action?: string;
}

export interface ActivityResponse {
  entries: Array<Record<string, unknown>>;
  total: number;
  page: number;
  perPage: number;
}

export interface BrandingRequest {
  lightLogoId: number;
  darkLogoId: number;
  longLogoId: number;
  useLongLogo: boolean;
  primaryColor: string;
  fontPreset: string;
  openInNewTabPatterns: Array<string>;
}

export interface BrandingResponse {
  lightLogoId: number;
  lightLogoUrl: string | null;
  darkLogoId: number;
  darkLogoUrl: string | null;
  longLogoId: number;
  longLogoUrl: string | null;
  useLongLogo: boolean;
  primaryColor: string;
  fontPreset: string;
  openInNewTabPatterns: Array<string>;
}

export interface ChatBootstrapRequest {
  selectedThreadId?: number | null;
}

export interface ChatBootstrapResponse {
  role: "owner" | "customer";
  threads: Array<{
    id: number;
    domain: string;
    customerName: string | null;
    customerEmail: string | null;
    status: "open" | "closed";
    lastMessagePreview: string | null;
    lastMessageAt: string;
    createdAt: string;
  }>;
  selectedThreadId: number | null;
  messages: Array<{
    id: number;
    authorRole: "owner" | "customer" | "system";
    authorName: string;
    message: string;
    createdAt: string;
  }>;
  pollIntervalSeconds: number;
}

export interface ChatPollRequest {
  selectedThreadId: number;
  afterMessageId: number;
}

export interface ChatPollResponse {
  role: "owner" | "customer";
  threads: Array<{
    id: number;
    domain: string;
    customerName: string | null;
    customerEmail: string | null;
    status: "open" | "closed";
    lastMessagePreview: string | null;
    lastMessageAt: string;
    createdAt: string;
  }>;
  selectedThreadId: number;
  messages: Array<{
    id: number;
    authorRole: "owner" | "customer" | "system";
    authorName: string;
    message: string;
    createdAt: string;
  }>;
  pollIntervalSeconds: number;
}

export interface ChatSendRequest {
  selectedThreadId: number;
  message: string;
}

export interface ChatSendResponse {
  role: "owner" | "customer";
  thread: {
    id: number;
    domain: string;
    customerName: string | null;
    customerEmail: string | null;
    status: "open" | "closed";
    lastMessagePreview: string | null;
    lastMessageAt: string;
    createdAt: string;
  };
  message: {
    id: number;
    authorRole: "owner" | "customer" | "system";
    authorName: string;
    message: string;
    createdAt: string;
  };
}

export interface DashboardResponse {
  atAGlance: Record<string, unknown>;
  siteHealth: Record<string, unknown>;
  pendingUpdates: Record<string, unknown>;
  visitorTrend: Record<string, unknown>;
  countryStats: Array<Record<string, unknown>>;
  siteSpeed: Record<string, unknown>;
  pagesOverview: Record<string, unknown>;
  actionItems: Array<Record<string, unknown>>;
  seoOverview: Record<string, unknown>;
  seoBasics: Array<Record<string, unknown>>;
  legalCompliance: Record<string, unknown>;
  businessFunctions: Record<string, unknown>;
  onboardingChecklist: Array<Record<string, unknown>>;
  siteReadinessScore: number;
  calendarPreview: Record<string, unknown>;
}

export interface LicenseWebhookResponse {
  status: "accepted";
  event: string;
}

export interface LicenseActivateRequest {
  licenseKey: string;
}

export interface LicenseResponse {
  status: "active" | "expired" | "grace" | "disabled";
  role: string | null;
  tier: string | null;
  expiresAt: string | null;
  features: Array<string>;
  graceDaysRemaining: number;
  hasKey: boolean;
  keyPrefix: string | null;
  serverConfigured: boolean;
}

export interface LicenseSettingsRequest {
  serverUrl: string | null;
}

export interface LicenseSettingsResponse {
  serverUrl: string | null;
  serverConfigured: boolean;
  storedLicenseKey: string | null;
}

export interface MenuCountsResponse {
  counts: Record<string, number>;
}

export interface MenuItem {
  label: string;
  slug: string;
  icon?: string;
  count?: number | null;
  cap?: string;
  children?: Array<SubMenuItem>;
}

export interface MenuResponse {
  menu: Array<MenuItem>;
}

export interface PreferencesRequest {
  favorites?: Array<string>;
  recentPages?: Array<{
    pageUrl: string;
    title: string;
    visitedAt: number;
  }>;
  density?: "comfortable" | "compact";
  themePreset?: string;
  customPresetColor?: string;
  dashboardWidgetOrder?: Array<string>;
  hiddenWidgets?: Array<string>;
  highContrast?: boolean;
  sidebarCollapsed?: boolean;
}

export interface PreferencesResponse {
  preferences: PreferencesRequest;
}

export interface SubMenuItem {
  label: string;
  slug: string;
  count?: number | null;
  cap?: string;
}

export interface ThemeRequest {
  theme: "light" | "dark";
}

export interface ThemeResponse {
  theme: "light" | "dark";
}

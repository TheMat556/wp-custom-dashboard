import type { MenuItem } from "./menu";

export interface WpReactUiBrandingLogos {
  lightUrl: string | null;
  darkUrl: string | null;
  longUrl: string | null;
  defaultUrl: string;
}

export interface WpReactUiBranding {
  siteName: string;
  logos: WpReactUiBrandingLogos;
  useLongLogo: boolean;
  primaryColor: string;
  fontPreset: string;
}

export interface WpReactUiNavigationConfig {
  fullReloadPageParams: string[];
  shellDisabledPagenow: string[];
  breakoutPagenow: string[];
  openInNewTabPatterns: string[];
}

export interface WpReactUiUser {
  name: string;
  role: string;
}

export interface WpReactUiShellRoute {
  slug: string;
  label: string;
  entrypoint_url: string;
}

export interface WpReactUiConfig {
  adminUrl: string;
  menu: MenuItem[];
  restUrl: string;
  nonce: string;
  siteName: string;
  branding: WpReactUiBranding;
  theme: string;
  assetsUrl: string;
  publicUrl: string;
  navigation: WpReactUiNavigationConfig;
  logoutUrl: string;
  user: WpReactUiUser;
  shellRoutes: WpReactUiShellRoute[];
}

export type WpReactUiWindowConfig = Partial<WpReactUiConfig> & {
  branding?: Partial<WpReactUiBranding> & {
    logos?: Partial<WpReactUiBrandingLogos>;
  };
  navigation?: Partial<WpReactUiNavigationConfig>;
  user?: Partial<WpReactUiUser>;
};

function getSiteName(raw: WpReactUiWindowConfig | undefined) {
  return raw?.branding?.siteName ?? raw?.siteName ?? "Site";
}

function normalizeBranding(
  raw: WpReactUiWindowConfig | undefined,
  siteName: string,
  assetsUrl: string
): WpReactUiBranding {
  return {
    siteName,
    logos: {
      lightUrl: raw?.branding?.logos?.lightUrl ?? null,
      darkUrl: raw?.branding?.logos?.darkUrl ?? null,
      longUrl: raw?.branding?.logos?.longUrl ?? null,
      defaultUrl: raw?.branding?.logos?.defaultUrl ?? `${assetsUrl}logo.svg`,
    },
    useLongLogo: raw?.branding?.useLongLogo ?? false,
    primaryColor: raw?.branding?.primaryColor ?? "#4f46e5",
    fontPreset: raw?.branding?.fontPreset ?? "inter",
  };
}

function normalizeNavigation(raw: WpReactUiWindowConfig | undefined): WpReactUiNavigationConfig {
  return {
    fullReloadPageParams: raw?.navigation?.fullReloadPageParams ?? [],
    shellDisabledPagenow: raw?.navigation?.shellDisabledPagenow ?? [],
    breakoutPagenow: raw?.navigation?.breakoutPagenow ?? [],
    openInNewTabPatterns: raw?.navigation?.openInNewTabPatterns ?? [],
  };
}

function normalizeUser(raw: WpReactUiWindowConfig | undefined): WpReactUiUser {
  return {
    name: raw?.user?.name ?? "Admin",
    role: raw?.user?.role ?? "administrator",
  };
}

export function normalizeWpReactUiConfig(
  raw: WpReactUiWindowConfig | undefined
): Readonly<WpReactUiConfig> {
  const siteName = getSiteName(raw);
  const assetsUrl = raw?.assetsUrl ?? "/";

  return Object.freeze({
    adminUrl: raw?.adminUrl ?? "/wp-admin/",
    menu: raw?.menu ?? [],
    restUrl: raw?.restUrl ?? "/wp-json/wp-react-ui/v1",
    nonce: raw?.nonce ?? "",
    siteName,
    branding: normalizeBranding(raw, siteName, assetsUrl),
    theme: raw?.theme ?? "light",
    assetsUrl,
    publicUrl: raw?.publicUrl ?? "/",
    navigation: normalizeNavigation(raw),
    logoutUrl: raw?.logoutUrl ?? "/wp-login.php?action=logout",
    user: normalizeUser(raw),
    shellRoutes: Array.isArray(raw?.shellRoutes) ? raw.shellRoutes : [],
  });
}

declare global {
  interface Window {
    wpReactUi?: WpReactUiWindowConfig;
  }
}

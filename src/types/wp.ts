import type {
  WpReactUiBranding,
  WpReactUiConfig,
  WpReactUiNavigationConfig,
  WpReactUiUser,
  WpReactUiWindowConfig,
} from "../generated/contracts/boot";
import type { LicenseResponse } from "../generated/contracts/dto";
import { logger } from "../utils/logger";
import { ShellRoutesSchema } from "./shellRoutesSchema";

export type {
  WpReactUiBranding,
  WpReactUiBrandingLogos,
  WpReactUiConfig,
  WpReactUiNavigationConfig,
  WpReactUiShellRoute,
  WpReactUiUser,
  WpReactUiWindowConfig,
} from "../generated/contracts/boot";
export type { LicenseResponse as WpReactUiLicense } from "../generated/contracts/dto";

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
    canManageOptions: raw?.user?.canManageOptions ?? false,
  };
}

function normalizeLicense(raw: WpReactUiWindowConfig | undefined): LicenseResponse {
  return {
    status: raw?.license?.status ?? "disabled",
    role:
      raw?.license?.role === "owner" || raw?.license?.role === "customer" ? raw.license.role : null,
    tier: raw?.license?.tier ?? null,
    expiresAt: raw?.license?.expiresAt ?? null,
    features: Array.isArray(raw?.license?.features) ? raw.license.features : [],
    graceDaysRemaining: raw?.license?.graceDaysRemaining ?? 0,
    hasKey: raw?.license?.hasKey ?? false,
    keyPrefix: raw?.license?.keyPrefix ?? null,
    serverConfigured: raw?.license?.serverConfigured ?? false,
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
    license: normalizeLicense(raw),
    shellRoutes: (() => {
      const rawRoutes = Array.isArray(raw?.shellRoutes) ? raw.shellRoutes : [];
      const result = ShellRoutesSchema.safeParse(rawRoutes);
      if (!result.success) {
        logger.error("[shell-routes] Unexpected boot config shape:", result.error.flatten());
        return [];
      }
      return result.data;
    })(),
    locale: raw?.locale ?? "en_US",
  });
}

declare global {
  interface Window {
    wpReactUi?: WpReactUiWindowConfig;
  }
}

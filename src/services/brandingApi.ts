import { notifyApiError } from "../store/notificationStore";
import type { WpReactUiConfig } from "../types/wp";

export interface BrandingData {
  lightLogoId: number;
  lightLogoUrl: string | null;
  darkLogoId: number;
  darkLogoUrl: string | null;
  openInNewTabPatterns: string[];
}

export interface BrandingService {
  fetchBranding(): Promise<BrandingData>;
  saveBranding(
    data: Pick<BrandingData, "lightLogoId" | "darkLogoId" | "openInNewTabPatterns">
  ): Promise<BrandingData>;
}

export function createBrandingService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): BrandingService {
  return {
    async fetchBranding() {
      const res = await fetch(`${config.restUrl}/branding`, {
        headers: { "X-WP-Nonce": config.nonce },
      });

      if (!res.ok) {
        throw new Error(notifyApiError(res, "Branding fetch"));
      }

      return res.json();
    },

    async saveBranding(data) {
      const res = await fetch(`${config.restUrl}/branding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": config.nonce,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(notifyApiError(res, "Branding save"));
      }

      return res.json();
    },
  };
}

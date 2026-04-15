import { createPluginApiError } from "../../../shared/services/pluginApiError";
import { createPluginRouteApi } from "../../../shared/services/pluginRouteApi";
import type { WpReactUiConfig } from "../../../types/wp";

export interface BrandingData {
  lightLogoId: number;
  lightLogoUrl: string | null;
  darkLogoId: number;
  darkLogoUrl: string | null;
  longLogoId: number;
  longLogoUrl: string | null;
  useLongLogo: boolean;
  primaryColor: string;
  fontPreset: string;
  openInNewTabPatterns: string[];
}

export type BrandingSaveInput = Pick<
  BrandingData,
  | "lightLogoId"
  | "darkLogoId"
  | "longLogoId"
  | "useLongLogo"
  | "primaryColor"
  | "fontPreset"
  | "openInNewTabPatterns"
>;

export interface BrandingService {
  fetchBranding(): Promise<BrandingData>;
  saveBranding(data: BrandingSaveInput): Promise<BrandingData>;
}

export function createBrandingService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): BrandingService {
  const api = createPluginRouteApi(config);

  return {
    async fetchBranding() {
      const res = await api.fetchBranding();

      if (!res.ok) {
        throw await createPluginApiError(res, "Branding fetch");
      }

      return res.json();
    },

    async saveBranding(data) {
      const res = await api.saveBranding(data);

      if (!res.ok) {
        throw await createPluginApiError(res, "Branding save");
      }

      return res.json();
    },
  };
}

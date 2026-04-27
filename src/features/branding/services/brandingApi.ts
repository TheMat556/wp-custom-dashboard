import { z } from "zod";
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

const brandingDataSchema = z.object({
  lightLogoId: z.number(),
  lightLogoUrl: z.string().nullable(),
  darkLogoId: z.number(),
  darkLogoUrl: z.string().nullable(),
  longLogoId: z.number(),
  longLogoUrl: z.string().nullable(),
  useLongLogo: z.boolean(),
  primaryColor: z.string(),
  fontPreset: z.string(),
  openInNewTabPatterns: z.array(z.string()),
});

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

      const data = await res.json();
      return brandingDataSchema.parse(data);
    },

    async saveBranding(input) {
      const res = await api.saveBranding(input);

      if (!res.ok) {
        throw await createPluginApiError(res, "Branding save");
      }

      const data = await res.json();
      return brandingDataSchema.parse(data);
    },
  };
}

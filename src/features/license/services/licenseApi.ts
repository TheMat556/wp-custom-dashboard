import type {
  LicenseActivateRequest,
  LicenseResponse,
  LicenseSettingsRequest,
  LicenseSettingsResponse,
} from "../../../generated/contracts/dto";
import { createPluginRouteApi } from "../../../shared/services/pluginRouteApi";
import { notifyApiError, notifyApiErrorWithBody } from "../../../store/notificationStore";
import type { WpReactUiConfig } from "../../../types/wp";
import { logger } from "../../../utils/logger";
import { LicenseResponseSchema, LicenseSettingsResponseSchema } from "./licenseSchema";

export type LicenseData = LicenseResponse;
export type LicenseActivateInput = LicenseActivateRequest;
export type LicenseSettingsData = LicenseSettingsResponse;
export type LicenseSettingsInput = LicenseSettingsRequest;

export interface LicenseService {
  fetchLicense(force?: boolean): Promise<LicenseData>;
  fetchLicenseSettings(): Promise<LicenseSettingsData>;
  saveLicenseSettings(data: LicenseSettingsInput): Promise<LicenseSettingsData>;
  activateLicense(data: LicenseActivateInput): Promise<LicenseData>;
  deactivateLicense(): Promise<LicenseData>;
}

export function createLicenseService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): LicenseService {
  const api = createPluginRouteApi(config);

  return {
    async fetchLicense(force?: boolean) {
      const res = await api.fetchLicense(force);

      if (!res.ok) {
        throw new Error(notifyApiError(res, "License fetch"));
      }

      const raw = await res.json();
      const result = LicenseResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[license] Unexpected API shape:", result.error.flatten());
        throw new Error("Unexpected response from license API");
      }
      return result.data;
    },

    async fetchLicenseSettings() {
      const res = await api.fetchLicenseSettings();

      if (!res.ok) {
        throw new Error(notifyApiError(res, "License settings fetch"));
      }

      const raw = await res.json();
      const result = LicenseSettingsResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[license-settings] Unexpected API shape:", result.error.flatten());
        throw new Error("Unexpected response from license settings API");
      }
      return result.data;
    },

    async saveLicenseSettings(data) {
      const res = await api.saveLicenseSettings(data);

      if (!res.ok) {
        throw new Error(notifyApiError(res, "License settings save"));
      }

      const raw = await res.json();
      const result = LicenseSettingsResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[license-settings] Unexpected API shape after save:", result.error.flatten());
        throw new Error("Unexpected response from license settings API");
      }
      return result.data;
    },

    async activateLicense(data) {
      const res = await api.activateLicense(data);

      if (!res.ok) {
        throw new Error(await notifyApiErrorWithBody(res, "License activation"));
      }

      const raw = await res.json();
      const result = LicenseResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[license-activate] Unexpected API shape:", result.error.flatten());
        throw new Error("Unexpected response from license activation API");
      }
      return result.data;
    },

    async deactivateLicense() {
      const res = await api.deactivateLicense();

      // 404 means the server has no record of this key/domain — treat as already deactivated.
      if (res.status === 404) {
        throw new Error("License key not recognized on server — cleared locally.");
      }

      if (!res.ok) {
        throw new Error(await notifyApiErrorWithBody(res, "License deactivation"));
      }

      const raw = await res.json();
      const result = LicenseResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[license-deactivate] Unexpected API shape:", result.error.flatten());
        throw new Error("Unexpected response from license deactivation API");
      }
      return result.data;
    },
  };
}

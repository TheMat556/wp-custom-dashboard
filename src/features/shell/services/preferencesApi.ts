import { createPluginRouteApi } from "../../../shared/services/pluginRouteApi";
import { notifyApiError } from "../../../store/notificationStore";
import type { PersistedShellPreferences } from "../../../types/shellPreferences";
import type { WpReactUiConfig } from "../../../types/wp";
import { logger } from "../../../utils/logger";
import { PreferencesResponseSchema } from "./preferencesSchema";

export interface PreferencesService {
  fetchPreferences(): Promise<Partial<PersistedShellPreferences>>;
  savePreferences(prefs: Partial<PersistedShellPreferences>): Promise<void>;
}

export function createPreferencesService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): PreferencesService {
  const api = createPluginRouteApi(config);

  return {
    async fetchPreferences() {
      const response = await api.fetchPreferences();

      if (!response.ok) {
        notifyApiError(response, "Preferences fetch");
        return {};
      }

      const raw = await response.json();
      const result = PreferencesResponseSchema.safeParse(raw);
      if (!result.success) {
        logger.error("[preferences] Unexpected API shape:", result.error.flatten());
        return {};
      }
      return result.data.preferences ?? {};
    },

    async savePreferences(prefs) {
      const response = await api.savePreferences(prefs);

      if (!response.ok) {
        notifyApiError(response, "Preferences save");
      }
    },
  };
}

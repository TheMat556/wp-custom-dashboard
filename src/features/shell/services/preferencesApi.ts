import { notifyApiError } from "../../../store/notificationStore";
import type { WpReactUiConfig } from "../../../types/wp";
import type { PersistedShellPreferences } from "../store/shellPreferencesStore";
import { createPluginRouteApi } from "../../../shared/services/pluginRouteApi";

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

      const data = await response.json();
      return data.preferences ?? {};
    },

    async savePreferences(prefs) {
      const response = await api.savePreferences(prefs);

      if (!response.ok) {
        notifyApiError(response, "Preferences save");
      }
    },
  };
}

import { notifyApiError } from "../store/notificationStore";
import type { WpReactUiConfig } from "../types/wp";
import type { PersistedShellPreferences } from "../store/shellPreferencesStore";

export interface PreferencesService {
  fetchPreferences(): Promise<Partial<PersistedShellPreferences>>;
  savePreferences(prefs: Partial<PersistedShellPreferences>): Promise<void>;
}

export function createPreferencesService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): PreferencesService {
  return {
    async fetchPreferences() {
      const response = await fetch(`${config.restUrl}/preferences`, {
        headers: { "X-WP-Nonce": config.nonce },
      });

      if (!response.ok) {
        notifyApiError(response, "Preferences fetch");
        return {};
      }

      const data = await response.json();
      return data.preferences ?? {};
    },

    async savePreferences(prefs) {
      const response = await fetch(`${config.restUrl}/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": config.nonce,
        },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        notifyApiError(response, "Preferences save");
      }
    },
  };
}

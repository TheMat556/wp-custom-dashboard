import { notifyApiError } from "../../../store/notificationStore";
import type { WpReactUiConfig } from "../../../types/wp";
import { createPluginRouteApi } from "../../../shared/services/pluginRouteApi";

export interface ThemeService {
  saveTheme(theme: "light" | "dark"): Promise<void>;
}

export function createThemeService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): ThemeService {
  const api = createPluginRouteApi(config);

  return {
    async saveTheme(theme) {
      const response = await api.saveTheme(theme);

      if (!response.ok) {
        throw new Error(notifyApiError(response, "Theme save"));
      }
    },
  };
}

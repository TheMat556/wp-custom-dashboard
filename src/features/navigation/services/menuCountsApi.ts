import { notifyApiError } from "../../../store/notificationStore";
import type { WpReactUiConfig } from "../../../types/wp";
import { createPluginRouteApi } from "../../../shared/services/pluginRouteApi";

export interface MenuCountsService {
  fetchCounts(): Promise<Record<string, number>>;
}

export function createMenuCountsService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): MenuCountsService {
  const api = createPluginRouteApi(config);

  return {
    async fetchCounts() {
      const response = await api.fetchMenuCounts();

      if (!response.ok) {
        notifyApiError(response, "Menu counts fetch");
        return {};
      }

      const data = await response.json();
      return data.counts ?? {};
    },
  };
}

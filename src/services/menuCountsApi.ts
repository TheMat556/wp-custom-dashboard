import { notifyApiError } from "../store/notificationStore";
import type { WpReactUiConfig } from "../types/wp";

export interface MenuCountsService {
  fetchCounts(): Promise<Record<string, number>>;
}

export function createMenuCountsService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): MenuCountsService {
  return {
    async fetchCounts() {
      const response = await fetch(`${config.restUrl}/menu-counts`, {
        headers: { "X-WP-Nonce": config.nonce },
      });

      if (!response.ok) {
        notifyApiError(response, "Menu counts fetch");
        return {};
      }

      const data = await response.json();
      return data.counts ?? {};
    },
  };
}

import { notifyApiError } from "../../../store/notificationStore";
import type { MenuItem } from "../../../types/menu";
import type { WpReactUiConfig } from "../../../types/wp";
import { createPluginRouteApi } from "../../../shared/services/pluginRouteApi";

export interface MenuService {
  fetchMenu(): Promise<MenuItem[]>;
}

export function createMenuService(config: Pick<WpReactUiConfig, "restUrl" | "nonce">): MenuService {
  const api = createPluginRouteApi(config);

  return {
    async fetchMenu() {
      const res = await api.fetchMenu();

      if (!res.ok) {
        throw new Error(notifyApiError(res, "Menu refresh"));
      }

      const data = await res.json();
      return data.menu ?? [];
    },
  };
}

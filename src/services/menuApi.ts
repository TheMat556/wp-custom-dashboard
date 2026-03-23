import type { MenuItem } from "../types/menu";
import type { WpReactUiConfig } from "../types/wp";

export interface MenuService {
  fetchMenu(): Promise<MenuItem[]>;
}

export function createMenuService(config: Pick<WpReactUiConfig, "restUrl" | "nonce">): MenuService {
  return {
    async fetchMenu() {
      const res = await fetch(`${config.restUrl}/menu`, {
        headers: { "X-WP-Nonce": config.nonce },
      });

      if (!res.ok) {
        throw new Error(`Menu fetch failed: ${res.status}`);
      }

      const data = await res.json();
      return data.menu ?? [];
    },
  };
}

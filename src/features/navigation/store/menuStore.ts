import { createStore } from "zustand/vanilla";
import { createMenuService, type MenuService } from "../services/menuApi";
import type { MenuItem } from "../../../types/menu";
import type { WpReactUiConfig } from "../../../types/wp";

export interface MenuStoreState {
  items: MenuItem[];
  loading: boolean;
  service: MenuService | null;
  refresh: () => Promise<void>;
}

export const menuStore = createStore<MenuStoreState>((set, get) => ({
  items: [],
  loading: false,
  service: null,
  async refresh() {
    set({ loading: true });

    try {
      const service = get().service;
      const items = service ? await service.fetchMenu() : get().items;
      set({ items, loading: false });
    } catch (error) {
      console.error("[WP React UI] Menu refresh failed:", error);
      set({ loading: false });
    }
  },
}));

export function bootstrapMenuStore(
  config: Pick<WpReactUiConfig, "menu" | "restUrl" | "nonce">,
  service: MenuService = createMenuService(config)
) {
  menuStore.setState({
    items: config.menu,
    loading: false,
    service,
  });
}

export function resetMenuStore() {
  menuStore.setState({
    items: [],
    loading: false,
    service: null,
  });
}

import { createStore } from "zustand/vanilla";
import type { MenuService } from "../services/menuApi";
import type { MenuItem } from "../../../types/menu";
import type { WpReactUiConfig } from "../../../types/wp";
import { initMenuService, clearMenuService } from "./menuActions";

export interface MenuStoreState {
  items: MenuItem[];
  loading: boolean;
}

export const menuStore = createStore<MenuStoreState>(() => ({
  items: [],
  loading: false,
}));

export function bootstrapMenuStore(
  config: Pick<WpReactUiConfig, "menu" | "restUrl" | "nonce">,
  service?: MenuService
) {
  initMenuService(config, service);
  menuStore.setState({
    items: config.menu,
    loading: false,
  });
}

export function resetMenuStore() {
  clearMenuService();
  menuStore.setState({
    items: [],
    loading: false,
  });
}

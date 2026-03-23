import { useStore } from "zustand";
import { menuStore } from "../store/menuStore";

export type { MenuItem, SubMenuItem } from "../types/menu";

export function useMenu() {
  const menuItems = useStore(menuStore, (state) => state.items);
  const loading = useStore(menuStore, (state) => state.loading);
  const refresh = useStore(menuStore, (state) => state.refresh);

  return {
    menuItems,
    loading,
    refresh,
  };
}

import { useMemo } from "react";
import { useStore } from "zustand";
import { menuStore } from "../store/menuStore";
import type { MenuItem, SubMenuItem } from "../types/menu";

export type { MenuItem, SubMenuItem } from "../types/menu";

function renameBrandAssetsEntry(item: MenuItem): MenuItem {
  const label = item.slug === "wp-react-ui-branding" ? "Brand Assets" : item.label;
  const children = item.children?.map((child: SubMenuItem) => ({
    ...child,
    label: child.slug === "wp-react-ui-branding" ? "Brand Assets" : child.label,
  }));

  return {
    ...item,
    label,
    children,
  };
}

export function useMenu() {
  const rawMenuItems = useStore(menuStore, (state) => state.items);
  const loading = useStore(menuStore, (state) => state.loading);
  const refresh = useStore(menuStore, (state) => state.refresh);
  const menuItems = useMemo(() => rawMenuItems.map(renameBrandAssetsEntry), [rawMenuItems]);

  return {
    menuItems,
    loading,
    refresh,
  };
}

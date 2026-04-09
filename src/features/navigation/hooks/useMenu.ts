import { useMemo } from "react";
import { useStore } from "zustand";
import { useShellConfig } from "../../shell/context/ShellConfigContext";
import { menuStore } from "../store/menuStore";
import { refreshMenu } from "../store/menuActions";
import type { MenuItem, SubMenuItem } from "../../../types/menu";
import { createT } from "../../../utils/i18n";

export type { MenuItem, SubMenuItem } from "../../../types/menu";

function renameBrandAssetsEntry(item: MenuItem, brandAssetsLabel: string): MenuItem {
  const label = item.slug === "wp-react-ui-branding" ? brandAssetsLabel : item.label;
  const children = item.children?.map((child: SubMenuItem) => ({
    ...child,
    label: child.slug === "wp-react-ui-branding" ? brandAssetsLabel : child.label,
  }));

  return {
    ...item,
    label,
    children,
  };
}

export function useMenu() {
  const config = useShellConfig();
  const rawMenuItems = useStore(menuStore, (state) => state.items);
  const loading = useStore(menuStore, (state) => state.loading);
  const brandAssetsLabel = useMemo(
    () => createT(config.locale ?? "en_US")("Brand Assets"),
    [config.locale]
  );
  const menuItems = useMemo(
    () => rawMenuItems.map((item) => renameBrandAssetsEntry(item, brandAssetsLabel)),
    [rawMenuItems, brandAssetsLabel]
  );

  return {
    menuItems,
    loading,
    refresh: refreshMenu,
  };
}

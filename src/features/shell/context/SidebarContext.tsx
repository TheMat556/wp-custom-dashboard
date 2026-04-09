import { useStore } from "zustand";
import { sidebarStore } from "../store/sidebarStore";

export interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  isMobile: boolean;
  sidebarWidth: number;
  mobileOpen: boolean;
}

export function useSidebar(): SidebarContextValue {
  const collapsed = useStore(sidebarStore, (state) => state.collapsed);
  const toggle = useStore(sidebarStore, (state) => state.toggle);
  const isMobile = useStore(sidebarStore, (state) => state.isMobile);
  const sidebarWidth = useStore(sidebarStore, (state) => state.sidebarWidth);
  const mobileOpen = useStore(sidebarStore, (state) => state.mobileOpen);

  return {
    collapsed,
    toggle,
    isMobile,
    sidebarWidth,
    mobileOpen,
  };
}

import { type ReactNode, useMemo } from "react";
import { useStore } from "zustand";
import { sidebarStore } from "../store/sidebarStore";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  isMobile: boolean;
  sidebarWidth: number;
  mobileOpen: boolean;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useSidebar(): SidebarContextValue {
  const collapsed = useStore(sidebarStore, (state) => state.collapsed);
  const toggle = useStore(sidebarStore, (state) => state.toggle);
  const isMobile = useStore(sidebarStore, (state) => state.isMobile);
  const sidebarWidth = useStore(sidebarStore, (state) => state.sidebarWidth);
  const mobileOpen = useStore(sidebarStore, (state) => state.mobileOpen);

  return useMemo(
    () => ({
      collapsed,
      toggle,
      isMobile,
      sidebarWidth,
      mobileOpen,
    }),
    [collapsed, toggle, isMobile, sidebarWidth, mobileOpen]
  );
}

import { createStore } from "zustand/vanilla";
import { getBootConfig } from "../../../config/bootConfig";

const bootConfig = getBootConfig();
const MOBILE_BREAKPOINT = bootConfig.layout.mobileBreakpoint;
const SIDEBAR_FULL = bootConfig.layout.sidebarWidths.expanded;
const SIDEBAR_COLLAPSED = bootConfig.layout.sidebarWidths.collapsed;
const SIDEBAR_MOBILE = bootConfig.layout.sidebarWidths.mobile;
const LS_KEY = bootConfig.layout.collapsedStorageKey;

function canUseDOM() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getViewportIsMobile() {
  return canUseDOM() ? window.innerWidth < MOBILE_BREAKPOINT : false;
}

function getSidebarWidth(collapsed: boolean, isMobile: boolean): number {
  if (isMobile) return SIDEBAR_MOBILE;
  return collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL;
}

function applyCssVar(sidebarWidth: number) {
  if (!canUseDOM()) return;
  document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
}

function readPersistedCollapsed(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === "true";
  } catch {
    return false;
  }
}

function persistCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(LS_KEY, String(collapsed));
  } catch {
    // Private browsing or storage full — ignore
  }
}

let desktopCollapsed = false;
let teardownResizeListener: (() => void) | null = null;

function getSnapshot(isMobile: boolean, mobileOpen: boolean) {
  const collapsed = isMobile ? !mobileOpen : desktopCollapsed;

  return {
    collapsed,
    isMobile,
    mobileOpen,
    sidebarWidth: getSidebarWidth(collapsed, isMobile),
  };
}

export interface SidebarStoreState {
  collapsed: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  sidebarWidth: number;
  toggle: () => void;
  syncViewport: () => void;
}

const initialSnapshot = getSnapshot(false, false);

export const sidebarStore = createStore<SidebarStoreState>((set, get) => {
  const setSnapshot = (isMobile: boolean, mobileOpen: boolean) => {
    const snapshot = getSnapshot(isMobile, mobileOpen);
    applyCssVar(snapshot.sidebarWidth);
    set(snapshot);
  };

  return {
    ...initialSnapshot,
    toggle() {
      const state = get();

      if (state.isMobile) {
        setSnapshot(true, !state.mobileOpen);
        return;
      }

      desktopCollapsed = !desktopCollapsed;
      persistCollapsed(desktopCollapsed);
      setSnapshot(false, state.mobileOpen);
    },
    syncViewport() {
      const state = get();
      const nextIsMobile = getViewportIsMobile();

      if (state.isMobile === nextIsMobile) {
        return;
      }

      setSnapshot(nextIsMobile, false);
    },
  };
});

function startResizeListener() {
  if (!canUseDOM()) {
    return () => {};
  }

  let resizeFrame: number | null = null;

  const handleResize = () => {
    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      sidebarStore.getState().syncViewport();
    });
  };

  window.addEventListener("resize", handleResize);
  sidebarStore.getState().syncViewport();

  return () => {
    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
    }

    window.removeEventListener("resize", handleResize);
  };
}

export function bootstrapSidebarStore() {
  if (!canUseDOM()) {
    return () => {};
  }

  teardownResizeListener?.();

  desktopCollapsed = readPersistedCollapsed();
  sidebarStore.setState(getSnapshot(getViewportIsMobile(), false));
  applyCssVar(sidebarStore.getState().sidebarWidth);
  teardownResizeListener = startResizeListener();

  return () => {
    teardownResizeListener?.();
    teardownResizeListener = null;
  };
}

export function resetSidebarStore() {
  teardownResizeListener?.();
  teardownResizeListener = null;
  desktopCollapsed = false;
  sidebarStore.setState(getSnapshot(false, false));
  document.documentElement.style.removeProperty("--sidebar-width");
}

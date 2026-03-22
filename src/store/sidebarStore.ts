import { createStore } from "zustand/vanilla";

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_FULL = 240;
const SIDEBAR_COLLAPSED = 64;
const SIDEBAR_MOBILE = 0;
const LS_KEY = "wp-react-sidebar-collapsed";

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

let desktopCollapsed = readPersistedCollapsed();

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

const initialSnapshot = getSnapshot(getViewportIsMobile(), false);

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
    return;
  }

  const windowWithFlag = window as Window & {
    __wpReactUiSidebarResizeBound?: boolean;
  };

  if (windowWithFlag.__wpReactUiSidebarResizeBound) {
    return;
  }

  windowWithFlag.__wpReactUiSidebarResizeBound = true;

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
}

if (canUseDOM()) {
  applyCssVar(initialSnapshot.sidebarWidth);
  startResizeListener();
}

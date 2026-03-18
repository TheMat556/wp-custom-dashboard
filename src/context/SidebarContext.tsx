import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_FULL = 240;
const SIDEBAR_COLLAPSED = 64;
const SIDEBAR_MOBILE = 0;

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  isMobile: boolean;
  sidebarWidth: number;
  mobileOpen: boolean;
}

interface SidebarStoreState {
  desktopCollapsed: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
}

type SidebarSnapshot = Omit<SidebarContextValue, "toggle">;
type Listener = () => void;

const listeners = new Set<Listener>();

let resizeFrame: number | null = null;
let stopResizeListening: (() => void) | null = null;

function canUseDOM() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getViewportIsMobile() {
  return canUseDOM() ? window.innerWidth < MOBILE_BREAKPOINT : false;
}

function getSidebarWidth(collapsed: boolean, isMobile: boolean): number {
  if (isMobile) return SIDEBAR_MOBILE;
  if (collapsed) return SIDEBAR_COLLAPSED;
  return SIDEBAR_FULL;
}

function getCollapsed(state: SidebarStoreState) {
  return state.isMobile ? !state.mobileOpen : state.desktopCollapsed;
}

function getSnapshot(state: SidebarStoreState): SidebarSnapshot {
  const collapsed = getCollapsed(state);

  return {
    collapsed,
    isMobile: state.isMobile,
    sidebarWidth: getSidebarWidth(collapsed, state.isMobile),
    mobileOpen: state.mobileOpen,
  };
}

function applyCssVar(snapshot: SidebarSnapshot) {
  if (!canUseDOM()) return;

  document.documentElement.style.setProperty(
    "--sidebar-width",
    `${snapshot.sidebarWidth}px`
  );
}

const LS_KEY = "wp-react-sidebar-collapsed";

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

let currentState: SidebarStoreState = {
  desktopCollapsed: readPersistedCollapsed(),
  isMobile: getViewportIsMobile(),
  mobileOpen: false,
};
let currentSnapshot: SidebarSnapshot = getSnapshot(currentState);

function emitChange() {
  currentSnapshot = getSnapshot(currentState);
  applyCssVar(currentSnapshot);
  listeners.forEach((listener) => listener());
}

function setState(
  updater:
    | SidebarStoreState
    | ((state: SidebarStoreState) => SidebarStoreState)
) {
  const nextState =
    typeof updater === "function" ? updater(currentState) : updater;

  if (
    nextState.desktopCollapsed === currentState.desktopCollapsed &&
    nextState.isMobile === currentState.isMobile &&
    nextState.mobileOpen === currentState.mobileOpen
  ) {
    return;
  }

  currentState = nextState;
  persistCollapsed(nextState.desktopCollapsed);
  emitChange();
}

function syncViewportState() {
  const isMobile = getViewportIsMobile();

  setState((state) => {
    if (state.isMobile === isMobile) {
      return state;
    }

    return {
      ...state,
      isMobile,
      mobileOpen: isMobile ? false : state.mobileOpen,
    };
  });
}

function startResizeListener() {
  if (!canUseDOM() || stopResizeListening) {
    return;
  }

  const handleResize = () => {
    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      syncViewportState();
    });
  };

  window.addEventListener("resize", handleResize);
  stopResizeListening = () => {
    window.removeEventListener("resize", handleResize);

    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
    }

    stopResizeListening = null;
  };

  syncViewportState();
  applyCssVar(getSnapshot(currentState));
}

const sidebarStore = {
  get(): SidebarSnapshot {
    return currentSnapshot;
  },

  toggle() {
    setState((state) =>
      state.isMobile
        ? { ...state, mobileOpen: !state.mobileOpen }
        : { ...state, desktopCollapsed: !state.desktopCollapsed }
    );
  },

  subscribe(listener: Listener) {
    listeners.add(listener);

    if (listeners.size === 1) {
      startResizeListener();
    }

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        stopResizeListening?.();
      }
    };
  },
};

if (canUseDOM()) {
  applyCssVar(currentSnapshot);
}

const defaultSnapshot = sidebarStore.get();

const SidebarContext = createContext<SidebarContextValue>({
  ...defaultSnapshot,
  toggle: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.get,
    sidebarStore.get
  );

  const toggle = useCallback(() => {
    sidebarStore.toggle();
  }, []);

  return (
    <SidebarContext.Provider value={{ ...snapshot, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

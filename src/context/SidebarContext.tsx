import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_FULL      = 240;
const SIDEBAR_COLLAPSED = 64;
const SIDEBAR_MOBILE    = 0;
const COLLAPSE_EVENT    = "sidebar:toggle";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  isMobile: boolean;
  sidebarWidth: number;
  mobileOpen: boolean;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  isMobile: false,
  sidebarWidth: SIDEBAR_FULL,
  mobileOpen: false,
});

function getSidebarWidth(collapsed: boolean, isMobile: boolean): number {
  if (isMobile)  return SIDEBAR_MOBILE;
  if (collapsed) return SIDEBAR_COLLAPSED;
  return SIDEBAR_FULL;
}

function applyCssVar(collapsed: boolean, isMobile: boolean) {
  const width = getSidebarWidth(collapsed, isMobile);
  document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  // Desktop collapsed state
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Use ref to avoid stale closure in event handler
  const isMobileRef = useRef(isMobile);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  // Derive the "collapsed" value that consumers see
  const collapsed = isMobile ? !mobileOpen : desktopCollapsed;

  // Initial CSS var
  useEffect(() => {
    applyCssVar(collapsed, isMobile);
  }, []);

  // Resize handler
  useEffect(() => {
    let rafId: number;

    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;
        
        if (mobile !== isMobileRef.current) {
          setIsMobile(mobile);
          isMobileRef.current = mobile;

          // Close mobile drawer when switching to mobile
          if (mobile) {
            setMobileOpen(false);
          }

          applyCssVar(
            mobile ? true : desktopCollapsed,
            mobile
          );
        }
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId);
    };
  }, [desktopCollapsed]);

  // Keep CSS var in sync
  useEffect(() => {
    applyCssVar(collapsed, isMobile);
  }, [collapsed, isMobile]);

  // Toggle dispatches event for cross-shadow-DOM communication
  const toggle = useCallback(() => {
    window.dispatchEvent(new CustomEvent(COLLAPSE_EVENT));
  }, []);

  // Event handler - this is what actually changes the state
  // Runs in BOTH Navbar and Sidebar providers when event is dispatched
  useEffect(() => {
    const handleToggle = () => {
      if (isMobileRef.current) {
        setMobileOpen((prev) => !prev);
      } else {
        setDesktopCollapsed((prev) => {
          const next = !prev;
          applyCssVar(next, false);
          return next;
        });
      }
    };

    window.addEventListener(COLLAPSE_EVENT, handleToggle);
    return () => window.removeEventListener(COLLAPSE_EVENT, handleToggle);
  }, []); // Empty deps - handler uses ref for current isMobile

  const sidebarWidth = getSidebarWidth(collapsed, isMobile);

  return (
    <SidebarContext.Provider 
      value={{ 
        collapsed, 
        toggle, 
        isMobile, 
        sidebarWidth,
        mobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

// Helper to dispatch toggle event from anywhere (e.g., from outside React)
export function dispatchSidebarToggle() {
  window.dispatchEvent(new CustomEvent(COLLAPSE_EVENT));
}
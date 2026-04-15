import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  readAdminBarAction,
  triggerAdminBarAction,
  triggerAdminBarActionIn,
} from "../../../../utils/adminBar";
import { useActiveKey } from "../../../../utils/spaNavigate";
import { navigate, navigateHome } from "../../../../utils/wp";
import { useMenu } from "../../../navigation/hooks/useMenu";
import { navigationStore } from "../../../navigation/store/navigationStore";
import { useShellConfig } from "../../context/ShellConfigContext";
import { useSidebar } from "../../context/SidebarContext";
import { useTheme } from "../../context/ThemeContext";

const MIRRORED_ADMIN_BAR_ACTION_ID = "wp-admin-bar-snn-ai-chat";

export interface NavbarController {
  adminUrl: string;
  publicUrl: string;
  appTheme: string;
  isDark: boolean;
  collapsed: boolean;
  isMobile: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerWidth: number;
  mirroredAdminBarAction: ReturnType<typeof readAdminBarAction>;
  activityOpen: boolean;
  activityEverOpened: boolean;
  showExport: boolean;
  showHistory: boolean;
  showTheme: boolean;
  showSearchFull: boolean;
  showBreadcrumb: boolean;
  activeKey: string | null | undefined;
  menuItems: ReturnType<typeof useMenu>["menuItems"];
  navigate: typeof navigate;
  navigateHome: typeof navigateHome;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  openActivity: () => void;
  closeActivity: () => void;
  triggerAdminBarAction: typeof triggerAdminBarAction;
  triggerAdminBarActionIn: typeof triggerAdminBarActionIn;
}

export function useNavbarController(): NavbarController {
  const { adminUrl, publicUrl } = useShellConfig();
  const { theme: appTheme, toggle: toggleTheme } = useTheme();
  const { collapsed, toggle: toggleSidebar, isMobile } = useSidebar();
  const { menuItems } = useMenu();
  const isDark = appTheme === "dark";
  const activeKey = useActiveKey();
  const navigationStatus = useStore(navigationStore, (state) => state.status);

  const [activityOpen, setActivityOpen] = useState(false);
  const [activityEverOpened, setActivityEverOpened] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [mirroredAdminBarAction, setMirroredAdminBarAction] = useState(() =>
    readAdminBarAction(MIRRORED_ADMIN_BAR_ACTION_ID)
  );

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width != null) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncAction = () => {
      const topLevelAction = readAdminBarAction(MIRRORED_ADMIN_BAR_ACTION_ID, document);
      if (topLevelAction) {
        setMirroredAdminBarAction(topLevelAction);
        return true;
      }
      const iframe = document.querySelector<HTMLIFrameElement>("#wp-react-ui-content iframe");
      const iframeDocument = iframe?.contentDocument;
      const iframeAction = readAdminBarAction(MIRRORED_ADMIN_BAR_ACTION_ID, iframeDocument);
      setMirroredAdminBarAction(iframeAction);
      return !!iframeAction;
    };

    const attemptSync = (remainingAttempts: number) => {
      if (cancelled) return;
      if (syncAction() || remainingAttempts <= 0) return;
      window.setTimeout(() => attemptSync(remainingAttempts - 1), 250);
    };

    if (navigationStatus === "ready") {
      attemptSync(8);
    } else if (!document.querySelector("#wp-react-ui-content iframe")) {
      syncAction();
    }

    return () => {
      cancelled = true;
    };
  }, [navigationStatus]);

  const showExport = containerWidth >= 860;
  const showHistory = containerWidth >= 720;
  const showTheme = containerWidth >= 580;
  const showSearchFull = containerWidth >= 640;
  const showBreadcrumb = !isMobile && containerWidth >= 900;

  const openActivity = () => {
    setActivityEverOpened(true);
    setActivityOpen(true);
  };

  const closeActivity = () => setActivityOpen(false);

  return {
    adminUrl,
    publicUrl,
    appTheme,
    isDark,
    collapsed,
    isMobile,
    containerRef,
    containerWidth,
    mirroredAdminBarAction,
    activityOpen,
    activityEverOpened,
    showExport,
    showHistory,
    showTheme,
    showSearchFull,
    showBreadcrumb,
    activeKey,
    menuItems,
    navigate,
    navigateHome,
    toggleTheme,
    toggleSidebar,
    openActivity,
    closeActivity,
    triggerAdminBarAction,
    triggerAdminBarActionIn,
  };
}

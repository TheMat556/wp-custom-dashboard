import { lazy, useCallback, useEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";
import type { WpReactUiShellRoute } from "../../../../types/wp";
import { isSameOrigin } from "../../../../utils/security";
import { navigationStore } from "../../../navigation/store/navigationStore";
import { useShellConfig } from "../../context/ShellConfigContext";

export { isSameOrigin };

const BrandingSettings = lazy(() => import("../../../branding/components/BrandingSettings"));
const ChatPage = lazy(() => import("../../../chat/components/ChatPage"));
const DashboardPage = lazy(() => import("../../../dashboard/components/DashboardPage"));
const LicenseSettings = lazy(() => import("../../../license/components/LicenseSettings"));

const SHELL_ROUTES: Record<string, React.ComponentType> = {
  "wp-react-ui-branding": BrandingSettings,
  "wp-react-ui-chat": ChatPage,
  "wp-react-ui-license": LicenseSettings,
};

// Cache for dynamically imported plugin components.
const dynamicComponentCache = new Map<string, React.LazyExoticComponent<React.ComponentType>>();

function getDynamicComponent(
  route: WpReactUiShellRoute
): React.LazyExoticComponent<React.ComponentType> {
  let cached = dynamicComponentCache.get(route.slug);
  if (!cached) {
    if (!isSameOrigin(route.entrypoint_url)) {
      throw new Error(
        `[shell] Blocked cross-origin entrypoint: ${route.entrypoint_url}`
      );
    }
    cached = lazy(() =>
      import(/* @vite-ignore */ route.entrypoint_url).catch(() => ({
        default: () => null,
      }))
    );
    dynamicComponentCache.set(route.slug, cached);
  }
  return cached;
}

export function getShellRoute(
  pageUrl: string,
  pluginRoutes: WpReactUiShellRoute[],
  canManageOptions = false
): React.ComponentType | null {
  try {
    const url = new URL(pageUrl);

    const page = url.searchParams.get("page");
    if (page && page in SHELL_ROUTES) {
      if (
        (page === "wp-react-ui-branding" || page === "wp-react-ui-license") &&
        !canManageOptions
      ) {
        return null;
      }
      return SHELL_ROUTES[page];
    }

    if (page) {
      const pluginRoute = pluginRoutes.find((r) => r.slug === page);
      if (pluginRoute) {
        return getDynamicComponent(pluginRoute);
      }
    }

    const pathname = url.pathname;
    if (
      pathname.endsWith("/index.php") ||
      pathname.endsWith("/wp-admin/") ||
      pathname.endsWith("/wp-admin")
    ) {
      return DashboardPage;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

// ── Controller hook ───────────────────────────────────────────────────────────

export interface ContentFrameController {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  iframeUrl: string;
  isLoading: boolean;
  ShellPage: React.ComponentType | null;
  onIframeLoad: () => void;
}

export function useContentFrameController(): ContentFrameController {
  const config = useShellConfig();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const iframeUrl = useStore(navigationStore, (s) => s.iframeUrl);
  const pageUrl = useStore(navigationStore, (s) => s.pageUrl);
  const isLoading = useStore(navigationStore, (s) => s.status === "loading");
  const handleIframeLoad = useStore(navigationStore, (s) => s.handleIframeLoad);
  const handleIframeMessage = useStore(navigationStore, (s) => s.handleIframeMessage);

  const pluginRoutes = useMemo(() => config.shellRoutes ?? [], [config.shellRoutes]);
  const canManageOptions = config.user?.canManageOptions ?? false;

  useEffect(() => {
    const onMessage = (e: MessageEvent) => handleIframeMessage(e);
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleIframeMessage]);

  const ShellPage = useMemo(
    () => getShellRoute(pageUrl, pluginRoutes, canManageOptions),
    [canManageOptions, pageUrl, pluginRoutes]
  );

  useEffect(() => {
    if (ShellPage && isLoading) {
      navigationStore.getState().markShellPageReady();
    }
  }, [ShellPage, isLoading]);

  const onIframeLoad = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (win) handleIframeLoad(win);
  }, [handleIframeLoad]);

  return {
    iframeRef,
    iframeUrl,
    isLoading,
    ShellPage,
    onIframeLoad,
  };
}

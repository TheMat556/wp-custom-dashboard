import { lazy, useCallback, useEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";
import type { WpReactUiShellRoute } from "../../../../types/wp";
import { normalizeToMenuKey } from "../../../../utils/embedUrl";
import { isSameOrigin } from "../../../../utils/security";
import { menuStore } from "../../../navigation/store/menuStore";
import { navigationStore } from "../../../navigation/store/navigationStore";
import { sessionStore } from "../../../session/store/sessionStore";
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
      throw new Error(`[shell] Blocked cross-origin entrypoint: ${route.entrypoint_url}`);
    }
    // Security chain: (1) PHP ShellLocalization blocks cross-origin entrypoints,
    // (2) getShellRoute verifies the route slug exists in pluginRoutes,
    // (3) isSameOrigin above. @vite-ignore is safe because of these layers.
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
    // Only accept embed messages from the content iframe we own.
    // `iframeRef` is a stable ref object; reading `.current` at event-time is intentional.
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      handleIframeMessage(e);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleIframeMessage]);

  // Listen for the shell:auth-required CustomEvent dispatched by shellFetch()
  // when a shell-managed request receives a 401 or 403.  Using a CustomEvent
  // (rather than postMessage) means we never need to relax the source-pinning
  // guard above for same-window communication.
  useEffect(() => {
    function onAuthRequired() {
      sessionStore.getState().markExpired();
    }
    window.addEventListener("shell:auth-required", onAuthRequired);
    return () => window.removeEventListener("shell:auth-required", onAuthRequired);
  }, []);

  const ShellPage = useMemo(
    () => getShellRoute(pageUrl, pluginRoutes, canManageOptions),
    [canManageOptions, pageUrl, pluginRoutes]
  );

  useEffect(() => {
    if (ShellPage && isLoading) {
      navigationStore.getState().markShellPageReady();

      // Update document.title to match the active menu item label for native
      // React pages (iframe pages get their title from handleIframeLoad).
      const key = normalizeToMenuKey(pageUrl);
      if (key) {
        const items = menuStore.getState().items;
        const flat = items.flatMap((m) => [m, ...(m.children ?? [])]);
        const match = flat.find((m) => m.slug === key);
        if (match?.label) {
          navigationStore.setState({ pageTitle: match.label });
        }
      }
    }
  }, [ShellPage, isLoading, pageUrl]);

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

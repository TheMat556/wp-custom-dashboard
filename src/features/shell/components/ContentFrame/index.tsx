/**
 * ContentFrame — renders the WordPress admin content inside an iframe,
 * or a native React page for shell-managed routes (e.g. branding settings).
 *
 * Every navigation target is loaded with `?wp_shell_embed=1` so PHP
 * suppresses native WordPress chrome and injects the postMessage script.
 * The parent shell (React) stays alive across all navigations.
 */

import { Spin, Flex, Typography } from "antd";
import { lazy, Suspense, useEffect, useRef, useMemo } from "react";
import { useStore } from "zustand";
import { useShellConfig } from "../../context/ShellConfigContext";
import { navigationStore } from "../../../navigation/store/navigationStore";
import type { WpReactUiShellRoute } from "../../../../types/wp";

const BrandingSettings = lazy(() => import("../../../branding/components/BrandingSettings"));
const DashboardPage = lazy(() => import("../../../dashboard/components/DashboardPage"));

const { Text } = Typography;

const SHELL_ROUTES: Record<string, React.ComponentType> = {
  "wp-react-ui-branding": BrandingSettings,
};

// Cache for dynamically imported plugin components.
const dynamicComponentCache = new Map<string, React.LazyExoticComponent<React.ComponentType>>();

function getDynamicComponent(route: WpReactUiShellRoute): React.LazyExoticComponent<React.ComponentType> {
  let cached = dynamicComponentCache.get(route.slug);
  if (!cached) {
    cached = lazy(() =>
      import(/* @vite-ignore */ route.entrypoint_url).catch(() => ({
        default: () => (
          <Flex align="center" justify="center" style={{ height: "100%", padding: 40 }}>
            <Text type="danger">
              Failed to load plugin page: {route.label}
            </Text>
          </Flex>
        ),
      }))
    );
    dynamicComponentCache.set(route.slug, cached);
  }
  return cached;
}

function getShellRoute(
  pageUrl: string,
  pluginRoutes: WpReactUiShellRoute[]
): React.ComponentType | null {
  try {
    const url = new URL(pageUrl);

    // Check page param routes first (built-in).
    const page = url.searchParams.get("page");
    if (page && page in SHELL_ROUTES) {
      return SHELL_ROUTES[page];
    }

    // Check plugin-registered routes.
    if (page) {
      const pluginRoute = pluginRoutes.find((r) => r.slug === page);
      if (pluginRoute) {
        return getDynamicComponent(pluginRoute);
      }
    }

    // Check pathname-based routes (e.g., index.php = dashboard).
    const pathname = url.pathname;
    if (pathname.endsWith("/index.php") || pathname.endsWith("/wp-admin/") || pathname.endsWith("/wp-admin")) {
      return DashboardPage;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export default function ContentFrame() {
  const config = useShellConfig();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeUrl = useStore(navigationStore, (s) => s.iframeUrl);
  const pageUrl = useStore(navigationStore, (s) => s.pageUrl);
  const isLoading = useStore(navigationStore, (s) => s.status === "loading");
  const handleIframeLoad = useStore(navigationStore, (s) => s.handleIframeLoad);
  const handleIframeMessage = useStore(navigationStore, (s) => s.handleIframeMessage);

  const pluginRoutes = useMemo(() => config.shellRoutes ?? [], [config.shellRoutes]);

  // Listen for postMessage from the iframe (title changes, breakout requests).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => handleIframeMessage(e);
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleIframeMessage]);

  const ShellPage = getShellRoute(pageUrl, pluginRoutes);

  // Mark the shell-managed page as ready so the loading spinner clears
  useEffect(() => {
    if (ShellPage && isLoading) {
      navigationStore.setState({ status: "ready", pendingNavigationSource: null });
    }
  }, [ShellPage, isLoading]);

  if (ShellPage) {
    return (
      <div
        id="wp-react-ui-content"
        tabIndex={-1}
        style={{
          gridArea: "content",
          position: "relative",
          overflow: "hidden",
          pointerEvents: "auto",
          minWidth: 0,
          minHeight: 0,
          outline: "none",
        }}
      >
        <Suspense
          fallback={
            <div className="wp-react-ui-content-loading-shell">
              <Spin size="large" />
            </div>
          }
        >
          <ShellPage />
        </Suspense>
      </div>
    );
  }

  return (
    <div
      id="wp-react-ui-content"
      tabIndex={-1}
      style={{
        gridArea: "content",
        position: "relative",
        overflow: "hidden",
        pointerEvents: "auto",
        minWidth: 0,
        minHeight: 0,
        outline: "none",
      }}
    >
      {isLoading && <div className="wp-react-ui-content-loading-bar" aria-hidden="true" />}
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        title="WordPress Admin Content"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        onLoad={() => {
          const win = iframeRef.current?.contentWindow;
          if (win) handleIframeLoad(win);
        }}
      />
    </div>
  );
}

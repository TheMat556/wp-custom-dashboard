/**
 * ContentFrame — renders the WordPress admin content inside an iframe,
 * or a native React page for shell-managed routes (e.g. branding settings).
 *
 * Every navigation target is loaded with `?wp_shell_embed=1` so PHP
 * suppresses native WordPress chrome and injects the postMessage script.
 * The parent shell (React) stays alive across all navigations.
 */

import { Spin, theme } from "antd";
import { lazy, Suspense, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { navigationStore } from "../../store/navigationStore";

const BrandingSettings = lazy(() => import("../BrandingSettings"));

const SHELL_ROUTES: Record<string, React.ComponentType> = {
  "wp-react-ui-branding": BrandingSettings,
};

function getShellRoute(pageUrl: string): React.ComponentType | null {
  try {
    const url = new URL(pageUrl);
    const page = url.searchParams.get("page");
    if (page && page in SHELL_ROUTES) {
      return SHELL_ROUTES[page];
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export default function ContentFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeUrl = useStore(navigationStore, (s) => s.iframeUrl);
  const pageUrl = useStore(navigationStore, (s) => s.pageUrl);
  const isLoading = useStore(navigationStore, (s) => s.status === "loading");
  const handleIframeLoad = useStore(navigationStore, (s) => s.handleIframeLoad);
  const handleIframeMessage = useStore(navigationStore, (s) => s.handleIframeMessage);
  const { token } = theme.useToken();

  // Listen for postMessage from the iframe (title changes, breakout requests).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => handleIframeMessage(e);
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleIframeMessage]);

  const ShellPage = getShellRoute(pageUrl);

  // Mark the shell-managed page as ready so the loading spinner clears
  useEffect(() => {
    if (ShellPage && isLoading) {
      navigationStore.setState({ status: "ready", pendingNavigationSource: null });
    }
  }, [ShellPage, isLoading]);

  if (ShellPage) {
    return (
      <div
        style={{
          gridArea: "content",
          position: "relative",
          overflow: "hidden",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
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
      style={{
        gridArea: "content",
        position: "relative",
        overflow: "hidden",
        pointerEvents: "auto",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {/* Spinner overlay while the iframe is loading */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: token.colorBgContainer,
            zIndex: 10,
          }}
        >
          <Spin size="large" />
        </div>
      )}
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

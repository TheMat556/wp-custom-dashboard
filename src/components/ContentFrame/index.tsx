/**
 * ContentFrame — renders the WordPress admin content inside an iframe.
 *
 * Every navigation target is loaded with `?wp_shell_embed=1` so PHP
 * suppresses native WordPress chrome and injects the postMessage script.
 * The parent shell (React) stays alive across all navigations.
 */

import { Spin, theme } from "antd";
import { useEffect, useRef } from "react";
import { useStore } from "zustand";
import { navigationStore } from "../../store/navigationStore";

export default function ContentFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeUrl = useStore(navigationStore, (s) => s.iframeUrl);
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

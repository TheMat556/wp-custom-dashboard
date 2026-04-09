/**
 * ContentFrame — renders the WordPress admin content inside an iframe,
 * or a native React page for shell-managed routes (e.g. branding settings).
 *
 * Every navigation target is loaded with `?wp_shell_embed=1` so PHP
 * suppresses native WordPress chrome and injects the postMessage script.
 * The parent shell (React) stays alive across all navigations.
 */

import { Spin } from "antd";
import { Suspense } from "react";
import { useContentFrameController } from "./useContentFrameController";

export default function ContentFrame() {
  const ctrl = useContentFrameController();

  if (ctrl.ShellPage) {
    const ShellPage = ctrl.ShellPage;
    return (
      <div
        id="wp-react-ui-content"
        tabIndex={-1}
        className="wp-react-ui-shell-content-slot wp-react-ui-shell-content-slot--native"
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
      className="wp-react-ui-shell-content-slot wp-react-ui-shell-content-slot--embed"
    >
      {ctrl.isLoading && <div className="wp-react-ui-content-loading-bar" aria-hidden="true" />}
      <iframe
        ref={ctrl.iframeRef}
        src={ctrl.iframeUrl}
        title="WordPress Admin Content"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        onLoad={ctrl.onIframeLoad}
      />
    </div>
  );
}

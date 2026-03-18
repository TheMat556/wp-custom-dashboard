import React from "react";
import { createRoot } from "react-dom/client";
import { StyleProvider } from "@ant-design/cssinjs";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConfigProvider, theme as antTheme } from "antd";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import type { Theme } from "./context/ThemeContext";
import "./types/wp";

const TOTAL_COMPONENTS = 2;
const COLD_REVEAL_DELAY = 300;
const WARM_REVEAL_DELAY = 80;

type PendingMount = {
  host: HTMLElement;
  shadowHost: HTMLElement;
  mountPoint: HTMLDivElement;
  ready: boolean;
};

const pendingMounts = new Map<string, PendingMount>();
let hasRevealedRoots = false;

function canUseSessionStorage() {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

function getCssWarmKey(url: string) {
  return `wp-react-ui:css-warm:${url}`;
}

function areCssUrlsWarm(urls: string[]) {
  if (!canUseSessionStorage() || urls.length === 0) {
    return false;
  }

  try {
    return urls.every(
      (url) => window.sessionStorage.getItem(getCssWarmKey(url)) === "1"
    );
  } catch {
    return false;
  }
}

function markCssUrlsWarm(urls: string[]) {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    urls.forEach((url) => {
      window.sessionStorage.setItem(getCssWarmKey(url), "1");
    });
  } catch {
    // Ignore storage write failures; warm-path caching is only an optimization.
  }
}

function getCssUrls(): string[] {
  const fromPhp = window.wpReactUi?.cssUrls;
  if (Array.isArray(fromPhp) && fromPhp.length > 0) {
    return fromPhp;
  }
  return [];
}

function getDashiconsUrl(): string | null {
  for (const link of document.querySelectorAll<HTMLLinkElement>(
    'link[rel="stylesheet"]'
  )) {
    if (link.href.includes("dashicons")) {
      return link.href;
    }
  }
  return null;
}

function revealMountedRoots() {
  if (hasRevealedRoots || pendingMounts.size < TOTAL_COMPONENTS) {
    return;
  }

  const allReady = [...pendingMounts.values()].every(({ ready }) => ready);
  if (!allReady) {
    return;
  }

  hasRevealedRoots = true;

  pendingMounts.forEach(({ host, mountPoint }) => {
    const entry = pendingMounts.get(host.id);
    if (entry) {
      entry.shadowHost.style.visibility = "visible";
      entry.shadowHost.style.pointerEvents = "auto";
    }
    mountPoint.style.visibility = "visible";
    host.classList.add("mounted");
  });

  const wpwrap = document.getElementById("wpwrap");
  if (wpwrap) {
    wpwrap.classList.add("react-ready");
  }
}

function registerPendingMount(
  hostId: string,
  host: HTMLElement,
  shadowHost: HTMLElement,
  mountPoint: HTMLDivElement
) {
  pendingMounts.set(hostId, { host, shadowHost, mountPoint, ready: false });
  revealMountedRoots();
}

function markMountReady(hostId: string) {
  const entry = pendingMounts.get(hostId);
  if (!entry || entry.ready) {
    return;
  }

  entry.ready = true;
  revealMountedRoots();
}

function ThemedWrapper({ Component }: { Component: React.ComponentType }) {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm:
          theme === "dark"
            ? antTheme.darkAlgorithm
            : antTheme.defaultAlgorithm,
        token: {
          fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          colorPrimary: "#4f46e5",
        },
      }}
    >
      <Component />
    </ConfigProvider>
  );
}

export function mountInShadow(
  hostId: string,
  Component: React.ComponentType
) {
  const host = document.getElementById(hostId);
  if (!host) {
    console.error(`[WP React UI] Host element #${hostId} not found`);
    return;
  }

  const hasServerShell = host.classList.contains("has-server-shell");
  const shadowHost =
    host.querySelector<HTMLElement>(".wp-react-ui-shadow-host") ?? host;

  host.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-width: 0;
    ${hasServerShell ? "position: relative;" : ""}
  `;

  shadowHost.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-width: 0;
    ${hasServerShell ? "position: absolute; inset: 0; visibility: hidden; pointer-events: none;" : ""}
  `;

  const shadow = shadowHost.attachShadow({ mode: "open" });
  const initialTheme: Theme =
    (window.wpReactUi?.theme ?? "light") as Theme;
  host.setAttribute("data-theme", initialTheme);

  const mountPoint = document.createElement("div");
  mountPoint.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-width: 0;
    visibility: hidden;
  `;
  registerPendingMount(hostId, host, shadowHost, mountPoint);

  // Inject dashicons
  const dashiconsUrl = getDashiconsUrl();
  if (dashiconsUrl) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = dashiconsUrl;
    shadow.appendChild(link);
  }

  const cssUrls = getCssUrls();
  const warmCss = areCssUrlsWarm(cssUrls);

  const renderApp = () => {
    createRoot(mountPoint).render(
      <React.StrictMode>
        <ErrorBoundary name={hostId}>
          <StyleProvider container={shadow}>
            <ThemeProvider>
              <ThemedWrapper Component={Component} />
            </ThemeProvider>
          </StyleProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  };

  shadow.appendChild(mountPoint);

  if (cssUrls.length > 0) {
    // Track how many link tags have loaded
    let loadedCount = 0;
    const total = cssUrls.length;

    const onOneLoaded = () => {
      loadedCount++;
      if (loadedCount >= total) {
        markCssUrlsWarm(cssUrls);
        markMountReady(hostId);
      }
    };

    cssUrls.forEach((url: any) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.addEventListener("load", onOneLoaded, { once: true });
      link.addEventListener("error", onOneLoaded, { once: true }); // don't hang on 404
      shadow.appendChild(link);
    });

    renderApp();

    // Fallback in case load events never fire
    setTimeout(() => {
      if (!host.classList.contains("mounted")) {
        markMountReady(hostId);
      }
    }, warmCss ? WARM_REVEAL_DELAY : COLD_REVEAL_DELAY);
  } else {
    // Dev mode — Vite handles styles, render immediately
    renderApp();
    markMountReady(hostId);
  }
}

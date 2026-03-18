import React from "react";
import { createRoot } from "react-dom/client";
import { StyleProvider } from "@ant-design/cssinjs";
import { ConfigProvider, theme as antTheme } from "antd";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import type { Theme } from "./context/ThemeContext";

let mountedCount = 0;
const TOTAL_COMPONENTS = 2;

function getCssUrls(): string[] {
  const fromPhp = (window as any).wpReactUi?.cssUrls;
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

function onComponentReady(host: HTMLElement) {
  host.classList.add("mounted");
  mountedCount++;

  console.log(
    `[WP React UI] Mounted: ${host.id} (${mountedCount}/${TOTAL_COMPONENTS})`
  );

  if (mountedCount >= TOTAL_COMPONENTS) {
    const wpwrap = document.getElementById("wpwrap");
    if (wpwrap) {
      wpwrap.classList.add("react-ready");
      console.log("[WP React UI] All components ready — revealing wp-content");
    }
  }
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

  host.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-width: 0;
  `;

  const shadow = host.attachShadow({ mode: "open" });
  const initialTheme: Theme =
    ((window as any).wpReactUi?.theme ?? "light") as Theme;
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

  // Inject dashicons
  const dashiconsUrl = getDashiconsUrl();
  if (dashiconsUrl) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = dashiconsUrl;
    shadow.appendChild(link);
  }

  const cssUrls = getCssUrls();

  const renderApp = () => {
    createRoot(mountPoint).render(
      <React.StrictMode>
        <StyleProvider container={shadow}>
          <ThemeProvider>
            <ThemedWrapper Component={Component} />
          </ThemeProvider>
        </StyleProvider>
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
        mountPoint.style.visibility = "visible";
        onComponentReady(host);
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
        mountPoint.style.visibility = "visible";
        onComponentReady(host);
      }
    }, 800);
  } else {
    // Dev mode — Vite handles styles, render immediately
    renderApp();
    mountPoint.style.visibility = "visible";
    onComponentReady(host);
  }
}
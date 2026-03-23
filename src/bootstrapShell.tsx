import { theme as antTheme, ConfigProvider } from "antd";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ShellMountEffects } from "./components/ShellMountEffects";
import { ShellConfigProvider } from "./context/ShellConfigContext";
import { useTheme } from "./context/ThemeContext";
import { bootstrapMenuStore, resetMenuStore } from "./store/menuStore";
import { bootstrapNavigationStore, resetNavigationStore } from "./store/navigationStore";
import { bootstrapSidebarStore, resetSidebarStore } from "./store/sidebarStore";
import { bootstrapThemeStore, resetThemeStore } from "./store/themeStore";
import type { WpReactUiConfig } from "./types/wp";

function AntConfigProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          colorPrimary: "#4f46e5",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

function ShellRoot({ host, config }: { host: HTMLElement; config: Readonly<WpReactUiConfig> }) {
  return (
    <ErrorBoundary name="react-shell-root">
      <ShellConfigProvider config={config}>
        <AntConfigProvider>
          <ShellMountEffects host={host} />
          <App />
        </AntConfigProvider>
      </ShellConfigProvider>
    </ErrorBoundary>
  );
}

export function bootstrapShell(host: HTMLElement, config: Readonly<WpReactUiConfig>) {
  bootstrapMenuStore(config);
  bootstrapThemeStore(config);
  const teardownSidebar = bootstrapSidebarStore();
  const teardownNavigation = bootstrapNavigationStore({
    breakoutPagenow: config.navigation.breakoutPagenow,
  });

  let root: Root | null = createRoot(host);
  root.render(
    <React.StrictMode>
      <ShellRoot host={host} config={config} />
    </React.StrictMode>
  );

  return () => {
    teardownNavigation();
    teardownSidebar();
    root?.unmount();
    root = null;
    resetMenuStore();
    resetThemeStore();
    resetSidebarStore();
    resetNavigationStore();
  };
}

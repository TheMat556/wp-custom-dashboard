import { theme as antTheme, ConfigProvider } from "antd";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { useLayoutEffect } from "react";
import { useStore } from "zustand";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationRenderer } from "./components/NotificationRenderer";
import { ShellMountEffects } from "./components/ShellMountEffects";
import { ShellConfigProvider } from "./context/ShellConfigContext";
import { useShellConfig } from "./context/ShellConfigContext";
import { useTheme } from "./context/ThemeContext";
import { bootstrapBrandingStore, brandingStore, resetBrandingStore } from "./store/brandingStore";
import { bootstrapMenuStore, resetMenuStore } from "./store/menuStore";
import { bootstrapNavigationStore, resetNavigationStore } from "./store/navigationStore";
import { resetNotificationStore } from "./store/notificationStore";
import { bootstrapSidebarStore, resetSidebarStore } from "./store/sidebarStore";
import { bootstrapThemeStore, resetThemeStore } from "./store/themeStore";
import type { WpReactUiConfig } from "./types/wp";
import { getFontFamilyForPreset } from "./utils/fontPresets";

function AntConfigProvider({ children }: { children: React.ReactNode }) {
  const { branding } = useShellConfig();
  const { theme } = useTheme();
  const brandingSettings = useStore(brandingStore, (state) => state.settings);
  const primaryColor = brandingSettings?.primaryColor ?? branding.primaryColor ?? "#4f46e5";
  const fontPreset = brandingSettings?.fontPreset ?? branding.fontPreset ?? "inter";
  const fontFamily = getFontFamilyForPreset(fontPreset);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--wp-react-ui-font-family", fontFamily);
    document.body.style.setProperty("--wp-react-ui-font-family", fontFamily);
  }, [fontFamily]);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          fontFamily,
          colorPrimary: primaryColor,
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
          <NotificationRenderer />
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
  bootstrapBrandingStore(config);
  const teardownSidebar = bootstrapSidebarStore();
  const teardownNavigation = bootstrapNavigationStore({
    breakoutPagenow: config.navigation.breakoutPagenow,
    openInNewTabPatterns: config.navigation.openInNewTabPatterns,
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
    resetNotificationStore();
    resetBrandingStore();
  };
}

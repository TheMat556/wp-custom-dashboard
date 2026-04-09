import { theme as antTheme, ConfigProvider } from "antd";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { useLayoutEffect } from "react";
import { useStore } from "zustand";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NativeCommandPaletteEnhancer } from "./components/NativeCommandPaletteEnhancer";
import { NotificationRenderer } from "./components/NotificationRenderer";
import { SessionExpiredModal } from "./components/SessionExpiredModal";
import { ShellMountEffects } from "./components/ShellMountEffects";
import { ShellConfigProvider } from "./context/ShellConfigContext";
import { useShellConfig } from "./context/ShellConfigContext";
import { useTheme } from "./context/ThemeContext";
import { bootstrapBrandingStore, brandingStore, resetBrandingStore } from "./store/brandingStore";
import { bootstrapSessionStore, resetSessionStore } from "./store/sessionStore";
import { bootstrapMenuCountsStore, resetMenuCountsStore } from "./store/menuCountsStore";
import { bootstrapMenuStore, resetMenuStore } from "./store/menuStore";
import {
  bootstrapNavigationStore,
  navigationStore,
  resetNavigationStore,
} from "./store/navigationStore";
import { resetNotificationStore } from "./store/notificationStore";
import {
  bootstrapShellPreferencesStore,
  resetShellPreferencesStore,
  shellPreferencesStore,
} from "./store/shellPreferencesStore";
import { bootstrapSidebarStore, resetSidebarStore } from "./store/sidebarStore";
import { bootstrapThemeStore, resetThemeStore } from "./store/themeStore";
import { CUSTOM_PRESET_KEY, THEME_PRESETS } from "./config/themePresets";
import type { WpReactUiConfig } from "./types/wp";
import { getFontFamilyForPreset } from "./utils/fontPresets";

function ShellCssVarSync() {
  const { token } = antTheme.useToken();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const cssVars: Record<string, string> = {
      "--wp-react-ui-command-surface": token.colorBgContainer,
      "--wp-react-ui-command-surface-muted": token.colorFillAlter,
      "--wp-react-ui-command-border": token.colorBorderSecondary,
      "--wp-react-ui-command-text": token.colorText,
      "--wp-react-ui-command-text-muted": token.colorTextTertiary,
      "--wp-react-ui-command-shadow": token.boxShadowSecondary,
      "--wp-react-ui-command-item-hover": token.colorFillSecondary,
      "--wp-react-ui-command-item-active": token.colorPrimary,
      "--wp-react-ui-command-item-active-text": token.colorTextLightSolid,
      "--wp-react-ui-scrollbar-track": token.colorFillSecondary,
      "--wp-react-ui-scrollbar-thumb": token.colorTextQuaternary,
      "--wp-react-ui-scrollbar-thumb-hover": token.colorTextTertiary,
      // Keep sidebar gradient in sync with the active theme preset primary color
      "--wp-react-ui-shell-accent-soft": token.colorPrimaryBg,
      "--wp-react-ui-shell-border-strong": token.colorPrimaryBorder,
    };

    for (const [name, value] of Object.entries(cssVars)) {
      root.style.setProperty(name, value);
      body.style.setProperty(name, value);
    }
  }, [token]);

  return null;
}

function AntConfigProvider({ children }: { children: React.ReactNode }) {
  const { branding } = useShellConfig();
  const { theme } = useTheme();
  const brandingSettings = useStore(brandingStore, (state) => state.settings);
  const themePreset = useStore(shellPreferencesStore, (s) => s.themePreset);
  const customPresetColor = useStore(shellPreferencesStore, (s) => s.customPresetColor);

  // Resolve primary color: user preset > branding settings > branding config > default.
  const brandingColor = brandingSettings?.primaryColor ?? branding.primaryColor ?? "#4f46e5";
  let primaryColor = brandingColor;
  if (themePreset === CUSTOM_PRESET_KEY && customPresetColor) {
    primaryColor = customPresetColor;
  } else if (themePreset && themePreset !== "default" && THEME_PRESETS[themePreset]) {
    primaryColor = THEME_PRESETS[themePreset].primaryColor;
  }

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
      <ShellCssVarSync />
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
          <SessionExpiredModal />
          <NativeCommandPaletteEnhancer />
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
  const teardownPreferences = bootstrapShellPreferencesStore(config);
  const teardownSession = bootstrapSessionStore(config);
  const teardownMenuCounts = bootstrapMenuCountsStore(config);
  const teardownSidebar = bootstrapSidebarStore();
  const teardownNavigation = bootstrapNavigationStore({
    breakoutPagenow: config.navigation.breakoutPagenow,
    openInNewTabPatterns: config.navigation.openInNewTabPatterns,
  });
  const teardownRecentPages = navigationStore.subscribe((state, prevState) => {
    if (state.status !== "ready" || !state.pageUrl) {
      return;
    }

    const justBecameReady = prevState.status !== "ready";
    const pageChanged = state.pageUrl !== prevState.pageUrl;

    if (!justBecameReady && !pageChanged) {
      return;
    }

    shellPreferencesStore.getState().recordVisit(state.pageUrl, state.pageTitle);
  });

  let root: Root | null = createRoot(host);
  root.render(
    <React.StrictMode>
      <ShellRoot host={host} config={config} />
    </React.StrictMode>
  );

  return () => {
    teardownRecentPages();
    teardownNavigation();
    teardownSidebar();
    teardownPreferences();
    teardownSession();
    teardownMenuCounts();
    root?.unmount();
    root = null;
    resetMenuStore();
    resetThemeStore();
    resetSidebarStore();
    resetNavigationStore();
    resetNotificationStore();
    resetBrandingStore();
    resetShellPreferencesStore();
    resetSessionStore();
    resetMenuCountsStore();
  };
}

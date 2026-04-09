import { theme as antTheme, ConfigProvider } from "antd";
import React, { useLayoutEffect, useMemo } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useStore } from "zustand";
import { CUSTOM_PRESET_KEY, THEME_PRESETS } from "../../config/themePresets";
import { resetNotificationStore } from "../../store/notificationStore";
import type { WpReactUiConfig } from "../../types/wp";
import { getFontFamilyForPreset } from "../../utils/fontPresets";
import { bootstrapActivityStore, resetActivityStore } from "../activity/store/activityStore";
import {
  bootstrapBrandingStore,
  brandingStore,
  resetBrandingStore,
} from "../branding/store/brandingStore";
import { bootstrapDashboardStore, resetDashboardStore } from "../dashboard/store/dashboardStore";
import {
  bootstrapMenuCountsStore,
  resetMenuCountsStore,
} from "../navigation/store/menuCountsStore";
import { bootstrapMenuStore, resetMenuStore } from "../navigation/store/menuStore";
import {
  bootstrapNavigationStore,
  navigationStore,
  resetNavigationStore,
} from "../navigation/store/navigationStore";
import { SessionExpiredModal } from "../session/components/SessionExpiredModal";
import { SessionHeartbeatEffect } from "../session/components/SessionHeartbeatEffect";
import { bootstrapSessionStore, resetSessionStore } from "../session/store/sessionStore";
import App from "./AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NativeCommandPaletteEnhancer } from "./components/NativeCommandPaletteEnhancer";
import { NotificationRenderer } from "./components/NotificationRenderer";
import { ShellMountEffects } from "./components/ShellMountEffects";
import { ShellConfigProvider, useShellConfig } from "./context/ShellConfigContext";
import { useTheme } from "./context/ThemeContext";
import {
  bootstrapShellPreferencesStore,
  resetShellPreferencesStore,
  shellPreferencesStore,
} from "./store/shellPreferencesStore";
import { bootstrapSidebarStore, resetSidebarStore } from "./store/sidebarStore";
import { bootstrapThemeStore, resetThemeStore } from "./store/themeStore";

function applyCssVars(cssVars: Record<string, string>) {
  const targets = [
    document.documentElement,
    document.body,
    document.getElementById("react-shell-root"),
  ].filter((target): target is HTMLElement => target instanceof HTMLElement);

  for (const target of targets) {
    for (const [name, value] of Object.entries(cssVars)) {
      target.style.setProperty(name, value);
    }
  }
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
  const algorithm = theme === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm;
  const resolvedAntTokens = useMemo(
    () =>
      antTheme.getDesignToken({
        algorithm,
        token: {
          fontFamily,
          colorPrimary: primaryColor,
        },
      }),
    [algorithm, fontFamily, primaryColor]
  );

  useLayoutEffect(() => {
    applyCssVars({
      "--font-display": fontFamily,
      "--font-body": fontFamily,
      "--wp-react-ui-font-family": fontFamily,
      "--color-accent-primary": resolvedAntTokens.colorPrimary,
      "--color-accent-primary-hover": resolvedAntTokens.colorPrimaryHover,
      "--color-accent-soft": resolvedAntTokens.colorPrimaryBg,
      "--color-text-on-accent": resolvedAntTokens.colorTextLightSolid,
      "--focus-ring": resolvedAntTokens.colorPrimaryBorder,
    });
  }, [fontFamily, resolvedAntTokens]);

  return (
    <ConfigProvider
      theme={{
        algorithm,
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
          <SessionHeartbeatEffect />
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
  const teardownTheme = bootstrapThemeStore(config);
  bootstrapBrandingStore(config);
  bootstrapActivityStore(config);
  bootstrapDashboardStore(config);
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
    teardownTheme();
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
    resetActivityStore();
    resetDashboardStore();
    resetShellPreferencesStore();
    resetSessionStore();
    resetMenuCountsStore();
  };
}

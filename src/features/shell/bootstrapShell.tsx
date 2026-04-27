import { theme as antTheme, ConfigProvider } from "antd";
import React, { useLayoutEffect, useMemo } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useStore } from "zustand";
import { CUSTOM_PRESET_KEY, THEME_PRESETS } from "../../config/themePresets";
import { resetNotificationStore } from "../../store/notificationStore";
import type { WpReactUiConfig } from "../../types/wp";
import { getFontFamilyForPreset } from "../../utils/fontPresets";
import { bootstrapActivityStore, resetActivityStore } from "../activity";
import { bootstrapBrandingStore, brandingStore, resetBrandingStore } from "../branding";
import { bootstrapDashboardStore, resetDashboardStore } from "../dashboard";
import { bootstrapLicenseStore, LicenseProvider, resetLicenseStore } from "../license";
import {
  bootstrapMenuCountsStore,
  bootstrapMenuStore,
  bootstrapNavigationStore,
  navigationStore,
  resetMenuCountsStore,
  resetMenuStore,
  resetNavigationStore,
} from "../navigation";
import {
  bootstrapSessionStore,
  resetSessionStore,
  SessionExpiredModal,
  SessionHeartbeatEffect,
} from "../session";
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
  const isDark = theme === "dark";
  const algorithm = isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm;
  const tooltipBackground = isDark ? "#131c2b" : "#ffffff";
  const tooltipTextColor = isDark ? "#f8fafc" : "#172033";

  // Bridge Ant Design's generic dark tokens to the shell's navy palette so all
  // components (Button, Alert, Card, etc.) inherit the correct dark backgrounds.
  const darkTokenOverrides = useMemo(
    () =>
      isDark
        ? {
            colorBgContainer: "#131c2b", // --color-bg-surface
            colorBgElevated: "#192437", // elevated surfaces (dropdowns, popovers)
            colorBgLayout: "#0f1723", // --color-bg-app
            colorFillAlter: "#1a2435", // table stripes, tree hover, etc.
            colorFillSecondary: "#1e2a3b", // secondary fills
            colorBorderSecondary: "rgba(255,255,255,0.09)", // --color-border-subtle
            colorBorder: "rgba(255,255,255,0.12)", // --color-border-strong
          }
        : {},
    [isDark]
  );

  const resolvedAntTokens = useMemo(
    () =>
      antTheme.getDesignToken({
        algorithm,
        token: {
          fontFamily,
          colorPrimary: primaryColor,
          ...darkTokenOverrides,
        },
      }),
    [algorithm, fontFamily, primaryColor, darkTokenOverrides]
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
      getPopupContainer={() => document.body}
      getTargetContainer={() => document.body}
      theme={{
        algorithm,
        token: {
          fontFamily,
          colorPrimary: primaryColor,
          zIndexPopupBase: 100100,
          ...darkTokenOverrides,
        },
        components: {
          Tooltip: {
            colorBgSpotlight: tooltipBackground,
            colorTextLightSolid: tooltipTextColor,
          },
          ...(isDark && {
            Button: {
              defaultBg: "rgba(255,255,255,0.06)",
              defaultBorderColor: "rgba(255,255,255,0.18)",
              defaultColor: "#e2e8f0",
              defaultHoverBg: "rgba(255,255,255,0.10)",
              defaultHoverBorderColor: "rgba(255,255,255,0.28)",
              defaultHoverColor: "#f8fafc",
              defaultActiveBg: "rgba(255,255,255,0.13)",
              defaultActiveBorderColor: "rgba(255,255,255,0.32)",
            },
          }),
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
        <LicenseProvider>
          <AntConfigProvider>
            <NotificationRenderer />
            <SessionHeartbeatEffect />
            <SessionExpiredModal />
            <NativeCommandPaletteEnhancer />
            <ShellMountEffects host={host} />
            <App />
          </AntConfigProvider>
        </LicenseProvider>
      </ShellConfigProvider>
    </ErrorBoundary>
  );
}

export function bootstrapShell(host: HTMLElement, config: Readonly<WpReactUiConfig>) {
  bootstrapMenuStore(config);
  bootstrapLicenseStore(config);
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
    resetLicenseStore();
    resetShellPreferencesStore();
    resetSessionStore();
    resetMenuCountsStore();
  };
}

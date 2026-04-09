import {
  DEFAULT_WP_REACT_UI_BOOT_CONFIG,
  type WpReactUiBootConfig,
  type WpReactUiWindowBootConfig,
} from "../generated/contracts/boot";

export type { WpReactUiBootConfig, WpReactUiWindowBootConfig } from "../generated/contracts/boot";

export function getBootConfig(): WpReactUiBootConfig {
  const raw = typeof window === "undefined" ? undefined : window.wpReactUiBoot;

  return {
    layout: {
      mobileBreakpoint:
        raw?.layout?.mobileBreakpoint ?? DEFAULT_WP_REACT_UI_BOOT_CONFIG.layout.mobileBreakpoint,
      collapsedStorageKey:
        raw?.layout?.collapsedStorageKey ??
        DEFAULT_WP_REACT_UI_BOOT_CONFIG.layout.collapsedStorageKey,
      sidebarWidths: {
        expanded:
          raw?.layout?.sidebarWidths?.expanded ??
          DEFAULT_WP_REACT_UI_BOOT_CONFIG.layout.sidebarWidths.expanded,
        collapsed:
          raw?.layout?.sidebarWidths?.collapsed ??
          DEFAULT_WP_REACT_UI_BOOT_CONFIG.layout.sidebarWidths.collapsed,
        mobile:
          raw?.layout?.sidebarWidths?.mobile ??
          DEFAULT_WP_REACT_UI_BOOT_CONFIG.layout.sidebarWidths.mobile,
      },
    },
    theme: {
      storageKey: raw?.theme?.storageKey ?? DEFAULT_WP_REACT_UI_BOOT_CONFIG.theme.storageKey,
    },
  };
}

declare global {
  interface Window {
    wpReactUiBoot?: WpReactUiWindowBootConfig;
    __wpReactUiTeardown?: (() => void) | undefined;
  }
}

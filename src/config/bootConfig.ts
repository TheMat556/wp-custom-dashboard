export interface WpReactUiBootConfig {
  layout: {
    mobileBreakpoint: number;
    collapsedStorageKey: string;
    sidebarWidths: {
      expanded: number;
      collapsed: number;
      mobile: number;
    };
  };
  theme: {
    storageKey: string;
  };
}

export type WpReactUiWindowBootConfig = Partial<WpReactUiBootConfig> & {
  layout?: Partial<WpReactUiBootConfig["layout"]> & {
    sidebarWidths?: Partial<WpReactUiBootConfig["layout"]["sidebarWidths"]>;
  };
  theme?: Partial<WpReactUiBootConfig["theme"]>;
};

const DEFAULT_BOOT_CONFIG: WpReactUiBootConfig = {
  layout: {
    mobileBreakpoint: 768,
    collapsedStorageKey: "wp-react-sidebar-collapsed",
    sidebarWidths: {
      expanded: 240,
      collapsed: 64,
      mobile: 0,
    },
  },
  theme: {
    storageKey: "wp-react-ui-theme",
  },
};

export function getBootConfig(): WpReactUiBootConfig {
  const raw = typeof window === "undefined" ? undefined : window.wpReactUiBoot;

  return {
    layout: {
      mobileBreakpoint:
        raw?.layout?.mobileBreakpoint ?? DEFAULT_BOOT_CONFIG.layout.mobileBreakpoint,
      collapsedStorageKey:
        raw?.layout?.collapsedStorageKey ?? DEFAULT_BOOT_CONFIG.layout.collapsedStorageKey,
      sidebarWidths: {
        expanded:
          raw?.layout?.sidebarWidths?.expanded ?? DEFAULT_BOOT_CONFIG.layout.sidebarWidths.expanded,
        collapsed:
          raw?.layout?.sidebarWidths?.collapsed ??
          DEFAULT_BOOT_CONFIG.layout.sidebarWidths.collapsed,
        mobile:
          raw?.layout?.sidebarWidths?.mobile ?? DEFAULT_BOOT_CONFIG.layout.sidebarWidths.mobile,
      },
    },
    theme: {
      storageKey: raw?.theme?.storageKey ?? DEFAULT_BOOT_CONFIG.theme.storageKey,
    },
  };
}

declare global {
  interface Window {
    wpReactUiBoot?: WpReactUiWindowBootConfig;
    __wpReactUiTeardown?: (() => void) | undefined;
  }
}

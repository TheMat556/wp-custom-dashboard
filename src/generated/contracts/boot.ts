// AUTO-GENERATED from contracts/source. Do not edit.

import type { LicenseResponse, MenuItem } from "./dto";

export interface WpReactUiConfig {
  menu: Array<MenuItem>;
  siteName: string;
  branding: {
    siteName: string;
    logos: {
      lightUrl: string | null;
      darkUrl: string | null;
      longUrl: string | null;
      defaultUrl: string;
    };
    useLongLogo: boolean;
    primaryColor: string;
    fontPreset: string;
  };
  theme: "light" | "dark";
  adminUrl: string;
  publicUrl: string;
  navigation: {
    fullReloadPageParams: Array<string>;
    shellDisabledPagenow: Array<string>;
    breakoutPagenow: Array<string>;
    openInNewTabPatterns: Array<string>;
  };
  nonce: string;
  restUrl: string;
  logoutUrl: string;
  assetsUrl: string;
  locale: string;
  user: {
    name: string;
    role: string;
    canManageOptions?: boolean;
  };
  license: LicenseResponse;
  shellRoutes: Array<{
    slug: string;
    label: string;
    entrypoint_url: string;
  }>;
}

export type WpReactUiBranding = WpReactUiConfig["branding"];
export type WpReactUiBrandingLogos = WpReactUiConfig["branding"]["logos"];
export type WpReactUiNavigationConfig = WpReactUiConfig["navigation"];
export type WpReactUiUser = WpReactUiConfig["user"];
export type WpReactUiShellRoute = WpReactUiConfig["shellRoutes"][number];

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

export type ContractWindowShape<T> =
  T extends Array<infer TItem>
    ? Array<TItem>
    : T extends object
      ? { [K in keyof T]?: ContractWindowShape<T[K]> }
      : T;

export type WpReactUiWindowConfig = ContractWindowShape<WpReactUiConfig>;
export type WpReactUiWindowBootConfig = ContractWindowShape<WpReactUiBootConfig>;

export const BOOT_PAYLOAD_TOP_LEVEL_KEYS = [
  "menu",
  "siteName",
  "branding",
  "theme",
  "adminUrl",
  "publicUrl",
  "navigation",
  "nonce",
  "restUrl",
  "logoutUrl",
  "assetsUrl",
  "locale",
  "user",
  "license",
  "shellRoutes",
] as const;
export const BOOT_PAYLOAD_BRANDING_KEYS = [
  "siteName",
  "logos",
  "useLongLogo",
  "primaryColor",
  "fontPreset",
] as const;
export const BOOT_PAYLOAD_BRANDING_LOGO_KEYS = [
  "lightUrl",
  "darkUrl",
  "longUrl",
  "defaultUrl",
] as const;
export const BOOT_PAYLOAD_NAVIGATION_KEYS = [
  "fullReloadPageParams",
  "shellDisabledPagenow",
  "breakoutPagenow",
  "openInNewTabPatterns",
] as const;
export const BOOT_PAYLOAD_USER_KEYS = ["name", "role", "canManageOptions"] as const;
export const SHELL_ROUTE_KEYS = ["slug", "label", "entrypoint_url"] as const;

export const DEFAULT_WP_REACT_UI_BOOT_CONFIG: WpReactUiBootConfig = {
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

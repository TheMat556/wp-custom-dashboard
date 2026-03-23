import type { MenuItem } from "../hooks/useMenu";

interface WpReactUiBrandingLogos {
  lightUrl: string | null;
  darkUrl: string | null;
  defaultUrl: string;
}

interface WpReactUiBranding {
  siteName: string;
  logos: WpReactUiBrandingLogos;
}

interface WpReactUiNavigationConfig {
  /** Pages that the shell loads in the iframe and handles normally. */
  fullReloadPageParams?: string[];
  /** Pages where the React shell should not bootstrap (e.g. classic admin). */
  shellDisabledPagenow?: string[];
  /** Pages that must be the top-level document (cannot run in the iframe). */
  breakoutPagenow?: string[];
}

declare global {
  interface Window {
    wpReactUi?: {
      adminUrl?: string;
      menu?: MenuItem[];
      menuVersion?: number;
      restUrl?: string;
      nonce?: string;
      siteName?: string;
      branding?: WpReactUiBranding;
      theme?: string;
      assetsUrl?: string;
      publicUrl?: string;
      navigation?: WpReactUiNavigationConfig;
      logoutUrl?: string;
      logoutNonce?: string;
      user?: {
        name: string;
        role: string;
      };
    };
  }
}

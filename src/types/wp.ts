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
  fullReloadPageParams?: string[];
  shellDisabledPagenow?: string[];
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
    __wpReactUiTransitionState?: {
      active: boolean;
      id: number;
      startedAt: number;
      targetUrl: string;
    };
  }
}

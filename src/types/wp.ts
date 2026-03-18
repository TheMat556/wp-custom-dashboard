import type { MenuItem } from "../hooks/useMenu";

declare global {
  interface Window {
    wpReactUi?: {
      adminUrl?: string;
      menu?: MenuItem[];
      menuVersion?: number;
      restUrl?: string;
      nonce?: string;
      siteName?: string;
      theme?: string;
      assetsUrl?: string;
      publicUrl?: string;
      cssUrls?: string[];
      logoutUrl?: string;
      logoutNonce?: string;
      user?: {
        name: string;
        role: string;
        avatar: string;
      };
    };
  }
}

export {};

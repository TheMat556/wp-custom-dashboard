import type { WpReactUiConfig } from "../types/wp";

export interface ThemeService {
  saveTheme(theme: "light" | "dark"): Promise<void>;
}

export function createThemeService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
): ThemeService {
  return {
    async saveTheme(theme) {
      const response = await fetch(`${config.restUrl}/theme`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": config.nonce,
        },
        body: JSON.stringify({ theme }),
      });

      if (!response.ok) {
        throw new Error(`Theme save failed: ${response.status}`);
      }
    },
  };
}

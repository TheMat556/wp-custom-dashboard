import { theme as antTheme, type ThemeConfig } from "antd";

/**
 * Chat-specific Ant Design theme. Respects dark/light mode via algorithm.
 * Only overrides layout/border-radius/font — colors come from the algorithm.
 */
export function createChatTheme(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: "#1677ff",
      borderRadius: 8,
      borderRadiusLG: 10,
      fontFamily: '"Inter", "Segoe UI", -apple-system, sans-serif',
    },
  };
}

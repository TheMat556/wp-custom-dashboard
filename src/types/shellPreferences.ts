import type { RecentPageRecord } from "../utils/commandPalette";

export interface PersistedShellPreferences {
  favorites: string[];
  recentPages: RecentPageRecord[];
  density: "comfortable" | "compact";
  themePreset: string;
  customPresetColor: string;
  dashboardWidgetOrder: string[];
  hiddenWidgets: string[];
  highContrast: boolean;
}

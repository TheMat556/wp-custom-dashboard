import type { RecentPageRecord } from "../utils/commandPalette";

export const WIDGET_SIZES = ["1x", "2x", "half", "full"] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];

export const KPI_CONTAINER_COLUMNS = [2, 3, 4, 5] as const;
export type KpiContainerColumns = (typeof KPI_CONTAINER_COLUMNS)[number];

export interface KpiContainerInstanceConfig {
  /** Internal order of KPI keys inside this container instance */
  order: string[];
  /** Number of columns in the sub-grid */
  columns: KpiContainerColumns;
}

export interface PersistedShellPreferences {
  favorites: string[];
  recentPages: RecentPageRecord[];
  density: "comfortable" | "compact";
  themePreset: string;
  customPresetColor: string;
  dashboardWidgetOrder: string[];
  hiddenWidgets: string[];
  dashboardWidgetSizes: Record<string, WidgetSize>;
  highContrast: boolean;
  /** Config per KPI container instance (keyed by instance ID) */
  kpiContainerInstances: Record<string, KpiContainerInstanceConfig>;
}

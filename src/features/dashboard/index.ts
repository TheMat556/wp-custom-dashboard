// Dashboard feature public API
// NOTE: DashboardPage is intentionally NOT re-exported here. It is loaded via
// `lazy(() => import(".../components/DashboardPage"))` from the shell route
// controller. Re-exporting it from this barrel would pull it into the static
// import graph of any consumer of this barrel (stores, types, utils), which
// makes the dynamic import ineffective and bloats the main chunk.

export type { WidgetSize } from "../../types/shellPreferences";
export { useQuickDraft } from "./hooks/useQuickDraft";
export type { DashboardEditModeState } from "./store/dashboardEditModeStore";
export { dashboardEditModeStore } from "./store/dashboardEditModeStore";
export type { DashboardState } from "./store/dashboardStore";
export {
  bootstrapDashboardStore,
  dashboardStore,
  resetDashboardStore,
} from "./store/dashboardStore";
export type {
  DashboardWidgetMeta,
  WidgetRenderProps,
} from "./widgets/widgetRegistry";
export {
  DASHBOARD_WIDGETS,
  DEFAULT_WIDGET_ORDER,
  getHiddenWidgets,
  getVisibleWidgets,
  mergeWidgetOrder,
} from "./widgets/widgetRegistry";

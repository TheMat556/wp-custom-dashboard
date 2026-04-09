import { createStore } from "zustand/vanilla";
import type { DashboardData } from "../services/dashboardApi";
import { initDashboardService, clearDashboardService } from "./dashboardActions";
import type { WpReactUiConfig } from "../../../types/wp";

export interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
}

export const dashboardStore = createStore<DashboardState>(() => ({
  data: null,
  loading: false,
}));

export function bootstrapDashboardStore(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
) {
  initDashboardService(config);
  dashboardStore.setState({ data: null, loading: false });
}

export function resetDashboardStore() {
  clearDashboardService();
  dashboardStore.setState({ data: null, loading: false });
}

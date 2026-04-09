import { createStore } from "zustand/vanilla";
import {
  type DashboardData,
  type DashboardService,
  createDashboardService,
} from "../services/dashboardApi";
import type { WpReactUiConfig } from "../../../types/wp";

export interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  service: DashboardService | null;
  load: () => Promise<void>;
}

export const dashboardStore = createStore<DashboardState>((set, get) => ({
  data: null,
  loading: false,
  service: null,

  async load() {
    const { service } = get();
    if (!service || get().loading) return;

    set({ loading: true });
    try {
      const data = await service.fetchDashboard();
      set({ data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));

export function bootstrapDashboardStore(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
) {
  const service = createDashboardService(config);
  dashboardStore.setState({ data: null, loading: false, service });
}

export function resetDashboardStore() {
  dashboardStore.setState({ data: null, loading: false, service: null });
}

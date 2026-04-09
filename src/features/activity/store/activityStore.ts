import { createStore } from "zustand/vanilla";
import type { ActivityEntry, ActivityFilters } from "../services/activityApi";
import { initActivityService, clearActivityService } from "./activityActions";
import type { WpReactUiConfig } from "../../../types/wp";

export interface ActivityState {
  entries: ActivityEntry[];
  total: number;
  page: number;
  perPage: number;
  loading: boolean;
  filters: ActivityFilters;
}

export const activityStore = createStore<ActivityState>(() => ({
  entries: [],
  total: 0,
  page: 1,
  perPage: 20,
  loading: false,
  filters: {},
}));

export function bootstrapActivityStore(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
) {
  initActivityService(config);
  activityStore.setState({ entries: [], total: 0, loading: false, filters: {} });
}

export function resetActivityStore() {
  clearActivityService();
  activityStore.setState({
    entries: [],
    total: 0,
    page: 1,
    perPage: 20,
    loading: false,
    filters: {},
  });
}

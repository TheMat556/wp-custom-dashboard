import { createStore } from "zustand/vanilla";
import {
  type ActivityEntry,
  type ActivityFilters,
  type ActivityService,
  createActivityService,
} from "../services/activityApi";
import type { WpReactUiConfig } from "../types/wp";

export interface ActivityState {
  entries: ActivityEntry[];
  total: number;
  page: number;
  perPage: number;
  loading: boolean;
  filters: ActivityFilters;
  service: ActivityService | null;
  load: (filters?: ActivityFilters) => Promise<void>;
  setFilters: (filters: Partial<ActivityFilters>) => void;
}

export const activityStore = createStore<ActivityState>((set, get) => ({
  entries: [],
  total: 0,
  page: 1,
  perPage: 20,
  loading: false,
  filters: {},
  service: null,

  async load(overrides?: ActivityFilters) {
    const { service } = get();
    if (!service || get().loading) return;

    const filters = { ...get().filters, ...overrides };
    set({ loading: true, filters });

    try {
      const data = await service.fetchActivity(filters);
      set({
        entries: data.entries,
        total: data.total,
        page: data.page,
        perPage: data.perPage,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  setFilters(partial) {
    const filters = { ...get().filters, ...partial, page: 1 };
    set({ filters });
    get().load(filters);
  },
}));

export function bootstrapActivityStore(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
) {
  const service = createActivityService(config);
  activityStore.setState({ service, entries: [], total: 0, loading: false, filters: {} });
}

export function resetActivityStore() {
  activityStore.setState({
    entries: [],
    total: 0,
    page: 1,
    perPage: 20,
    loading: false,
    filters: {},
    service: null,
  });
}

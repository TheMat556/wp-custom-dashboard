import type { WpReactUiConfig } from "../../../types/wp";
import {
  type ActivityFilters,
  type ActivityService,
  createActivityService,
} from "../services/activityApi";
import { activityStore } from "./activityStore";

let _service: ActivityService | null = null;

export function initActivityService(config: Pick<WpReactUiConfig, "restUrl" | "nonce">) {
  _service = createActivityService(config);
}

export function clearActivityService() {
  _service = null;
}

export async function loadActivity(filters?: ActivityFilters) {
  if (!_service || activityStore.getState().loading) return;
  const merged = { ...activityStore.getState().filters, ...filters };
  activityStore.setState({ loading: true, filters: merged });
  try {
    const data = await _service.fetchActivity(merged);
    activityStore.setState({
      entries: data.entries,
      total: data.total,
      page: data.page,
      perPage: data.perPage,
      loading: false,
    });
  } catch {
    activityStore.setState({ loading: false });
  }
}

export function setActivityFilters(partial: Partial<ActivityFilters>) {
  const current = activityStore.getState().filters;
  const filters = { ...current, ...partial, page: 1 };
  activityStore.setState({ filters });
  void loadActivity(filters);
}

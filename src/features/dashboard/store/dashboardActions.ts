import { createDashboardService, type DashboardService } from "../services/dashboardApi";
import type { WpReactUiConfig } from "../../../types/wp";
import { dashboardStore } from "./dashboardStore";

let _service: DashboardService | null = null;

export function initDashboardService(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">,
) {
  _service = createDashboardService(config);
}

export function clearDashboardService() {
  _service = null;
}

export async function loadDashboard() {
  if (!_service || dashboardStore.getState().loading) return;
  dashboardStore.setState({ loading: true });
  try {
    const data = await _service.fetchDashboard();
    dashboardStore.setState({ data, loading: false });
  } catch {
    dashboardStore.setState({ loading: false });
  }
}

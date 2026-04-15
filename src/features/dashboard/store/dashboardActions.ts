import { isLicenseFeatureDisabledError } from "../../../shared/services/pluginApiError";
import type { WpReactUiConfig } from "../../../types/wp";
import { loadLicenseStatus } from "../../license/store/licenseActions";
import { createDashboardService, type DashboardService } from "../services/dashboardApi";
import { dashboardStore } from "./dashboardStore";

let _service: DashboardService | null = null;

export function initDashboardService(config: Pick<WpReactUiConfig, "restUrl" | "nonce">) {
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
  } catch (error) {
    if (isLicenseFeatureDisabledError(error)) {
      await loadLicenseStatus();
      dashboardStore.setState({ data: null, loading: false });
      return;
    }

    dashboardStore.setState({ loading: false });
  }
}

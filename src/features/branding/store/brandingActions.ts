import { isLicenseFeatureDisabledError } from "../../../shared/services/pluginApiError";
import { notificationStore } from "../../../store/notificationStore";
import { loadLicenseStatus } from "../../license/store/licenseActions";
import {
  type BrandingSaveInput,
  type BrandingService,
  createBrandingService,
} from "../services/brandingApi";
import { brandingStore } from "./brandingStore";

let _service: BrandingService | null = null;

export function initBrandingService(config: { restUrl: string; nonce: string }) {
  _service = createBrandingService(config);
}

export function clearBrandingService() {
  _service = null;
}

export async function loadBranding() {
  if (!_service) return;
  brandingStore.setState({ loading: true });
  try {
    const settings = await _service.fetchBranding();
    brandingStore.setState({ settings, loading: false });
  } catch (error) {
    if (isLicenseFeatureDisabledError(error)) {
      await loadLicenseStatus();
      brandingStore.setState({ settings: null, loading: false });
      return;
    }

    notificationStore.getState().push({
      type: "error",
      message: "Failed to load branding settings",
    });
    brandingStore.setState({ loading: false });
  }
}

export async function saveBranding(data: BrandingSaveInput): Promise<boolean> {
  if (!_service) return false;
  brandingStore.setState({ saving: true });
  try {
    const settings = await _service.saveBranding(data);
    brandingStore.setState({ settings, saving: false });
    notificationStore.getState().push({ type: "info", message: "Settings saved" });
    return true;
  } catch (error) {
    if (isLicenseFeatureDisabledError(error)) {
      await loadLicenseStatus();
      brandingStore.setState({ saving: false });
      return false;
    }

    notificationStore.getState().push({
      type: "error",
      message: "Failed to save branding settings",
    });
    brandingStore.setState({ saving: false });
    return false;
  }
}

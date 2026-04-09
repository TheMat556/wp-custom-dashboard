import { notificationStore } from "../../../store/notificationStore";
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
  } catch {
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
  } catch {
    brandingStore.setState({ saving: false });
    return false;
  }
}

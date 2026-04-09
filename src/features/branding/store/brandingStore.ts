import { createStore } from "zustand/vanilla";
import type { BrandingData } from "../services/brandingApi";
import { clearBrandingService, initBrandingService } from "./brandingActions";

export interface BrandingStoreState {
  settings: BrandingData | null;
  loading: boolean;
  saving: boolean;
}

export const brandingStore = createStore<BrandingStoreState>(() => ({
  settings: null,
  loading: false,
  saving: false,
}));

export function bootstrapBrandingStore(config: { restUrl: string; nonce: string }) {
  initBrandingService(config);
  brandingStore.setState({ settings: null, loading: false, saving: false });
}

export function resetBrandingStore() {
  clearBrandingService();
  brandingStore.setState({
    settings: null,
    loading: false,
    saving: false,
  });
}

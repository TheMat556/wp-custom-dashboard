import { createStore } from "zustand/vanilla";
import {
  type BrandingData,
  type BrandingSaveInput,
  type BrandingService,
  createBrandingService,
} from "../services/brandingApi";
import { notificationStore } from "../../../store/notificationStore";

export interface BrandingStoreState {
  settings: BrandingData | null;
  loading: boolean;
  saving: boolean;
  service: BrandingService | null;
  load(): Promise<void>;
  save(data: BrandingSaveInput): Promise<boolean>;
}

export const brandingStore = createStore<BrandingStoreState>((set, get) => ({
  settings: null,
  loading: false,
  saving: false,
  service: null,

  async load() {
    const service = get().service;
    if (!service) return;

    set({ loading: true });
    try {
      const settings = await service.fetchBranding();
      set({ settings, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  async save(data) {
    const service = get().service;
    if (!service) return false;

    set({ saving: true });
    try {
      const settings = await service.saveBranding(data);
      set({ settings, saving: false });
      notificationStore.getState().push({
        type: "info",
        message: "Settings saved",
      });
      return true;
    } catch {
      set({ saving: false });
      return false;
    }
  },
}));

export function bootstrapBrandingStore(config: { restUrl: string; nonce: string }) {
  brandingStore.setState({
    service: createBrandingService(config),
  });
}

export function resetBrandingStore() {
  brandingStore.setState({
    settings: null,
    loading: false,
    saving: false,
    service: null,
  });
}

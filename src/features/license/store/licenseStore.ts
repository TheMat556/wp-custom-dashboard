import { createStore } from "zustand/vanilla";
import type { LicenseResponse } from "../../../generated/contracts/dto";
import type { WpReactUiConfig } from "../../../types/wp";
import { clearLicenseService, initLicenseService } from "./licenseActions";

export interface LicenseStoreState extends LicenseResponse {
  loading: boolean;
  saving: boolean;
}

export const DEFAULT_LICENSE_STATE: LicenseResponse = {
  status: "disabled",
  role: null,
  tier: null,
  expiresAt: null,
  features: [],
  graceDaysRemaining: 0,
  hasKey: false,
  keyPrefix: null,
  serverConfigured: false,
};

export const licenseStore = createStore<LicenseStoreState>(() => ({
  ...DEFAULT_LICENSE_STATE,
  loading: false,
  saving: false,
}));

export function bootstrapLicenseStore(
  config: Pick<WpReactUiConfig, "license" | "restUrl" | "nonce">
) {
  initLicenseService(config);
  licenseStore.setState({
    ...DEFAULT_LICENSE_STATE,
    ...config.license,
    loading: false,
    saving: false,
  });
}

export function resetLicenseStore() {
  clearLicenseService();
  licenseStore.setState({
    ...DEFAULT_LICENSE_STATE,
    loading: false,
    saving: false,
  });
}

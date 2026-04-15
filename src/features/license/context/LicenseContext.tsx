import { createContext, type ReactNode, useContext } from "react";
import { useStore } from "zustand";
import type { LicenseResponse } from "../../../generated/contracts/dto";
import { type LicenseStoreState, licenseStore } from "../store/licenseStore";

const LicenseContext = createContext<LicenseResponse | null>(null);

function selectLicenseSnapshot(state: LicenseStoreState): LicenseResponse {
  return {
    status: state.status,
    role: state.role,
    tier: state.tier,
    expiresAt: state.expiresAt,
    features: state.features,
    graceDaysRemaining: state.graceDaysRemaining,
    hasKey: state.hasKey,
    keyPrefix: state.keyPrefix,
    serverConfigured: state.serverConfigured,
  } satisfies LicenseResponse;
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const state = useStore(licenseStore);
  const value = selectLicenseSnapshot(state);

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense() {
  const value = useContext(LicenseContext);

  if (!value) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }

  return value;
}

export function useFeature(feature: string) {
  return useStore(licenseStore, (state) => {
    if (state.status === "disabled") {
      return false;
    }

    if (state.status === "expired" && state.graceDaysRemaining <= 0) {
      return false;
    }

    return state.features.includes(feature.trim().toLowerCase());
  });
}

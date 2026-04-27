import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { licenseStore, resetLicenseStore } from "../store/licenseStore";
import { LicenseProvider, useFeature, useLicense } from "./LicenseContext";

function Wrapper({ children }: { children: ReactNode }) {
  return <LicenseProvider>{children}</LicenseProvider>;
}

describe("LicenseContext", () => {
  beforeEach(() => {
    resetLicenseStore();
  });

  afterEach(() => {
    resetLicenseStore();
  });

  it("returns false for disabled features", () => {
    licenseStore.setState({
      status: "disabled",
      role: null,
      tier: null,
      expiresAt: null,
      features: ["chat"],
      graceDaysRemaining: 0,
      hasKey: true,
      keyPrefix: "01234567",
      serverConfigured: true,
      loading: false,
      saving: false,
    });

    const { result } = renderHook(() => useFeature("chat"), { wrapper: Wrapper });

    expect(result.current).toBe(false);
  });

  it("keeps features enabled during grace and exposes grace metadata", () => {
    licenseStore.setState({
      status: "grace",
      role: "customer",
      tier: "pro",
      expiresAt: "2030-01-01 00:00:00",
      features: ["chat", "dashboard"],
      graceDaysRemaining: 4,
      hasKey: true,
      keyPrefix: "01234567",
      serverConfigured: true,
      loading: false,
      saving: false,
    });

    const { result } = renderHook(
      () => ({
        license: useLicense(),
        canUseChat: useFeature("chat"),
      }),
      { wrapper: Wrapper }
    );

    expect(result.current.canUseChat).toBe(true);
    expect(result.current.license.status).toBe("grace");
    expect(result.current.license.graceDaysRemaining).toBe(4);
    expect(result.current.license.tier).toBe("pro");
  });

  it("keeps features enabled for expired licenses while grace remains", () => {
    licenseStore.setState({
      status: "expired",
      role: "customer",
      tier: "pro",
      expiresAt: "2020-01-01 00:00:00",
      features: ["chat"],
      graceDaysRemaining: 2,
      hasKey: true,
      keyPrefix: "01234567",
      serverConfigured: true,
      loading: false,
      saving: false,
    });

    const { result } = renderHook(() => useFeature("chat"), { wrapper: Wrapper });

    expect(result.current).toBe(true);
  });
});

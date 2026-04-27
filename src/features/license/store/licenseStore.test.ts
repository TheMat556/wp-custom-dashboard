import { describe, expect, it } from "vitest";
import { bootstrapLicenseStore, licenseStore, resetLicenseStore } from "./licenseStore";

describe("licenseStore", () => {
  it("bootstraps from the localized license payload", () => {
    bootstrapLicenseStore({
      restUrl: "/wp-json/wp-react-ui/v1",
      nonce: "test-nonce",
      license: {
        status: "active",
        role: "customer",
        tier: "pro",
        expiresAt: "2030-01-01 00:00:00",
        features: ["dashboard", "chat"],
        graceDaysRemaining: 0,
        hasKey: true,
        keyPrefix: "01234567",
        serverConfigured: true,
      },
    });

    expect(licenseStore.getState()).toMatchObject({
      status: "active",
      tier: "pro",
      features: ["dashboard", "chat"],
      hasKey: true,
      keyPrefix: "01234567",
      loading: false,
      saving: false,
    });
  });

  it("resets back to a disabled default state", () => {
    bootstrapLicenseStore({
      restUrl: "/wp-json/wp-react-ui/v1",
      nonce: "test-nonce",
      license: {
        status: "grace",
        role: "customer",
        tier: "pro",
        expiresAt: "2030-01-01 00:00:00",
        features: ["dashboard"],
        graceDaysRemaining: 3,
        hasKey: true,
        keyPrefix: "01234567",
        serverConfigured: true,
      },
    });

    resetLicenseStore();

    expect(licenseStore.getState()).toMatchObject({
      status: "disabled",
      tier: null,
      features: [],
      graceDaysRemaining: 0,
      hasKey: false,
      keyPrefix: null,
      serverConfigured: false,
      loading: false,
      saving: false,
    });
  });
});

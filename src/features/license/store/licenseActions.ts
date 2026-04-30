import { notificationStore } from "../../../store/notificationStore";
import {
  createLicenseService,
  type LicenseActivateInput,
  type LicenseService,
  type LicenseSettingsData,
  type LicenseSettingsInput,
} from "../services/licenseApi";
import { DEFAULT_LICENSE_STATE, licenseStore } from "./licenseStore";

let service: LicenseService | null = null;

export function initLicenseService(
  config: {
    restUrl: string;
    nonce: string;
  },
  nextService?: LicenseService
) {
  service = nextService ?? createLicenseService(config);
}

export function clearLicenseService() {
  service = null;
}

export async function loadLicenseStatus(options?: {
  force?: boolean;
  notifyOnSuccess?: boolean;
}): Promise<boolean> {
  if (!service) {
    return false;
  }

  licenseStore.setState({ loading: true });

  try {
    const status = await service.fetchLicense(options?.force ?? false);
    licenseStore.setState({ ...status, loading: false });
    if (options?.notifyOnSuccess) {
      notificationStore.getState().push({
        type: "info",
        message: "License status refreshed",
      });
    }
    return true;
  } catch {
    licenseStore.setState({ loading: false });
    notificationStore.getState().push({
      type: "error",
      message: "Failed to check license status",
    });
    return false;
  }
}

export function resetLicenseStatusSnapshot() {
  const currentState = licenseStore.getState();

  licenseStore.setState({
    ...currentState,
    status: DEFAULT_LICENSE_STATE.status,
    role: DEFAULT_LICENSE_STATE.role,
    tier: DEFAULT_LICENSE_STATE.tier,
    expiresAt: DEFAULT_LICENSE_STATE.expiresAt,
    features: DEFAULT_LICENSE_STATE.features,
    graceDaysRemaining: DEFAULT_LICENSE_STATE.graceDaysRemaining,
  });
}

export async function activateLicense(input: LicenseActivateInput): Promise<boolean> {
  if (!service) {
    return false;
  }

  licenseStore.setState({ saving: true });

  try {
    const status = await service.activateLicense(input);
    licenseStore.setState({ ...status, saving: false });
    notificationStore.getState().push({
      type: "info",
      message: "License activated",
    });
    return true;
  } catch {
    licenseStore.setState({ saving: false });
    notificationStore.getState().push({
      type: "error",
      message: "License activation failed",
      description: "Could not reach the license server. Please try again.",
    });
    return false;
  }
}

export async function loadLicenseServerSettings(): Promise<LicenseSettingsData | null> {
  if (!service) {
    return null;
  }

  try {
    const settings = await service.fetchLicenseSettings();
    licenseStore.setState({ serverConfigured: settings.serverConfigured });
    return settings;
  } catch {
    notificationStore.getState().push({
      type: "error",
      message: "Failed to load license settings",
    });
    return null;
  }
}

export async function saveLicenseServerSettings(
  input: LicenseSettingsInput
): Promise<LicenseSettingsData | null> {
  if (!service) {
    return null;
  }

  try {
    const settings = await service.saveLicenseSettings(input);
    licenseStore.setState({ serverConfigured: settings.serverConfigured });
    return settings;
  } catch {
    notificationStore.getState().push({
      type: "error",
      message: "Failed to save license server settings",
    });
    return null;
  }
}

export async function deactivateLicense(): Promise<boolean> {
  if (!service) {
    return false;
  }

  licenseStore.setState({ saving: true });

  try {
    const status = await service.deactivateLicense();
    licenseStore.setState({ ...status, saving: false });
    notificationStore.getState().push({
      type: "info",
      message: "License deactivated",
    });
    return true;
  } catch {
    // The key was not recognised by the server (already removed, wrong server, etc.).
    // Clear local state anyway — there is nothing to protect on our end.
    licenseStore.setState({ ...DEFAULT_LICENSE_STATE, saving: false });
    notificationStore.getState().push({
      type: "info",
      message: "License cleared",
      description: "The key was not found on the server but has been removed locally.",
    });
    return true;
  }
}

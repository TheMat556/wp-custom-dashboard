import { useCallback, useEffect, useState } from "react";
import { loadLicenseServerSettings, saveLicenseServerSettings } from "../../store/licenseActions";

export interface LicenseServerSettingsOptions {
  enabled?: boolean;
}

export interface LicenseServerSettingsHook {
  serverUrl: string;
  savedServerUrl: string;
  /** Masked display value only, e.g. "abcd****wxyz". Never the full key. */
  storedLicenseKey: string;
  settingsLoading: boolean;
  settingsSaving: boolean;
  serverDirty: boolean;
  setServerUrl: (url: string) => void;
  persistServerUrl: () => Promise<boolean>;
  syncServerSettings: () => Promise<void>;
}

export function useLicenseServerSettings(
  options: LicenseServerSettingsOptions = {}
): LicenseServerSettingsHook {
  const enabled = options.enabled ?? true;
  const [serverUrl, setServerUrl] = useState("");
  const [savedServerUrl, setSavedServerUrl] = useState("");
  const [storedLicenseKey, setStoredLicenseKey] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(enabled);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const syncServerSettings = useCallback(async () => {
    if (!enabled) {
      setSettingsLoading(false);
      return;
    }

    setSettingsLoading(true);
    const settings = await loadLicenseServerSettings();

    if (settings) {
      const nextServerUrl = settings.serverUrl ?? "";
      setServerUrl(nextServerUrl);
      setSavedServerUrl(nextServerUrl);
      setStoredLicenseKey(settings.storedLicenseKey ?? "");
    }

    setSettingsLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setSettingsLoading(false);
      return;
    }

    void syncServerSettings();
  }, [enabled, syncServerSettings]);

  const persistServerUrl = useCallback(async () => {
    if (!enabled) {
      return false;
    }

    setSettingsSaving(true);

    const settings = await saveLicenseServerSettings({
      serverUrl: serverUrl.trim().length > 0 ? serverUrl.trim() : null,
    });

    setSettingsSaving(false);

    if (!settings) {
      return false;
    }

    const nextServerUrl = settings.serverUrl ?? "";
    setServerUrl(nextServerUrl);
    setSavedServerUrl(nextServerUrl);
    setStoredLicenseKey(settings.storedLicenseKey ?? "");

    return true;
  }, [enabled, serverUrl]);

  return {
    serverUrl,
    savedServerUrl,
    storedLicenseKey,
    settingsLoading,
    settingsSaving,
    serverDirty: serverUrl.trim() !== savedServerUrl,
    setServerUrl,
    persistServerUrl,
    syncServerSettings,
  };
}

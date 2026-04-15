import {
  ApiOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import type { InputRef } from "antd";
import { Alert, Button, Flex, Grid, Input, Typography, theme } from "antd";
import type { ClipboardEvent, CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import PageCanvas from "../../../../shared/ui/PageCanvas";
import SurfacePanel from "../../../../shared/ui/SurfacePanel";
import { createT } from "../../../../utils/i18n";
import { useShellConfig } from "../../../shell/context/ShellConfigContext";
import { useLicense } from "../../context/LicenseContext";
import {
  activateLicense,
  deactivateLicense,
  loadLicenseStatus,
  resetLicenseStatusSnapshot,
} from "../../store/licenseActions";
import { licenseStore } from "../../store/licenseStore";
import { useLicenseServerSettings } from "./useLicenseServerSettings";

const { Paragraph, Text, Title } = Typography;
const { useBreakpoint } = Grid;
const licensePanelTitleStyle = { margin: 0 } satisfies CSSProperties;

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return "—";
  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? expiresAt : date.toLocaleString();
}

function getStatusLabel(status: string) {
  if (status.length === 0) return "—";
  return `${status.slice(0, 1).toUpperCase()}${status.slice(1)}`;
}

function normalizeLicenseKey(value: string) {
  return value.replace(/[^a-f0-9]/gi, "").toLowerCase();
}

const MAX_VISIBLE_LICENSE_KEY_CHARS = 8;

function getVisibleLicenseKeyCount(value: string, preferredCount = MAX_VISIBLE_LICENSE_KEY_CHARS) {
  return Math.min(preferredCount, normalizeLicenseKey(value).length);
}

function maskLicenseKey(value: string, visibleCount = MAX_VISIBLE_LICENSE_KEY_CHARS) {
  const normalized = normalizeLicenseKey(value);
  if (normalized.length === 0) {
    return "";
  }

  const safeVisibleCount = getVisibleLicenseKeyCount(normalized, visibleCount);
  const hiddenCount = Math.max(0, normalized.length - safeVisibleCount);
  return `${"•".repeat(hiddenCount)}${normalized.slice(-safeVisibleCount)}`;
}

function clampSelection(value: number | null, max: number) {
  if (typeof value !== "number") {
    return max;
  }

  return Math.min(Math.max(value, 0), max);
}

function getVisibleTailStart(length: number, visibleCount: number) {
  return Math.max(0, length - Math.min(visibleCount, length));
}

function countVisibleTailOverlap(start: number, end: number, length: number, visibleCount: number) {
  const visibleStart = getVisibleTailStart(length, visibleCount);
  return Math.max(0, Math.min(end, length) - Math.max(start, visibleStart));
}

type TFn = ReturnType<typeof createT>;

interface LicenseStatusAlertsProps {
  license: ReturnType<typeof useLicense>;
  t: TFn;
}

function LicenseStatusAlerts({ license, t }: LicenseStatusAlertsProps) {
  const showGrace =
    license.status === "grace" || (license.status === "expired" && license.graceDaysRemaining > 0);

  return (
    <>
      {!license.serverConfigured && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 24 }}
          title={t("License server is not configured")}
          description={t(
            "Add the license server URL below, or continue using the WP_REACT_UI_LICENSE_SERVER_URL constant / wp_react_ui_license_server_url filter override."
          )}
        />
      )}
      {showGrace && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 24 }}
          title={t(
            license.status === "expired"
              ? "License expired — grace period active"
              : "License grace period active"
          )}
          description={t(
            `Features remain available for ${license.graceDaysRemaining} more day(s) while validation recovers.`
          )}
        />
      )}
      {license.status === "disabled" && license.hasKey && (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 24 }}
          title={t("License disabled")}
          description={t("The stored license is no longer granting access to licensed features.")}
        />
      )}
    </>
  );
}

function getTierLabel(tier: string | null, t: TFn) {
  if (!tier) {
    return t("Syncing");
  }

  return t(`${tier.slice(0, 1).toUpperCase()}${tier.slice(1)}`);
}

function getMetricAccentStyle(color: string) {
  return { "--metric-accent": color } as CSSProperties;
}

function getStatusSupportingText(license: ReturnType<typeof useLicense>, t: TFn) {
  if (license.status === "active") {
    return t("Premium settings are currently unlocked for this site.");
  }

  if (
    license.status === "grace" ||
    (license.status === "expired" && license.graceDaysRemaining > 0)
  ) {
    return t("Temporary validation issues are covered by the current grace window.");
  }

  if (license.status === "disabled") {
    return t("The stored license is no longer granting access to premium settings.");
  }

  return t("No active license validation snapshot is available yet.");
}

export default function LicenseSettings() {
  const config = useShellConfig();
  const license = useLicense();
  const loading = useStore(licenseStore, (state) => state.loading);
  const saving = useStore(licenseStore, (state) => state.saving);
  const licenseKeyInputRef = useRef<InputRef | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseKeyVisibleCount, setLicenseKeyVisibleCount] = useState(0);
  const [licenseKeyDirty, setLicenseKeyDirty] = useState(false);
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const t = useMemo(() => createT(config.locale ?? "en_US"), [config.locale]);

  const {
    serverUrl,
    savedServerUrl,
    storedLicenseKey,
    settingsLoading,
    settingsSaving,
    serverDirty,
    setServerUrl,
    persistServerUrl,
    syncServerSettings,
  } = useLicenseServerSettings();

  const maskedLicenseKey = useMemo(
    () => maskLicenseKey(licenseKey, licenseKeyVisibleCount),
    [licenseKey, licenseKeyVisibleCount]
  );

  useEffect(() => {
    if (!licenseKeyDirty) {
      const normalizedStoredLicenseKey = normalizeLicenseKey(storedLicenseKey);
      setLicenseKey(normalizedStoredLicenseKey);
      setLicenseKeyVisibleCount(getVisibleLicenseKeyCount(normalizedStoredLicenseKey));
    }
  }, [licenseKeyDirty, storedLicenseKey]);

  useEffect(() => {
    void loadLicenseStatus();
  }, []);

  const queueLicenseKeySelection = useCallback((position: number) => {
    window.requestAnimationFrame(() => {
      const input = licenseKeyInputRef.current?.input;

      if (!input) {
        return;
      }

      const nextPosition = Math.min(Math.max(position, 0), input.value.length);
      input.setSelectionRange(nextPosition, nextPosition);
    });
  }, []);

  const applyLicenseKeyEdit = useCallback(
    (selectionStart: number, selectionEnd: number, insertedValue: string) => {
      const start = clampSelection(selectionStart, licenseKey.length);
      const end = clampSelection(selectionEnd, licenseKey.length);
      const normalizedInsertedValue = normalizeLicenseKey(insertedValue);
      const currentVisibleStart = getVisibleTailStart(licenseKey.length, licenseKeyVisibleCount);
      const removedVisibleCount = countVisibleTailOverlap(
        start,
        end,
        licenseKey.length,
        licenseKeyVisibleCount
      );
      const nextLicenseKey = `${licenseKey.slice(0, start)}${normalizedInsertedValue}${licenseKey.slice(end)}`;
      const selectionTouchesVisibleTail = end > currentVisibleStart;
      const replacingEntireValue = start === 0 && end === licenseKey.length;
      const insertedVisibleCount =
        normalizedInsertedValue.length > 0 &&
        (selectionTouchesVisibleTail || replacingEntireValue || licenseKey.length === 0)
          ? normalizedInsertedValue.length
          : 0;
      const nextVisibleCount = Math.min(
        MAX_VISIBLE_LICENSE_KEY_CHARS,
        Math.max(0, licenseKeyVisibleCount - removedVisibleCount) + insertedVisibleCount,
        nextLicenseKey.length
      );

      setLicenseKeyDirty(true);
      setLicenseKey(nextLicenseKey);
      setLicenseKeyVisibleCount(nextVisibleCount);
      queueLicenseKeySelection(start + normalizedInsertedValue.length);
    },
    [licenseKey, licenseKeyVisibleCount, queueLicenseKeySelection]
  );

  const handleLicenseKeyChange = useCallback((value: string) => {
    const normalizedValue = normalizeLicenseKey(value);
    setLicenseKeyDirty(true);
    setLicenseKey(normalizedValue);
    setLicenseKeyVisibleCount(getVisibleLicenseKeyCount(normalizedValue));
  }, []);

  const handleLicenseKeyKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const input = event.currentTarget;
      const currentLength = licenseKey.length;
      const selectionStart = clampSelection(input.selectionStart, currentLength);
      const selectionEnd = clampSelection(input.selectionEnd, currentLength);

      if (event.key === "Backspace") {
        event.preventDefault();
        if (selectionStart === selectionEnd) {
          if (selectionStart === 0) {
            return;
          }

          applyLicenseKeyEdit(selectionStart - 1, selectionEnd, "");
          return;
        }

        applyLicenseKeyEdit(selectionStart, selectionEnd, "");
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        if (selectionStart === selectionEnd) {
          if (selectionEnd >= currentLength) {
            return;
          }

          applyLicenseKeyEdit(selectionStart, selectionEnd + 1, "");
          return;
        }

        applyLicenseKeyEdit(selectionStart, selectionEnd, "");
        return;
      }

      if (/^[a-f0-9]$/i.test(event.key)) {
        event.preventDefault();
        applyLicenseKeyEdit(selectionStart, selectionEnd, event.key);
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
      }
    },
    [applyLicenseKeyEdit, licenseKey.length]
  );

  const handleLicenseKeyPaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();

      const pastedValue = event.clipboardData.getData("text");
      const normalizedPastedValue = normalizeLicenseKey(pastedValue);
      const input = event.currentTarget;
      const selectionStart = clampSelection(input.selectionStart, licenseKey.length);
      const selectionEnd = clampSelection(input.selectionEnd, licenseKey.length);

      applyLicenseKeyEdit(selectionStart, selectionEnd, normalizedPastedValue);
    },
    [applyLicenseKeyEdit, licenseKey.length]
  );

  const handleActivate = useCallback(async () => {
    if (serverUrl.trim() !== savedServerUrl) {
      const saved = await persistServerUrl();
      if (!saved) return;
    }
    await loadLicenseStatus();
    const success = await activateLicense({ licenseKey });
    if (success) {
      const normalizedLicenseKey = normalizeLicenseKey(licenseKey);
      setLicenseKeyDirty(false);
      setLicenseKey(normalizedLicenseKey);
      setLicenseKeyVisibleCount(getVisibleLicenseKeyCount(normalizedLicenseKey));
      await syncServerSettings();
    }
  }, [licenseKey, persistServerUrl, savedServerUrl, serverUrl, syncServerSettings]);

  const handleDeactivate = useCallback(async () => {
    const success = await deactivateLicense();
    if (success) {
      setLicenseKeyDirty(false);
      setLicenseKey("");
      setLicenseKeyVisibleCount(0);
      await syncServerSettings();
    }
  }, [syncServerSettings]);

  const handleSaveSettings = useCallback(async () => {
    const saved = await persistServerUrl();
    if (saved) {
      const refreshed = await loadLicenseStatus();
      if (!refreshed) {
        resetLicenseStatusSnapshot();
      }
    }
  }, [persistServerUrl]);

  const handleRefreshStatus = useCallback(async () => {
    await loadLicenseStatus();
  }, []);

  const licenseServerFieldId = "wp-react-ui-license-server-input";
  const licenseKeyFieldId = "wp-react-ui-license-key-input";
  const isBusy = loading || settingsLoading || settingsSaving || saving;

  const canActivate =
    !isBusy &&
    serverUrl.trim().length > 0 &&
    licenseKey.trim().length > 0 &&
    (licenseKeyDirty || serverDirty || !license.hasKey || license.status !== "active");
  const licenseStatusLabel = t(getStatusLabel(license.status));
  const tierLabel = getTierLabel(license.tier, t);
  const graceLabel =
    license.status === "grace" || (license.status === "expired" && license.graceDaysRemaining > 0)
      ? t("{days} day(s)", { days: license.graceDaysRemaining })
      : t("No grace");
  const statusAccent =
    license.status === "active"
      ? token.colorSuccess
      : license.status === "grace" || license.status === "expired"
        ? token.colorWarning
        : token.colorTextTertiary;
  const serverAccent = license.serverConfigured ? token.colorSuccess : token.colorWarning;

  return (
    <PageCanvas>
      <div className="wp-react-ui-page-intro">
        <Flex
          className="wp-react-ui-page-intro__header"
          justify="space-between"
          align="flex-start"
          gap={24}
          wrap
        >
          <div className="wp-react-ui-page-intro__copy" style={{ minWidth: 0 }}>
            <Title
              level={2}
              className="wp-react-ui-page-intro__title"
              style={{ marginBottom: 6, fontSize: screens.md ? 30 : 24 }}
            >
              {t("License")}
            </Title>
            <Paragraph
              type="secondary"
              className="wp-react-ui-page-intro__description"
              style={{ marginBottom: 0, maxWidth: 760, fontSize: 14 }}
            >
              {t(
                "Configure the license server, activate your key, and review which premium features are currently available on this site."
              )}
            </Paragraph>
          </div>

          <Flex className="wp-react-ui-page-intro__actions" gap={12} wrap align="center">
            <Button
              size="large"
              icon={<SyncOutlined />}
              loading={loading}
              disabled={isBusy}
              onClick={() => void handleRefreshStatus()}
            >
              {t("Refresh")}
            </Button>
            <Button
              size="large"
              loading={settingsSaving}
              disabled={isBusy || !serverDirty}
              onClick={() => void handleSaveSettings()}
            >
              {t("Save")}
            </Button>
            <Button
              size="large"
              type="primary"
              loading={saving}
              onClick={() => void handleActivate()}
              disabled={!canActivate}
            >
              {t("Connect")}
            </Button>
            <Button
              size="large"
              danger
              loading={saving}
              onClick={() => void handleDeactivate()}
              disabled={!license.hasKey || isBusy}
            >
              {t("Deactivate")}
            </Button>
          </Flex>
        </Flex>
      </div>

      <LicenseStatusAlerts license={license} t={t} />

      <div
        className="wp-react-ui-license-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns: screens.lg
            ? "repeat(3, minmax(0, 1fr))"
            : screens.md
              ? "repeat(2, minmax(0, 1fr))"
              : "1fr",
          gap: 18,
          marginTop: 24,
        }}
      >
        <div className="wp-react-ui-metric-tile" style={getMetricAccentStyle(statusAccent)}>
          <div className="wp-react-ui-metric-tile__header">
            <span className="wp-react-ui-metric-tile__icon">
              <SafetyCertificateOutlined />
            </span>
          </div>
          <div className="wp-react-ui-metric-tile__body">
            <span className="wp-react-ui-metric-tile__label">{t("License Status")}</span>
            <span className="wp-react-ui-metric-tile__value">{licenseStatusLabel}</span>
          </div>
          <div className="wp-react-ui-metric-tile__footer">
            <Text type="secondary" style={{ fontSize: 13 }}>
              {getStatusSupportingText(license, t)}
            </Text>
          </div>
        </div>

        <div className="wp-react-ui-metric-tile" style={getMetricAccentStyle(serverAccent)}>
          <div className="wp-react-ui-metric-tile__header">
            <span className="wp-react-ui-metric-tile__icon">
              <ApiOutlined />
            </span>
          </div>
          <div className="wp-react-ui-metric-tile__body">
            <span className="wp-react-ui-metric-tile__label">{t("Server Linked")}</span>
            <span className="wp-react-ui-metric-tile__value">
              {license.serverConfigured ? t("Connected") : t("Missing")}
            </span>
          </div>
          <div className="wp-react-ui-metric-tile__footer">
            <Text type="secondary" style={{ fontSize: 13 }}>
              {savedServerUrl || t("No custom endpoint saved yet.")}
            </Text>
          </div>
        </div>

        <div className="wp-react-ui-metric-tile" style={getMetricAccentStyle(token.colorPrimary)}>
          <div className="wp-react-ui-metric-tile__header">
            <span className="wp-react-ui-metric-tile__icon">
              <KeyOutlined />
            </span>
          </div>
          <div className="wp-react-ui-metric-tile__body">
            <span className="wp-react-ui-metric-tile__label">{t("License Tier")}</span>
            <span className="wp-react-ui-metric-tile__value">{tierLabel}</span>
          </div>
          <div className="wp-react-ui-metric-tile__footer">
            <Text type="secondary" style={{ fontSize: 13 }}>
              {license.expiresAt
                ? t("Expires: {date}", { date: formatExpiry(license.expiresAt) })
                : graceLabel}
            </Text>
          </div>
        </div>
      </div>

      <div
        className="wp-react-ui-license-settings-layout"
        style={{
          display: "grid",
          gridTemplateColumns: screens.lg ? "minmax(0, 1.2fr) minmax(320px, 0.8fr)" : "1fr",
          gap: 24,
          alignItems: "stretch",
          marginTop: 24,
        }}
      >
        <SurfacePanel
          className="wp-react-ui-license-settings-panel"
          title={
            <Title level={4} style={licensePanelTitleStyle}>
              {t("License Connection")}
            </Title>
          }
          description={
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t("Manage the signed connection that links this site to your license service.")}
            </Text>
          }
          icon={<ApiOutlined />}
        >
          <div className="wp-react-ui-license-settings-stack">
            <div className="wp-react-ui-license-form-block wp-react-ui-inset-panel">
              <label className="wp-react-ui-license-form-label" htmlFor={licenseServerFieldId}>
                {t("License Server")}
              </label>
              <Paragraph className="wp-react-ui-license-form-description" type="secondary">
                {t(
                  "Enter the base URL of your license server. Example: https://licenses.example.com"
                )}
              </Paragraph>
              <Input
                id={licenseServerFieldId}
                size="large"
                className="wp-react-ui-license-field"
                value={serverUrl}
                onChange={(event) => setServerUrl(event.target.value)}
                placeholder={t("https://licenses.example.com")}
                autoComplete="off"
                disabled={settingsLoading}
              />
              <Text type="secondary" className="wp-react-ui-license-form-note">
                {savedServerUrl
                  ? t("Saved endpoint: {url}", { url: savedServerUrl })
                  : t("Save an endpoint here before activating a key.")}
              </Text>
            </div>

            <div className="wp-react-ui-license-form-block wp-react-ui-inset-panel">
              <label className="wp-react-ui-license-form-label" htmlFor={licenseKeyFieldId}>
                {t("License Key")}
              </label>
              <Paragraph className="wp-react-ui-license-form-description" type="secondary">
                {t(
                  "Only one key can stay active on this site. Stored keys stay masked while remaining editable."
                )}
              </Paragraph>
              <Input
                id={licenseKeyFieldId}
                ref={licenseKeyInputRef}
                size="large"
                className="wp-react-ui-license-field wp-react-ui-license-field--masked"
                value={maskedLicenseKey}
                onChange={(event) => handleLicenseKeyChange(event.target.value)}
                onKeyDown={handleLicenseKeyKeyDown}
                onPaste={handleLicenseKeyPaste}
                placeholder={t("Enter your 64-character license key")}
                autoComplete="off"
                spellCheck={false}
              />
              <Text type="secondary" className="wp-react-ui-license-form-note">
                {license.hasKey
                  ? t("A key is already stored locally for this site.")
                  : t("Paste the 64-character key you want to bind to this installation.")}
              </Text>
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel
          className="wp-react-ui-license-status-panel"
          title={
            <Title level={4} style={licensePanelTitleStyle}>
              {t("Current Snapshot")}
            </Title>
          }
          description={
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t(
                "The latest local state that powers gating across the shell and protected routes."
              )}
            </Text>
          }
          icon={<SafetyCertificateOutlined />}
        >
          <div className="wp-react-ui-license-status-stack">
            <div className="wp-react-ui-license-status-highlight wp-react-ui-inset-panel">
              <Flex justify="space-between" align="center" gap={16} wrap>
                <div>
                  <Text className="wp-react-ui-license-form-label">{t("Active Gate State")}</Text>
                  <div style={{ marginTop: 10 }}>
                    <Text
                      className="wp-react-ui-license-status-value"
                      style={{ color: statusAccent }}
                    >
                      {licenseStatusLabel}
                    </Text>
                  </div>
                </div>
                <Text type="secondary" style={{ maxWidth: 360, fontSize: 14 }}>
                  {getStatusSupportingText(license, t)}
                </Text>
              </Flex>
            </div>

            <div className="wp-react-ui-license-status-grid">
              <div className="wp-react-ui-license-status-item wp-react-ui-inset-panel">
                <Text className="wp-react-ui-license-form-label">{t("Tier")}</Text>
                <Text className="wp-react-ui-license-status-value">{tierLabel}</Text>
              </div>
              <div className="wp-react-ui-license-status-item wp-react-ui-inset-panel">
                <Text className="wp-react-ui-license-form-label">{t("Expiry")}</Text>
                <Text className="wp-react-ui-license-status-value">
                  {formatExpiry(license.expiresAt)}
                </Text>
              </div>
              <div className="wp-react-ui-license-status-item wp-react-ui-inset-panel">
                <Text className="wp-react-ui-license-form-label">{t("Server")}</Text>
                <Text
                  className="wp-react-ui-license-status-value"
                  style={{
                    color: license.serverConfigured ? token.colorSuccess : token.colorWarning,
                  }}
                >
                  {license.serverConfigured ? t("Configured") : t("Missing")}
                </Text>
              </div>
              <div className="wp-react-ui-license-status-item wp-react-ui-inset-panel">
                <Text className="wp-react-ui-license-form-label">{t("Grace Remaining")}</Text>
                <Text className="wp-react-ui-license-status-value">{graceLabel}</Text>
              </div>
            </div>
          </div>
        </SurfacePanel>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 24,
          marginTop: 24,
        }}
      >
        <SurfacePanel
          className="wp-react-ui-license-guidance-panel"
          title={
            <Title level={4} style={licensePanelTitleStyle}>
              {t("Activation Guidance")}
            </Title>
          }
          description={
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t("A small checklist to keep the connection healthy.")}
            </Text>
          }
          icon={<SafetyCertificateOutlined />}
        >
          <div className="wp-react-ui-license-guidance-list">
            <div className="wp-react-ui-license-guidance-item wp-react-ui-inset-panel">
              <Text className="wp-react-ui-license-form-label">{t("Step 1")}</Text>
              <Text type="secondary">
                {t("Save the correct license server URL before activating a new key.")}
              </Text>
            </div>
            <div className="wp-react-ui-license-guidance-item wp-react-ui-inset-panel">
              <Text className="wp-react-ui-license-form-label">{t("Step 2")}</Text>
              <Text type="secondary">
                {t(
                  "Use HTTPS for production license servers to keep HMAC requests protected in transit."
                )}
              </Text>
            </div>
            <div className="wp-react-ui-license-guidance-item wp-react-ui-inset-panel">
              <Text className="wp-react-ui-license-form-label">{t("Step 3")}</Text>
              <Text type="secondary">
                {t(
                  "If validation fails temporarily, the grace period keeps licensed features available briefly."
                )}
              </Text>
            </div>
          </div>
        </SurfacePanel>
      </div>
    </PageCanvas>
  );
}

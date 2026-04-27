import {
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  DisconnectOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  KeyOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { InputRef } from "antd";
import { Alert, Button, Collapse, Flex, Input, message, Tag, Typography, theme } from "antd";
import type { ClipboardEvent, CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import PageCanvas from "../../../../shared/ui/PageCanvas";
import SurfacePanel from "../../../../shared/ui/SurfacePanel";
import { createT, localeToIntl } from "../../../../utils/i18n";
import { useShellConfig } from "../../../shell/context/ShellConfigContext";
import { useLicense } from "../../context/LicenseContext";
import {
  activateLicense,
  deactivateLicense,
  loadLicenseStatus,
  resetLicenseStatusSnapshot,
} from "../../store/licenseActions";
import { licenseStore } from "../../store/licenseStore";
import {
  getVisibleLicenseKeyCount,
  MAX_VISIBLE_LICENSE_KEY_CHARS,
  maskLicenseKey,
  normalizeLicenseKey,
} from "../../utils/licenseKeyUtils";
import { useLicenseServerSettings } from "./useLicenseServerSettings";

const { Text, Title } = Typography;

// ── Local key input helpers ──────────────────────────────────────────────────

function clampSelection(value: number | null, max: number) {
  if (typeof value !== "number") return max;
  return Math.min(Math.max(value, 0), max);
}

function getVisibleTailStart(length: number, visibleCount: number) {
  return Math.max(0, length - Math.min(visibleCount, length));
}

function countVisibleTailOverlap(start: number, end: number, length: number, visibleCount: number) {
  const visibleStart = getVisibleTailStart(length, visibleCount);
  return Math.max(0, Math.min(end, length) - Math.max(start, visibleStart));
}

function buildNavKeyRange(
  key: "Backspace" | "Delete",
  selectionStart: number,
  selectionEnd: number,
  currentLength: number
): [number, number] | null {
  if (selectionStart !== selectionEnd) return [selectionStart, selectionEnd];
  if (key === "Backspace") {
    if (selectionStart === 0) return null;
    return [selectionStart - 1, selectionEnd];
  }
  if (selectionEnd >= currentLength) return null;
  return [selectionStart, selectionEnd + 1];
}

function formatExpiryLong(expiresAt: string | null, locale: string): string {
  if (!expiresAt) return "—";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return expiresAt;
  return date.toLocaleDateString(localeToIntl(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── KPI tile ─────────────────────────────────────────────────────────────────

interface LicenseKpiTileProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  color?: string;
}

function LicenseKpiTile({ icon, label, value, sub, color }: LicenseKpiTileProps) {
  const tileStyle = { "--metric-accent": color } as CSSProperties;
  return (
    <div className="wp-react-ui-metric-tile" style={tileStyle}>
      <div className="wp-react-ui-metric-tile__header">
        <div className="wp-react-ui-metric-tile__icon" aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className="wp-react-ui-metric-tile__body">
        <Text className="wp-react-ui-metric-tile__label">{label}</Text>
        <div className="wp-react-ui-metric-tile__value">{value}</div>
      </div>
      {sub ? <div className="wp-react-ui-metric-tile__footer">{sub}</div> : null}
    </div>
  );
}

// ── Status display helper ─────────────────────────────────────────────────────

function getLicenseStatusDisplay(
  license: ReturnType<typeof useLicense>,
  t: ReturnType<typeof createT>,
  token: ReturnType<typeof theme.useToken>["token"]
) {
  const isGrace =
    license.status === "grace" || (license.status === "expired" && license.graceDaysRemaining > 0);

  let icon: ReactNode;
  let label: string;
  let color: string;

  if (license.status === "active" && !isGrace) {
    icon = <CheckCircleOutlined />;
    label = t("Active");
    color = token.colorSuccess;
  } else if (isGrace) {
    icon = <WarningOutlined />;
    label = t("Grace Period");
    color = token.colorWarning;
  } else if (license.status === "expired") {
    icon = <CloseCircleOutlined />;
    label = t("Expired");
    color = token.colorWarning;
  } else if (license.status === "disabled" && license.hasKey) {
    icon = <CloseCircleOutlined />;
    label = t("Error");
    color = token.colorError;
  } else {
    icon = <KeyOutlined />;
    label = t("Not activated");
    color = token.colorTextSecondary;
  }

  return { icon, label, color, isGrace };
}

// ── KPI tiles section ─────────────────────────────────────────────────────────

function LicenseKpiSection({
  license,
  token,
  t,
  locale,
}: {
  license: ReturnType<typeof useLicense>;
  token: ReturnType<typeof theme.useToken>["token"];
  t: ReturnType<typeof createT>;
  locale: string;
}) {
  const {
    icon: statusIcon,
    label: statusLabel,
    color: statusColor,
  } = getLicenseStatusDisplay(license, t, token);

  const graceDaysLabel =
    license.graceDaysRemaining > 0
      ? t("{days} day(s) remaining", { days: license.graceDaysRemaining })
      : undefined;

  const expiryLong = formatExpiryLong(license.expiresAt, locale);

  const tierLabel = license.tier
    ? `${license.tier.slice(0, 1).toUpperCase()}${license.tier.slice(1)}`
    : "—";

  const featureLabels: Record<string, string> = { chat: "Chat", dashboard: "Dashboard" };

  return (
    <div
      className="wp-react-ui-kpi-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}
    >
      <LicenseKpiTile
        icon={statusIcon}
        label={t("License Status")}
        value={<span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</span>}
        sub={
          graceDaysLabel ? (
            <Text style={{ fontSize: 12, color: token.colorWarning }}>{graceDaysLabel}</Text>
          ) : undefined
        }
        color={statusColor}
      />
      <LicenseKpiTile
        icon={<CalendarOutlined />}
        label={t("Valid Until")}
        value={expiryLong}
        color={license.expiresAt ? token.colorPrimary : token.colorTextSecondary}
      />
      <LicenseKpiTile
        icon={<CrownOutlined />}
        label={t("Tier")}
        value={tierLabel}
        color={license.tier ? token.colorPrimary : token.colorTextSecondary}
      />
      <LicenseKpiTile
        icon={<AppstoreOutlined />}
        label={t("Features")}
        value={
          license.features.length > 0 ? (
            <Flex gap={4} wrap="wrap">
              {license.features.map((f) => (
                <Tag key={f} color="blue" style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>
                  {featureLabels[f.toLowerCase()] ?? f.charAt(0).toUpperCase() + f.slice(1)}
                </Tag>
              ))}
            </Flex>
          ) : (
            "—"
          )
        }
        color={license.features.length > 0 ? token.colorPrimary : token.colorTextSecondary}
      />
    </div>
  );
}

// ── License key surface (manages key editing state and handlers) ───────────────

interface LicenseKeySurfaceProps {
  license: ReturnType<typeof useLicense>;
  loading: boolean;
  saving: boolean;
  t: ReturnType<typeof createT>;
  token: ReturnType<typeof theme.useToken>["token"];
  serverUrl: string;
  savedServerUrl: string;
  serverDirty: boolean;
  storedLicenseKey: string;
  persistServerUrl: () => Promise<boolean>;
  syncServerSettings: () => Promise<void>;
}

function LicenseKeySurface({
  license,
  loading,
  saving,
  t,
  token,
  serverUrl,
  savedServerUrl,
  serverDirty,
  storedLicenseKey,
  persistServerUrl,
  syncServerSettings,
}: LicenseKeySurfaceProps) {
  const licenseKeyInputRef = useRef<InputRef | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseKeyVisibleCount, setLicenseKeyVisibleCount] = useState(0);
  const [licenseKeyDirty, setLicenseKeyDirty] = useState(false);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const licenseKeyFieldId = "wp-react-ui-license-key-input";

  const canActivate =
    !(loading || saving) &&
    serverUrl.trim().length > 0 &&
    licenseKey.trim().length > 0 &&
    (licenseKeyDirty || serverDirty || !license.hasKey || license.status !== "active");

  const canDeactivate = !(loading || saving) && license.hasKey && !licenseKeyDirty;

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

  const queueLicenseKeySelection = useCallback((position: number) => {
    window.requestAnimationFrame(() => {
      const input = licenseKeyInputRef.current?.input;
      if (!input) return;
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
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const input = event.currentTarget;
      const currentLength = licenseKey.length;
      const selectionStart = clampSelection(input.selectionStart, currentLength);
      const selectionEnd = clampSelection(input.selectionEnd, currentLength);
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        const range = buildNavKeyRange(event.key, selectionStart, selectionEnd, currentLength);
        if (range) applyLicenseKeyEdit(range[0], range[1], "");
        return;
      }
      if (/^[a-f0-9]$/i.test(event.key)) {
        event.preventDefault();
        applyLicenseKeyEdit(selectionStart, selectionEnd, event.key);
        return;
      }
      if (event.key.length === 1) event.preventDefault();
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

  return (
    <Flex vertical gap={20}>
      <div className="wp-react-ui-license-form-block">
        <label className="wp-react-ui-license-form-label" htmlFor={licenseKeyFieldId}>
          {t("License Key")}
        </label>
        <Input
          id={licenseKeyFieldId}
          ref={licenseKeyInputRef}
          size="large"
          className="wp-react-ui-license-field wp-react-ui-license-field--masked"
          value={showLicenseKey ? licenseKey : maskedLicenseKey}
          onChange={(event) => handleLicenseKeyChange(event.target.value)}
          onKeyDown={handleLicenseKeyKeyDown}
          onPaste={handleLicenseKeyPaste}
          placeholder={t("Enter your 64-character license key")}
          autoComplete="off"
          spellCheck={false}
          suffix={
            <Button
              type="text"
              size="small"
              icon={showLicenseKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setShowLicenseKey((v) => !v)}
              aria-label={showLicenseKey ? t("Hide key") : t("Show key")}
              style={{ color: token.colorTextSecondary }}
            />
          }
        />
      </div>

      <Flex justify="flex-end" gap="small">
        {license.hasKey && !licenseKeyDirty && (
          <Button
            size="large"
            icon={<SyncOutlined />}
            loading={loading}
            onClick={() => void loadLicenseStatus(true)}
            title={t("Re-fetch license status from the server")}
          >
            {t("Refresh")}
          </Button>
        )}
        {canDeactivate && (
          <Button
            size="large"
            danger
            icon={<DisconnectOutlined />}
            loading={saving}
            onClick={() => void handleDeactivate()}
            title={t("Deactivate this license on the current site")}
          >
            {t("Deactivate")}
          </Button>
        )}
        <Button
          type={license.status !== "active" || licenseKeyDirty ? "primary" : "default"}
          size="large"
          loading={saving}
          disabled={!canActivate}
          onClick={() => void handleActivate()}
        >
          {t("Activate")}
        </Button>
      </Flex>

      {license.status === "disabled" && license.hasKey && (
        <Alert
          type="error"
          showIcon
          message={t("Connection failed or license invalid.")}
          description={t("License connection failed. Check your server URL or contact support.")}
        />
      )}
    </Flex>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LicenseSettings() {
  const config = useShellConfig();
  const license = useLicense();
  const loading = useStore(licenseStore, (state) => state.loading);
  const saving = useStore(licenseStore, (state) => state.saving);
  const { token } = theme.useToken();
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

  const [showServerSection, setShowServerSection] = useState<string[]>(() =>
    !license.serverConfigured ? ["server"] : []
  );

  const licenseServerFieldId = "wp-react-ui-license-server-input";
  const isBusy = loading || settingsLoading || settingsSaving || saving;

  useEffect(() => {
    void loadLicenseStatus();
  }, []);

  const handleSaveSettings = useCallback(async () => {
    const saved = await persistServerUrl();
    if (saved) {
      const refreshed = await loadLicenseStatus();
      if (!refreshed) resetLicenseStatusSnapshot();
    }
  }, [persistServerUrl]);

  const handleTestConnection = useCallback(async () => {
    const ok = await loadLicenseStatus();
    if (ok) {
      void message.success(t("Connection successful"));
    } else {
      void message.error(t("Connection test failed"));
    }
  }, [t]);

  const handleDeactivate = useCallback(async () => {
    const success = await deactivateLicense();
    if (success) await syncServerSettings();
  }, [syncServerSettings]);

  return (
    <PageCanvas>
      <div className="wp-react-ui-page-intro">
        <Title level={2} className="wp-react-ui-page-intro__title" style={{ marginBottom: 4 }}>
          {t("License")}
        </Title>
        <Text className="wp-react-ui-page-intro__description">{t("Manage your licenses")}</Text>
      </div>

      <LicenseKpiSection license={license} token={token} t={t} locale={config.locale ?? "en_US"} />

      <SurfacePanel
        icon={<KeyOutlined />}
        title={
          <Title level={4} style={{ margin: 0 }}>
            {t("License Key")}
          </Title>
        }
        description={
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t("Your license key for product activation")}
          </Text>
        }
        extra={undefined}
      >
        <LicenseKeySurface
          license={license}
          loading={loading}
          saving={saving}
          t={t}
          token={token}
          serverUrl={serverUrl}
          savedServerUrl={savedServerUrl}
          serverDirty={serverDirty}
          storedLicenseKey={storedLicenseKey}
          persistServerUrl={persistServerUrl}
          syncServerSettings={syncServerSettings}
        />
        <Collapse
          activeKey={showServerSection}
          onChange={(keys) => setShowServerSection(typeof keys === "string" ? [keys] : keys)}
          items={[
            {
              key: "server",
              label: <Text strong>{t("Advanced Settings")}</Text>,
              children: (
                <Flex vertical gap={16}>
                  <div className="wp-react-ui-license-form-block">
                    <label
                      className="wp-react-ui-license-form-label"
                      htmlFor={licenseServerFieldId}
                    >
                      {t("Server URL")}
                    </label>
                    <Flex gap={8}>
                      <Input
                        id={licenseServerFieldId}
                        size="large"
                        className="wp-react-ui-license-field"
                        value={serverUrl}
                        onChange={(event) => setServerUrl(event.target.value)}
                        placeholder="https://licenses.example.com"
                        autoComplete="off"
                        disabled={settingsLoading}
                        style={{ flex: 1 }}
                      />
                      <Button
                        size="large"
                        loading={settingsSaving}
                        disabled={isBusy || !serverDirty}
                        onClick={() => void handleSaveSettings()}
                      >
                        {t("Save")}
                      </Button>
                    </Flex>
                  </div>
                  <div className="wp-react-ui-inset-panel" style={{ padding: "12px 16px" }}>
                    <Flex align="center" gap={10}>
                      {license.serverConfigured ? (
                        <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 16 }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: token.colorWarning, fontSize: 16 }} />
                      )}
                      <div>
                        <Text strong style={{ display: "block" }}>
                          {license.serverConfigured ? t("Connected") : t("Not configured")}
                        </Text>
                        {license.serverConfigured && savedServerUrl && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {savedServerUrl}
                          </Text>
                        )}
                      </div>
                    </Flex>
                  </div>
                  <Flex gap={8}>
                    <Button
                      icon={<SyncOutlined />}
                      loading={loading}
                      disabled={isBusy}
                      onClick={() => void handleTestConnection()}
                    >
                      {t("Test Connection")}
                    </Button>
                    {license.hasKey && (
                      <Button
                        danger
                        loading={saving}
                        disabled={isBusy}
                        onClick={() => void handleDeactivate()}
                      >
                        {t("Deactivate")}
                      </Button>
                    )}
                  </Flex>
                </Flex>
              ),
            },
          ]}
        />
      </SurfacePanel>

      {!license.serverConfigured && !showServerSection.includes("server") && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
          message={t("License connection is not configured.")}
        />
      )}
    </PageCanvas>
  );
}

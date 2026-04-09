import {
  BgColorsOutlined,
  DeleteOutlined,
  EyeOutlined,
  LinkOutlined,
  PictureOutlined,
  ReloadOutlined,
  FontSizeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Button,
  ColorPicker,
  Flex,
  Grid,
  Input,
  Select,
  Spin,
  Switch,
  Typography,
  theme,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import type { BrandingData } from "../../services/brandingApi";
import { CUSTOM_PRESET_KEY, THEME_PRESETS } from "../../config/themePresets";
import { useShellConfig } from "../../context/ShellConfigContext";
import { brandingStore } from "../../store/brandingStore";
import { shellPreferencesStore } from "../../store/shellPreferencesStore";
import { DEFAULT_FONT_PRESET, FONT_PRESETS, type FontPresetKey } from "../../utils/fontPresets";
import { createT } from "../../utils/i18n";
import { openMediaPicker } from "../../utils/wpMedia";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;
const DEFAULT_PRIMARY_COLOR = "#4f46e5";

function LogoField({
  label,
  description,
  logoId,
  logoUrl,
  onSelect,
  onRemove,
  previewBackground,
}: {
  label: string;
  description: string;
  logoId: number;
  logoUrl: string | null;
  onSelect: (id: number, url: string) => void;
  onRemove: () => void;
  previewBackground?: string;
}) {
  const { token } = theme.useToken();
  const config = useShellConfig();
  const t = useMemo(() => createT(config.locale ?? "en_US"), [config.locale]);

  const handleSelect = useCallback(async () => {
    const result = await openMediaPicker({
      title: t("Select image"),
      buttonText: t("Use image"),
    });
    if (result) {
      onSelect(result.id, result.url);
    }
  }, [onSelect, t]);

  return (
    <div
      style={{
        minWidth: 0,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        padding: 28,
      }}
    >
      <Flex justify="space-between" align="baseline" gap={12} style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: token.colorTextTertiary,
          }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 12, color: token.colorTextQuaternary }}>{description}</Text>
      </Flex>

      <div
        style={{
          height: 160,
          marginBottom: 18,
          padding: 18,
          borderRadius: token.borderRadiusLG,
          background: previewBackground ?? token.colorFillAlter,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={t("{label} preview", { label })}
            style={{
              display: "block",
              width: "auto",
              height: "auto",
              maxWidth: "min(100%, 240px)",
              maxHeight: 72,
              objectFit: "contain",
            }}
          />
        ) : (
          <Flex vertical align="center" gap={10}>
            <PictureOutlined style={{ fontSize: 28, color: token.colorTextQuaternary }} />
            <Text type="secondary" style={{ fontSize: 14 }}>
              {t("No image selected")}
            </Text>
          </Flex>
        )}
      </div>

      <Flex gap={10} wrap>
        <Button type="default" onClick={handleSelect} icon={<UploadOutlined />}>
          {logoId ? t("Replace") : t("Upload")}
        </Button>
        {logoId > 0 && (
          <Button danger onClick={onRemove} icon={<DeleteOutlined />}>
            {t("Delete")}
          </Button>
        )}
      </Flex>
    </div>
  );
}

function SurfaceCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        padding: 32,
        boxSizing: "border-box",
      }}
    >
      <Flex align="center" gap={10} style={{ marginBottom: 24 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: `${token.colorPrimary}12`,
            color: token.colorPrimary,
            fontSize: 20,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <div style={{ minWidth: 0, marginLeft: 4 }}>
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>
            {title}
          </Title>
          {description && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              {description}
            </Text>
          )}
        </div>
      </Flex>

      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  );
}

export default function BrandingSettings() {
  const config = useShellConfig();
  const settings = useStore(brandingStore, (state) => state.settings);
  const loading = useStore(brandingStore, (state) => state.loading);
  const saving = useStore(brandingStore, (state) => state.saving);
  const load = useStore(brandingStore, (state) => state.load);
  const save = useStore(brandingStore, (state) => state.save);
  const highContrast = useStore(shellPreferencesStore, (s) => s.highContrast);
  const [draftThemePreset, setDraftThemePreset] = useState<string>(
    () => shellPreferencesStore.getState().themePreset ?? "default"
  );
  const [draftCustomColor, setDraftCustomColor] = useState<string>(
    () => shellPreferencesStore.getState().customPresetColor ?? DEFAULT_PRIMARY_COLOR
  );
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const t = useMemo(() => createT(config.locale ?? "en_US"), [config.locale]);
  const themePresetOptions = useMemo(
    () => [
      ...Object.entries(THEME_PRESETS).map(([key, preset]) => ({
        value: key,
        label: t(preset.label),
      })),
      { value: CUSTOM_PRESET_KEY, label: t("Custom") },
    ],
    [t]
  );
  const fontPresetOptions = useMemo(
    () =>
      Object.entries(FONT_PRESETS).map(([value, preset]) => ({
        value,
        label: t(preset.label),
      })),
    [t]
  );

  const toggleHighContrast = () => {
    const next = !highContrast;
    shellPreferencesStore.getState().setHighContrast(next);
    const root = document.getElementById("react-shell-root");
    if (root) {
      root.classList.toggle("wp-react-ui-high-contrast", next);
      document.body.classList.toggle("wp-react-ui-high-contrast", next);
    }
  };

  const [lightLogoId, setLightLogoId] = useState(0);
  const [lightLogoUrl, setLightLogoUrl] = useState<string | null>(null);
  const [darkLogoId, setDarkLogoId] = useState(0);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [longLogoId, setLongLogoId] = useState(0);
  const [useLongLogo, setUseLongLogo] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [fontPreset, setFontPreset] = useState<FontPresetKey>(DEFAULT_FONT_PRESET);
  const [patterns, setPatterns] = useState("");

  useEffect(() => {
    void load();
  }, [load]);

  const applySettingsToDraft = useCallback((next: BrandingData) => {
    setLightLogoId(next.lightLogoId);
    setLightLogoUrl(next.lightLogoUrl);
    setDarkLogoId(next.darkLogoId);
    setDarkLogoUrl(next.darkLogoUrl);
    setLongLogoId(next.longLogoId);
    setUseLongLogo(next.useLongLogo);
    setPrimaryColor(next.primaryColor);
    setFontPreset(
      (next.fontPreset in FONT_PRESETS ? next.fontPreset : DEFAULT_FONT_PRESET) as FontPresetKey
    );
    setPatterns(next.openInNewTabPatterns.join("\n"));
  }, []);

  useEffect(() => {
    if (!settings) return;
    applySettingsToDraft(settings);
  }, [settings, applySettingsToDraft]);

  const isDirty = useMemo(() => {
    if (!settings) return false;
    const savedPreset = shellPreferencesStore.getState().themePreset ?? "default";
    const savedCustomColor =
      shellPreferencesStore.getState().customPresetColor ?? DEFAULT_PRIMARY_COLOR;
    return (
      lightLogoId !== settings.lightLogoId ||
      darkLogoId !== settings.darkLogoId ||
      longLogoId !== settings.longLogoId ||
      useLongLogo !== settings.useLongLogo ||
      primaryColor !== settings.primaryColor ||
      fontPreset !== settings.fontPreset ||
      patterns !== settings.openInNewTabPatterns.join("\n") ||
      draftThemePreset !== savedPreset ||
      (draftThemePreset === CUSTOM_PRESET_KEY && draftCustomColor !== savedCustomColor)
    );
  }, [
    settings,
    lightLogoId,
    darkLogoId,
    longLogoId,
    useLongLogo,
    primaryColor,
    fontPreset,
    patterns,
    draftThemePreset,
    draftCustomColor,
  ]);

  const handleSave = useCallback(async () => {
    const payload: Pick<
      BrandingData,
      | "lightLogoId"
      | "darkLogoId"
      | "longLogoId"
      | "useLongLogo"
      | "primaryColor"
      | "fontPreset"
      | "openInNewTabPatterns"
    > = {
      lightLogoId,
      darkLogoId,
      longLogoId,
      useLongLogo,
      primaryColor,
      fontPreset,
      openInNewTabPatterns: patterns
        .split("\n")
        .map((pattern) => pattern.trim())
        .filter(Boolean),
    };

    await save(payload);
    shellPreferencesStore.getState().setThemePreset(draftThemePreset, draftCustomColor);
  }, [
    lightLogoId,
    darkLogoId,
    longLogoId,
    useLongLogo,
    primaryColor,
    fontPreset,
    patterns,
    draftThemePreset,
    draftCustomColor,
    save,
  ]);

  if (loading && !settings) {
    return (
      <Flex align="center" justify="center" style={{ height: "100%", pointerEvents: "auto" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        background: token.colorBgLayout,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1240,
          margin: "0 auto",
          padding: screens.md ? 40 : 20,
          boxSizing: "border-box",
        }}
      >
        <Flex
          justify="space-between"
          align={screens.md ? "flex-start" : "flex-start"}
          gap={24}
          wrap
          style={{ marginBottom: 32 }}
        >
          <div style={{ minWidth: 0 }}>
            <Title
              level={2}
              style={{ marginTop: 0, marginBottom: 6, fontSize: screens.md ? 30 : 24 }}
            >
              {t("Brand Assets")}
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 760, fontSize: 14 }}>
              {t(
                "Centralized management for identity logos, color accents, and global navigation fragments used across the shell."
              )}
            </Paragraph>
          </div>

          <Flex gap={12} wrap align="center">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 14px",
                borderRadius: token.borderRadiusLG,
                background: token.colorFillAlter,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: 700, color: token.colorTextSecondary }}>
                {t("Logo-only sidebar")}
              </Text>
              <Switch
                checked={useLongLogo}
                onChange={setUseLongLogo}
                checkedChildren={t("On")}
                unCheckedChildren={t("Off")}
              />
            </div>
            <Button
              type="primary"
              loading={saving}
              onClick={() => void handleSave()}
              disabled={!isDirty}
            >
              {t("Save Brand Assets")}
            </Button>
          </Flex>
        </Flex>

        <SurfaceCard
          title={t("Brand Assets In The Sidebar")}
          description={t("Upload the logo variants used in the shell sidebar.")}
          icon={<PictureOutlined />}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: screens.md ? "repeat(2, minmax(0, 1fr))" : "1fr",
              gap: 24,
            }}
          >
            <LogoField
              label={t("Light Theme Logo")}
              description=""
              logoId={lightLogoId}
              logoUrl={lightLogoUrl}
              previewBackground="#ffffff"
              onSelect={(id, url) => {
                setLightLogoId(id);
                setLightLogoUrl(url);
              }}
              onRemove={() => {
                setLightLogoId(0);
                setLightLogoUrl(null);
              }}
            />

            <LogoField
              label={t("Dark Theme Logo")}
              description=""
              logoId={darkLogoId}
              logoUrl={darkLogoUrl}
              previewBackground="#1f2430"
              onSelect={(id, url) => {
                setDarkLogoId(id);
                setDarkLogoUrl(url);
              }}
              onRemove={() => {
                setDarkLogoId(0);
                setDarkLogoUrl(null);
              }}
            />
          </div>
        </SurfaceCard>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: screens.md ? "repeat(2, minmax(0, 1fr))" : "1fr",
            gap: 24,
            alignItems: "stretch",
            marginTop: 24,
          }}
        >
          <SurfaceCard
            title={t("Brand Colors")}
            description={t("Shell color theme and accent palette.")}
            icon={<BgColorsOutlined />}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: "100%" }}>
              {/* Theme Preset dropdown */}
              <div>
                <Text
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: token.colorTextTertiary,
                  }}
                >
                  {t("Theme Preset")}
                </Text>
                <Select
                  value={draftThemePreset}
                  style={{ width: "100%" }}
                  size="large"
                  onChange={(key: string) => setDraftThemePreset(key)}
                  optionRender={(option) => {
                    const key = option.value as string;
                    const color =
                      key === CUSTOM_PRESET_KEY
                        ? draftCustomColor
                        : THEME_PRESETS[key]?.primaryColor || DEFAULT_PRIMARY_COLOR;
                    return (
                      <Flex align="center" gap={10}>
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: color,
                            flexShrink: 0,
                            display: "inline-block",
                            border: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        />
                        <span>{option.label}</span>
                      </Flex>
                    );
                  }}
                  options={themePresetOptions}
                />
                {draftThemePreset === CUSTOM_PRESET_KEY && (
                  <div style={{ marginTop: 12 }}>
                    <ColorPicker
                      value={draftCustomColor}
                      format="hex"
                      size="large"
                      showText
                      disabledAlpha
                      onChange={(c) => setDraftCustomColor(c.toHexString())}
                    />
                  </div>
                )}
              </div>

              <div
                style={{
                  paddingTop: 4,
                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Flex justify="space-between" align="center" gap={16}>
                  <div>
                    <Text strong style={{ display: "block", fontSize: 14 }}>
                      {t("High Contrast")}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      {t("Increase text and border contrast for better readability.")}
                    </Text>
                  </div>
                  <Switch
                    checked={highContrast}
                    onChange={toggleHighContrast}
                    checkedChildren={<EyeOutlined />}
                  />
                </Flex>
              </div>

              {/* Color bar + reset — always at bottom */}
              <div style={{ marginTop: "auto" }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    overflow: "hidden",
                    display: "flex",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ flex: "0 0 48%", background: token.colorPrimary }} />
                  <div style={{ flex: "0 0 24%", background: `${token.colorPrimary}80` }} />
                  <div style={{ flex: "0 0 18%", background: token.colorTextSecondary }} />
                  <div style={{ flex: "0 0 10%", background: token.colorBorderSecondary }} />
                </div>
                <Flex justify="space-between" align="center" gap={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("Global distribution preview")}
                  </Text>
                  <Button
                    icon={<ReloadOutlined />}
                    size="middle"
                    style={{ minHeight: 38, paddingInline: 14 }}
                    onClick={() => {
                      setDraftThemePreset("default");
                      setDraftCustomColor(DEFAULT_PRIMARY_COLOR);
                    }}
                  >
                    {t("Reset to default")}
                  </Button>
                </Flex>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard
            title={t("Link Rules")}
            description={t("Patterns that should open in a new tab.")}
            icon={<LinkOutlined />}
          >
            <Text
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: token.colorTextTertiary,
              }}
            >
              <span>{t("Global URL Fragments")}</span>
              <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>
                {t("One fragment per line")}
              </span>
            </Text>

            <TextArea
              value={patterns}
              onChange={(event) => setPatterns(event.target.value)}
              rows={8}
              placeholder={"/brand-kit\n/identity-guide\n/media-assets"}
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, "Liberation Mono", monospace',
                borderRadius: token.borderRadiusLG,
                background: token.colorFillAlter,
                resize: "none",
              }}
            />

            <Flex justify="space-between" align="center" gap={12} wrap style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("Matching links bypass the iframe and open directly in a new tab.")}
              </Text>
            </Flex>
          </SurfaceCard>
        </div>

        <div style={{ marginTop: 24 }}>
          <SurfaceCard
            title={t("Typography")}
            description={t("Choose the font system used across the shell interface.")}
            icon={<FontSizeOutlined />}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: screens.md ? "320px minmax(0, 1fr)" : "1fr",
                gap: 24,
                alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: token.colorTextTertiary,
                  }}
                >
                  {t("Font preset")}
                </Text>
                <Select
                  value={fontPreset}
                  options={fontPresetOptions}
                  onChange={(value) => setFontPreset(value as FontPresetKey)}
                  style={{ width: "100%" }}
                  size="large"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: screens.lg
                    ? "repeat(4, minmax(0, 1fr))"
                    : screens.sm
                      ? "repeat(2, minmax(0, 1fr))"
                      : "1fr",
                  gap: 16,
                }}
              >
                {Object.entries(FONT_PRESETS).map(([key, preset]) => {
                  const active = key === fontPreset;

                  return (
                    <div
                      key={key}
                      style={{
                        padding: 18,
                        borderRadius: token.borderRadiusLG,
                        border: `1px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`,
                        background: active ? `${token.colorPrimary}10` : token.colorBgContainer,
                      }}
                    >
                      <Text
                        style={{
                          display: "block",
                          marginBottom: 6,
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: active ? token.colorPrimary : token.colorTextTertiary,
                        }}
                      >
                        {t(preset.label)}
                      </Text>
                      <div
                        style={{
                          fontFamily: preset.family,
                          fontSize: 28,
                          lineHeight: 1,
                          marginBottom: 10,
                          color: token.colorTextHeading,
                        }}
                      >
                        Aa
                      </div>
                      <Text
                        style={{ display: "block", fontFamily: preset.family, fontWeight: 600 }}
                      >
                        {t("Brand Assets")}
                      </Text>
                      <Text
                        type="secondary"
                        style={{ display: "block", fontFamily: preset.family, fontSize: 12 }}
                      >
                        The quick brown fox
                      </Text>
                    </div>
                  );
                })}
              </div>
            </div>
          </SurfaceCard>
        </div>

        <Flex
          justify="space-between"
          align="center"
          gap={16}
          wrap
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("Changes are applied live after saving.")}
          </Text>

          <Flex gap={12} wrap />
        </Flex>
      </div>
    </div>
  );
}

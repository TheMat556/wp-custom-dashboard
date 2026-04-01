import {
  BgColorsOutlined,
  DeleteOutlined,
  LinkOutlined,
  PictureOutlined,
  ReloadOutlined,
  FontSizeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, ColorPicker, Flex, Grid, Input, Select, Spin, Switch, Typography, theme } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import type { BrandingData } from "../../services/brandingApi";
import { brandingStore } from "../../store/brandingStore";
import { DEFAULT_FONT_PRESET, FONT_PRESETS, type FontPresetKey } from "../../utils/fontPresets";
import { openMediaPicker } from "../../utils/wpMedia";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;
const DEFAULT_PRIMARY_COLOR = "#4f46e5";
const FONT_PRESET_OPTIONS = Object.entries(FONT_PRESETS).map(([value, preset]) => ({
  value,
  label: preset.label,
}));

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

  const handleSelect = useCallback(async () => {
    const result = await openMediaPicker({
      title: `Select ${label.toLowerCase()}`,
      buttonText: `Use as ${label.toLowerCase()}`,
    });
    if (result) {
      onSelect(result.id, result.url);
    }
  }, [label, onSelect]);

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
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: token.colorTextTertiary,
          }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 11, color: token.colorTextQuaternary }}>{description}</Text>
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
            alt={`${label} preview`}
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
            <Text type="secondary" style={{ fontSize: 13 }}>
              No image selected
            </Text>
          </Flex>
        )}
      </div>

      <Flex gap={10} wrap>
        <Button type="default" onClick={handleSelect} icon={<UploadOutlined />}>
          {logoId ? "Replace" : "Upload"}
        </Button>
        {logoId > 0 && (
          <Button danger onClick={onRemove} icon={<DeleteOutlined />}>
            Delete
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
            <Text type="secondary" style={{ fontSize: 13 }}>
              {description}
            </Text>
          )}
        </div>
      </Flex>

      {children}
    </section>
  );
}

export default function BrandingSettings() {
  const settings = useStore(brandingStore, (state) => state.settings);
  const loading = useStore(brandingStore, (state) => state.loading);
  const saving = useStore(brandingStore, (state) => state.saving);
  const load = useStore(brandingStore, (state) => state.load);
  const save = useStore(brandingStore, (state) => state.save);
  const { token } = theme.useToken();
  const screens = useBreakpoint();

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
    setFontPreset((next.fontPreset in FONT_PRESETS ? next.fontPreset : DEFAULT_FONT_PRESET) as FontPresetKey);
    setPatterns(next.openInNewTabPatterns.join("\n"));
  }, []);

  useEffect(() => {
    if (!settings) return;
    applySettingsToDraft(settings);
  }, [settings, applySettingsToDraft]);

  const isDirty = useMemo(() => {
    if (!settings) return false;
    return (
      lightLogoId !== settings.lightLogoId ||
      darkLogoId !== settings.darkLogoId ||
      longLogoId !== settings.longLogoId ||
      useLongLogo !== settings.useLongLogo ||
      primaryColor !== settings.primaryColor ||
      fontPreset !== settings.fontPreset ||
      patterns !== settings.openInNewTabPatterns.join("\n")
    );
  }, [settings, lightLogoId, darkLogoId, longLogoId, useLongLogo, primaryColor, fontPreset, patterns]);

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
  }, [lightLogoId, darkLogoId, longLogoId, useLongLogo, primaryColor, fontPreset, patterns, save]);

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
            <Title level={2} style={{ marginTop: 0, marginBottom: 6, fontSize: screens.md ? 30 : 24 }}>
              Brand Assets
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 760, fontSize: 14 }}>
              Centralized management for identity logos, color accents, and global navigation
              fragments used across the shell.
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
                Logo-only sidebar
              </Text>
              <Switch
                checked={useLongLogo}
                onChange={setUseLongLogo}
                checkedChildren="On"
                unCheckedChildren="Off"
              />
            </div>
            <Button type="primary" loading={saving} onClick={() => void handleSave()} disabled={!isDirty}>
              Save Brand Assets
            </Button>
          </Flex>
        </Flex>

        <SurfaceCard
          title="Brand Assets In The Sidebar"
          description="Upload the logo variants used in the shell sidebar."
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
              label="Light Theme Logo"
              description="400 x 120px suggested"
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
              label="Dark Theme Logo"
              description="SVG preferred"
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
            title="Brand Colors"
            description="Primary shell accent and palette preview."
            icon={<BgColorsOutlined />}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: screens.sm ? "repeat(2, minmax(0, 1fr))" : "1fr",
                gap: 18,
                marginBottom: 20,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: token.colorTextTertiary,
                  }}
                >
                  Primary Accent
                </Text>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: token.borderRadiusLG,
                    background: token.colorFillAlter,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      background: primaryColor,
                      flexShrink: 0,
                    }}
                  />
                  <ColorPicker
                    value={primaryColor}
                    format="hex"
                    size="large"
                    disabledAlpha
                    showText
                    onChange={(color) => setPrimaryColor(color.toHexString())}
                  />
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: token.colorTextTertiary,
                  }}
                >
                  Default
                </Text>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: token.borderRadiusLG,
                    background: token.colorFillAlter,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      background: DEFAULT_PRIMARY_COLOR,
                      flexShrink: 0,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, "Liberation Mono", monospace',
                    }}
                  >
                    {DEFAULT_PRIMARY_COLOR}
                  </Text>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "auto" }}>
              <div
                style={{
                  height: 10,
                  width: "100%",
                  borderRadius: 999,
                  overflow: "hidden",
                  display: "flex",
                  background: token.colorFillAlter,
                  marginBottom: 8,
                }}
              >
                <div style={{ width: "48%", background: primaryColor }} />
                <div style={{ width: "24%", background: `${primaryColor}80` }} />
                <div style={{ width: "18%", background: token.colorTextSecondary }} />
                <div style={{ width: "10%", background: token.colorBorderSecondary }} />
              </div>
              <Flex justify="space-between" align="center" gap={12} wrap>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Global distribution preview
                </Text>
                <Button icon={<ReloadOutlined />} onClick={() => setPrimaryColor(DEFAULT_PRIMARY_COLOR)}>
                  Reset to default
                </Button>
              </Flex>
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="Link Rules"
            description="Patterns that should open in a new tab."
            icon={<LinkOutlined />}
          >
            <Text
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: token.colorTextTertiary,
              }}
            >
              <span>Global URL Fragments</span>
              <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>
                One fragment per line
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
              <Text type="secondary" style={{ fontSize: 11 }}>
                Matching links bypass the iframe and open directly in a new tab.
              </Text>
            </Flex>
          </SurfaceCard>
        </div>

        <SurfaceCard
          title="Typography"
          description="Choose the font system used across the shell interface."
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
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: token.colorTextTertiary,
                }}
              >
                Font preset
              </Text>
              <Select
                value={fontPreset}
                options={FONT_PRESET_OPTIONS}
                onChange={(value) => setFontPreset(value as FontPresetKey)}
                style={{ width: "100%" }}
                size="large"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: screens.lg ? "repeat(4, minmax(0, 1fr))" : screens.sm ? "repeat(2, minmax(0, 1fr))" : "1fr",
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
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: active ? token.colorPrimary : token.colorTextTertiary,
                      }}
                    >
                      {preset.label}
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
                    <Text style={{ display: "block", fontFamily: preset.family, fontWeight: 600 }}>
                      Brand Assets
                    </Text>
                    <Text type="secondary" style={{ display: "block", fontFamily: preset.family, fontSize: 12 }}>
                      The quick brown fox
                    </Text>
                  </div>
                );
              })}
            </div>
          </div>
        </SurfaceCard>

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
            Changes are applied live after saving.
          </Text>

          <Flex gap={12} wrap />
        </Flex>
      </div>
    </div>
  );
}

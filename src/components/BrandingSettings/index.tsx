import {
  DeleteOutlined,
  LinkOutlined,
  PictureOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Flex, Grid, Input, Spin, Switch, Typography, theme } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "zustand";
import type { BrandingData } from "../../services/brandingApi";
import { brandingStore } from "../../store/brandingStore";
import { openMediaPicker } from "../../utils/wpMedia";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

function LogoField({
  label,
  description,
  logoId,
  logoUrl,
  onSelect,
  onRemove,
  wide,
  previewBackground,
}: {
  label: string;
  description: string;
  logoId: number;
  logoUrl: string | null;
  onSelect: (id: number, url: string) => void;
  onRemove: () => void;
  wide?: boolean;
  previewBackground?: string;
}) {
  const { token } = theme.useToken();
  const hasLogo = logoId > 0 && !!logoUrl;

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
        padding: 24,
      }}
    >
      <Text
        strong
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 14,
          color: token.colorTextHeading,
        }}
      >
        {label}
      </Text>
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        {description}
      </Text>

      <div
        style={{
          aspectRatio: wide ? "21 / 9" : "16 / 9",
          minHeight: wide ? 144 : 180,
          marginBottom: 16,
          padding: 16,
          borderRadius: token.borderRadiusLG,
          border: `1px dashed ${token.colorBorder}`,
          background: previewBackground ?? (hasLogo ? token.colorBgLayout : token.colorFillQuaternary),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${label} preview`}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "100%",
              maxHeight: wide ? 72 : 96,
              objectFit: "contain",
            }}
          />
        ) : (
          <Flex vertical align="center" gap={8}>
            <PictureOutlined style={{ fontSize: 28, color: token.colorTextTertiary }} />
            <Text type="secondary" style={{ fontSize: 13 }}>
              No image selected
            </Text>
          </Flex>
        )}
      </div>

      <Flex gap={8} wrap>
        <Button type="primary" icon={<UploadOutlined />} onClick={handleSelect}>
          {logoId ? "Change image" : "Select image"}
        </Button>
        {logoId > 0 && (
          <Button danger icon={<DeleteOutlined />} onClick={onRemove}>
            Remove
          </Button>
        )}
      </Flex>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorder}`,
        background: token.colorBgContainer,
        padding: 32,
      }}
    >
      <Flex justify="space-between" align="flex-start" gap={16} style={{ marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            {title}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {description}
          </Text>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: token.colorPrimaryBg,
            color: token.colorPrimary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 20,
          }}
        >
          {icon}
        </div>
      </Flex>

      {children}
    </section>
  );
}

export default function BrandingSettings() {
  const settings = useStore(brandingStore, (s) => s.settings);
  const loading = useStore(brandingStore, (s) => s.loading);
  const saving = useStore(brandingStore, (s) => s.saving);
  const load = useStore(brandingStore, (s) => s.load);
  const save = useStore(brandingStore, (s) => s.save);
  const { token } = theme.useToken();
  const screens = useBreakpoint();

  const [lightLogoId, setLightLogoId] = useState(0);
  const [lightLogoUrl, setLightLogoUrl] = useState<string | null>(null);
  const [darkLogoId, setDarkLogoId] = useState(0);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [longLogoId, setLongLogoId] = useState(0);
  const [useLongLogo, setUseLongLogo] = useState(false);
  const [patterns, setPatterns] = useState("");

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!settings) return;
    setLightLogoId(settings.lightLogoId);
    setLightLogoUrl(settings.lightLogoUrl);
    setDarkLogoId(settings.darkLogoId);
    setDarkLogoUrl(settings.darkLogoUrl);
    setLongLogoId(settings.longLogoId);
    setUseLongLogo(settings.useLongLogo);
    setPatterns(settings.openInNewTabPatterns.join("\n"));
  }, [settings]);

  const isDirty = useCallback((): boolean => {
    if (!settings) return false;
    return (
      lightLogoId !== settings.lightLogoId ||
      darkLogoId !== settings.darkLogoId ||
      longLogoId !== settings.longLogoId ||
      useLongLogo !== settings.useLongLogo ||
      patterns !== settings.openInNewTabPatterns.join("\n")
    );
  }, [settings, lightLogoId, darkLogoId, longLogoId, useLongLogo, patterns]);

  const handleSave = useCallback(async () => {
    const data: Pick<
      BrandingData,
      "lightLogoId" | "darkLogoId" | "longLogoId" | "useLongLogo" | "openInNewTabPatterns"
    > = {
      lightLogoId,
      darkLogoId,
      longLogoId,
      useLongLogo,
      openInNewTabPatterns: patterns
        .split("\n")
        .map((pattern) => pattern.trim())
        .filter(Boolean),
    };
    await save(data);
  }, [lightLogoId, darkLogoId, longLogoId, useLongLogo, patterns, save]);

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
        overflowY: "auto",
        height: "100%",
        pointerEvents: "auto",
        overflowX: "hidden",
        background: token.colorBgLayout,
      }}
    >
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: screens.md ? 32 : 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: screens.lg ? "minmax(0, 1.8fr) minmax(300px, 1fr)" : "1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <SectionCard
            title="Brand Assets In The Sidebar"
            description="Upload the logo variants used in the shell sidebar."
            icon={<PictureOutlined />}
          >
            <Flex
              align={screens.sm ? "center" : "flex-start"}
              justify="space-between"
              gap={16}
              wrap
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorFillAlter,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text strong style={{ display: "block", marginBottom: 4 }}>
                  Use long logo in sidebar
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Hides the site name and Control Panel text and keeps only the logo visible in the
                  expanded sidebar.
                </Text>
              </div>
              <Switch
                checked={useLongLogo}
                onChange={setUseLongLogo}
                checkedChildren="Long"
                unCheckedChildren="Short"
              />
            </Flex>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: screens.lg
                  ? "repeat(2, minmax(0, 1fr))"
                  : "1fr",
                gap: 20,
              }}
            >
              <LogoField
                label="Light Theme Logo"
                description="Shown on light backgrounds."
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
                description="Optional. Falls back to the light logo when unset."
                logoId={darkLogoId}
                logoUrl={darkLogoUrl}
                previewBackground="#0f172a"
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
          </SectionCard>

          <Flex vertical gap={24}>
            <SectionCard
              title="Link Rules"
              description="Control which admin links should break out of the shell and open in a new tab."
              icon={<LinkOutlined />}
            >
              <Text strong style={{ display: "block", marginBottom: 6 }}>
                Open links in new tab
              </Text>
              <Text type="secondary" style={{ display: "block", marginBottom: 14, fontSize: 13 }}>
                Enter one URL fragment per line. Matching links will open in a new browser tab
                instead of inside the shell iframe.
              </Text>
              <TextArea
                value={patterns}
                onChange={(e) => setPatterns(e.target.value)}
                rows={10}
                placeholder={"builder=bricks\nedit_with_bricks\nelementor\n/wp-admin/customize.php"}
                style={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, "Liberation Mono", monospace',
                  borderRadius: token.borderRadiusLG,
                }}
              />
            </SectionCard>
          </Flex>
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-start" }}>
          <Button
            type="primary"
            size="large"
            loading={saving}
            onClick={() => void handleSave()}
            disabled={!isDirty()}
          >
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

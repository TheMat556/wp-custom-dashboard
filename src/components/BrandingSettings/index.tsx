import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Input, Space, Spin, Typography, theme } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "zustand";
import type { BrandingData } from "../../services/brandingApi";
import { brandingStore } from "../../store/brandingStore";
import { openMediaPicker } from "../../utils/wpMedia";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function LogoField({
  label,
  description,
  logoId,
  logoUrl,
  onSelect,
  onRemove,
}: {
  label: string;
  description: string;
  logoId: number;
  logoUrl: string | null;
  onSelect: (id: number, url: string) => void;
  onRemove: () => void;
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
    <div>
      <Text strong style={{ display: "block", marginBottom: 4 }}>
        {label}
      </Text>
      <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
        {description}
      </Text>

      {logoUrl && (
        <div
          style={{
            marginBottom: 12,
            padding: 16,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            background: token.colorBgLayout,
            display: "inline-block",
          }}
        >
          <img
            src={logoUrl}
            alt={`${label} preview`}
            style={{ display: "block", maxWidth: 200, maxHeight: 80, objectFit: "contain" }}
          />
        </div>
      )}

      <Flex gap={8}>
        <Button icon={<UploadOutlined />} onClick={handleSelect}>
          {logoId ? "Change image" : "Select image"}
        </Button>
        {logoId > 0 && (
          <Button icon={<DeleteOutlined />} onClick={onRemove}>
            Remove
          </Button>
        )}
      </Flex>
    </div>
  );
}

export default function BrandingSettings() {
  const settings = useStore(brandingStore, (s) => s.settings);
  const loading = useStore(brandingStore, (s) => s.loading);
  const saving = useStore(brandingStore, (s) => s.saving);
  const load = useStore(brandingStore, (s) => s.load);
  const save = useStore(brandingStore, (s) => s.save);
  const { token } = theme.useToken();

  const [lightLogoId, setLightLogoId] = useState(0);
  const [lightLogoUrl, setLightLogoUrl] = useState<string | null>(null);
  const [darkLogoId, setDarkLogoId] = useState(0);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [patterns, setPatterns] = useState("");

  // Load settings on mount
  useEffect(() => {
    void load();
  }, [load]);

  // Sync local state when settings load
  useEffect(() => {
    if (!settings) return;
    setLightLogoId(settings.lightLogoId);
    setLightLogoUrl(settings.lightLogoUrl);
    setDarkLogoId(settings.darkLogoId);
    setDarkLogoUrl(settings.darkLogoUrl);
    setPatterns(settings.openInNewTabPatterns.join("\n"));
  }, [settings]);

  const isDirty = useCallback((): boolean => {
    if (!settings) return false;
    return (
      lightLogoId !== settings.lightLogoId ||
      darkLogoId !== settings.darkLogoId ||
      patterns !== settings.openInNewTabPatterns.join("\n")
    );
  }, [settings, lightLogoId, darkLogoId, patterns]);

  const handleSave = useCallback(async () => {
    const data: Pick<BrandingData, "lightLogoId" | "darkLogoId" | "openInNewTabPatterns"> = {
      lightLogoId,
      darkLogoId,
      openInNewTabPatterns: patterns
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean),
    };
    await save(data);
  }, [lightLogoId, darkLogoId, patterns, save]);

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
        padding: 32,
        maxWidth: 720,
        overflowY: "auto",
        height: "100%",
        pointerEvents: "auto",
      }}
    >
      <Title level={3} style={{ marginBottom: 4 }}>
        Branding Settings
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Customize logos and navigation behavior for the admin shell.
      </Paragraph>

      {/* Logos section */}
      <Card
        title="Logos"
        style={{ marginBottom: 24 }}
        styles={{ header: { borderBottom: `1px solid ${token.colorBorderSecondary}` } }}
      >
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <LogoField
            label="Light logo"
            description="Shown on light backgrounds. Falls back to the bundled default when unset."
            logoId={lightLogoId}
            logoUrl={lightLogoUrl}
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
            label="Dark logo"
            description="Optional. Falls back to the light logo when unset."
            logoId={darkLogoId}
            logoUrl={darkLogoUrl}
            onSelect={(id, url) => {
              setDarkLogoId(id);
              setDarkLogoUrl(url);
            }}
            onRemove={() => {
              setDarkLogoId(0);
              setDarkLogoUrl(null);
            }}
          />
        </Space>
      </Card>

      {/* Navigation section */}
      <Card
        title="Navigation"
        style={{ marginBottom: 24 }}
        styles={{ header: { borderBottom: `1px solid ${token.colorBorderSecondary}` } }}
      >
        <Text strong style={{ display: "block", marginBottom: 4 }}>
          Open links in new tab
        </Text>
        <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
          Enter one URL fragment per line. Links containing a pattern will open in a new browser tab
          instead of inside the shell iframe.
        </Text>
        <TextArea
          value={patterns}
          onChange={(e) => setPatterns(e.target.value)}
          rows={6}
          placeholder={"builder=bricks\nedit_with_bricks\nelementor"}
          style={{ fontFamily: "monospace" }}
        />
      </Card>

      {/* Save */}
      <Button
        type="primary"
        size="large"
        loading={saving}
        onClick={handleSave}
        disabled={!isDirty()}
      >
        Save changes
      </Button>
    </div>
  );
}

import { BgColorsOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, ColorPicker, Flex, Select, Switch, Typography, theme } from "antd";
import { CUSTOM_PRESET_KEY, THEME_PRESETS } from "../../../../config/themePresets";
import { DEFAULT_PRIMARY_COLOR } from "../../brandingDraft";
import { SurfaceCard } from "./SurfaceCard";

const { Text } = Typography;

interface ColorSettingsSectionProps {
  t: (key: string, vars?: Record<string, string | number>) => string;
  themePresetOptions: Array<{ value: string; label: string }>;
  draftThemePreset: string;
  draftCustomColor: string;
  highContrast: boolean;
  onThemePresetChange: (value: string) => void;
  onCustomColorChange: (value: string) => void;
  onToggleHighContrast: () => void;
  onReset: () => void;
}

export function ColorSettingsSection({
  t,
  themePresetOptions,
  draftThemePreset,
  draftCustomColor,
  highContrast,
  onThemePresetChange,
  onCustomColorChange,
  onToggleHighContrast,
  onReset,
}: ColorSettingsSectionProps) {
  const { token } = theme.useToken();

  return (
    <SurfaceCard
      title={t("Brand Colors")}
      description={t("Shell color theme and accent palette.")}
      icon={<BgColorsOutlined />}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: "100%" }}>
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
            onChange={onThemePresetChange}
            optionRender={(option) => {
              const key = String(option.value);
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
                onChange={(color) => onCustomColorChange(color.toHexString())}
              />
            </div>
          )}
        </div>

        <div
          className="wp-react-ui-inset-panel"
          style={{
            padding: "16px 18px",
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
              onChange={onToggleHighContrast}
              checkedChildren={<EyeOutlined />}
            />
          </Flex>
        </div>

        <div style={{ marginTop: "auto" }}>
          <div
            className="wp-react-ui-inset-panel"
            style={{
              height: 8,
              borderRadius: 999,
              overflow: "hidden",
              display: "flex",
              marginBottom: 12,
              padding: 0,
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
              onClick={onReset}
            >
              {t("Reset to default")}
            </Button>
          </Flex>
        </div>
      </div>
    </SurfaceCard>
  );
}

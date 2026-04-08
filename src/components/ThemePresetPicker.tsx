import { CheckOutlined } from "@ant-design/icons";
import { ColorPicker, Flex, Typography, theme } from "antd";
import { useStore } from "zustand";
import { CUSTOM_PRESET_KEY, THEME_PRESETS } from "../config/themePresets";
import { useShellConfig } from "../context/ShellConfigContext";
import { shellPreferencesStore } from "../store/shellPreferencesStore";

const { Text } = Typography;

export function ThemePresetPicker() {
  const { token } = theme.useToken();
  const { branding } = useShellConfig();
  const themePreset = useStore(shellPreferencesStore, (s) => s.themePreset);
  const customPresetColor = useStore(shellPreferencesStore, (s) => s.customPresetColor);

  const presetEntries = Object.entries(THEME_PRESETS);

  function getDisplayColor(key: string): string {
    if (key === "default") return branding.primaryColor || "#4f46e5";
    return THEME_PRESETS[key]?.primaryColor || "#4f46e5";
  }

  return (
    <Flex vertical gap={8} style={{ padding: "4px 0", minWidth: 200 }}>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", padding: "0 4px" }}>
        Theme Preset
      </Text>
      {presetEntries.map(([key, preset]) => (
        <Flex
          key={key}
          align="center"
          gap={10}
          onClick={() => shellPreferencesStore.getState().setThemePreset(key)}
          style={{
            padding: "8px 10px",
            borderRadius: token.borderRadiusLG,
            cursor: "pointer",
            background: themePreset === key ? token.colorPrimaryBg : "transparent",
            transition: "background 150ms ease",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: getDisplayColor(key),
              flexShrink: 0,
              border: `2px solid ${token.colorBorderSecondary}`,
            }}
          />
          <Flex vertical style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 13 }}>{preset.label}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{preset.description}</Text>
          </Flex>
          {themePreset === key && (
            <CheckOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
          )}
        </Flex>
      ))}
      {/* Custom */}
      <Flex
        align="center"
        gap={10}
        style={{
          padding: "8px 10px",
          borderRadius: token.borderRadiusLG,
          background: themePreset === CUSTOM_PRESET_KEY ? token.colorPrimaryBg : "transparent",
        }}
      >
        <ColorPicker
          value={customPresetColor || branding.primaryColor || "#4f46e5"}
          disabledAlpha
          size="small"
          onChange={(color) => {
            shellPreferencesStore.getState().setThemePreset(CUSTOM_PRESET_KEY, color.toHexString());
          }}
        />
        <Flex vertical style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 13 }}>Custom</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>Pick your own color</Text>
        </Flex>
        {themePreset === CUSTOM_PRESET_KEY && (
          <CheckOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
        )}
      </Flex>
    </Flex>
  );
}

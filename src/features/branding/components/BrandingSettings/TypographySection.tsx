import { FontSizeOutlined } from "@ant-design/icons";
import { Select, Typography, theme } from "antd";
import { FONT_PRESETS, type FontPresetKey } from "../../../../utils/fontPresets";
import { SurfaceCard } from "./SurfaceCard";

const { Text } = Typography;

interface TypographySectionProps {
  t: (key: string, vars?: Record<string, string | number>) => string;
  fontPreset: FontPresetKey;
  fontPresetOptions: Array<{ value: string; label: string }>;
  isLg: boolean;
  isSm: boolean;
  isMd: boolean;
  onFontPresetChange: (value: FontPresetKey) => void;
}

export function TypographySection({
  t,
  fontPreset,
  fontPresetOptions,
  isLg,
  isSm,
  isMd,
  onFontPresetChange,
}: TypographySectionProps) {
  const { token } = theme.useToken();

  return (
    <SurfaceCard
      title={t("Typography")}
      description={t("Choose the font system used across the shell interface.")}
      icon={<FontSizeOutlined />}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMd ? "320px minmax(0, 1fr)" : "1fr",
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
            onChange={(value) => onFontPresetChange(value as FontPresetKey)}
            style={{ width: "100%" }}
            size="large"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isLg
              ? "repeat(4, minmax(0, 1fr))"
              : isSm
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
                <Text style={{ display: "block", fontFamily: preset.family, fontWeight: 600 }}>
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
  );
}

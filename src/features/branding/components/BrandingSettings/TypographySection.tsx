import { FontSizeOutlined } from "@ant-design/icons";
import { Select, Typography, theme } from "antd";
import { FONT_PRESETS, type FontPresetKey } from "../../../../utils/fontPresets";
import styles from "./BrandingSettings.module.css";
import { SurfaceCard } from "./SurfaceCard";

const { Text } = Typography;

interface TypographySectionProps {
  t: (key: string, vars?: Record<string, string | number>) => string;
  fontPreset: FontPresetKey;
  fontPresetOptions: Array<{ value: string; label: string }>;
  isXl: boolean;
  isMd: boolean;
  isLg: boolean;
  onFontPresetChange: (value: FontPresetKey) => void;
}

export function TypographySection({
  t,
  fontPreset,
  fontPresetOptions,
  isXl,
  isMd,
  isLg,
  onFontPresetChange,
}: TypographySectionProps) {
  const { token } = theme.useToken();

  return (
    <SurfaceCard
      title={t("Typography")}
      description={t("Choose the font system used across the shell interface.")}
      icon={<FontSizeOutlined />}
    >
      <div className={`${styles.typoLayout}${isLg ? "" : ` ${styles.typoLayoutSingle}`}`}>
        <div style={{ minWidth: 0 }}>
          <Text className={styles.fieldLabel} style={{ color: token.colorTextTertiary }}>
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
          className={`${styles.typoCardGrid}${
            !isXl ? (isMd ? ` ${styles.typoCardGridHalf}` : ` ${styles.typoCardGridFull}`) : ""
          }`}
        >
          {Object.entries(FONT_PRESETS).map(([key, preset]) => {
            const active = key === fontPreset;

            return (
              <div
                key={key}
                className={`wp-react-ui-inset-panel ${styles.typoCard} ${
                  active ? styles.typoCardActive : styles.typoCardInactive
                }`}
                style={{
                  borderRadius: token.borderRadiusLG,
                  border: `1px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`,
                  background: active ? `${token.colorPrimary}10` : "var(--surface-inset)",
                }}
              >
                <Text
                  className={`${styles.typoLabel} ${
                    active ? styles.typoLabelActive : styles.typoLabelInactive
                  }`}
                  style={{ color: active ? token.colorPrimary : token.colorTextTertiary }}
                >
                  {t(preset.label)}
                </Text>
                <div
                  className={styles.typoSample}
                  style={{
                    fontFamily: preset.family,
                    color: token.colorTextHeading,
                  }}
                >
                  Aa
                </div>
                <Text className={styles.typoHeading} style={{ fontFamily: preset.family }}>
                  {t("Brand Assets")}
                </Text>
                <Text
                  type="secondary"
                  className={styles.typoBody}
                  style={{ fontFamily: preset.family }}
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

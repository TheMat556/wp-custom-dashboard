import { LinkOutlined } from "@ant-design/icons";
import { Input, Typography, theme } from "antd";
import styles from "./BrandingSettings.module.css";
import { SurfaceCard } from "./SurfaceCard";

const { Text } = Typography;
const { TextArea } = Input;

interface LinkRulesSectionProps {
  t: (key: string, vars?: Record<string, string | number>) => string;
  patterns: string;
  onPatternsChange: (value: string) => void;
}

export function LinkRulesSection({ t, patterns, onPatternsChange }: LinkRulesSectionProps) {
  const { token } = theme.useToken();

  return (
    <SurfaceCard
      title={t("Link Rules")}
      description={t("Patterns that should open in a new tab.")}
      icon={<LinkOutlined />}
    >
      <div className={styles.fieldLabelRow} style={{ color: token.colorTextTertiary }}>
        <span>{t("Global URL Fragments")}</span>
        <span className={styles.fieldLabelRowSpan}>{t("One fragment per line")}</span>
      </div>

      <TextArea
        value={patterns}
        onChange={(event) => onPatternsChange(event.target.value)}
        rows={8}
        placeholder={"/brand-kit\n/identity-guide\n/media-assets"}
        className={styles.linkRulesTextarea}
        style={{
          borderRadius: token.borderRadiusLG,
          background: "var(--surface-inset)",
          borderColor: "var(--color-border-subtle)",
        }}
      />

      <div className={styles.linkRulesFooter}>
        <Text type="secondary" className={styles.linkRulesHint}>
          {t("Matching links bypass the iframe and open directly in a new tab.")}
        </Text>
      </div>
    </SurfaceCard>
  );
}

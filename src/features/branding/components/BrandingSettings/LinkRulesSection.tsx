import { LinkOutlined } from "@ant-design/icons";
import { Flex, Input, Typography, theme } from "antd";
import { SurfaceCard } from "./SurfaceCard";

const { Text } = Typography;
const { TextArea } = Input;

interface LinkRulesSectionProps {
  t: (key: string, vars?: Record<string, string | number>) => string;
  patterns: string;
  onPatternsChange: (value: string) => void;
}

export function LinkRulesSection({
  t,
  patterns,
  onPatternsChange,
}: LinkRulesSectionProps) {
  const { token } = theme.useToken();

  return (
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
        onChange={(event) => onPatternsChange(event.target.value)}
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
  );
}

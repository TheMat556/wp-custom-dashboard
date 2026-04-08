import { Flex, Typography, theme } from "antd";
import type { SectionProps } from "../types";

const { Text } = Typography;

export function Section({ icon, title, description, children, extra }: SectionProps) {
  const { token } = theme.useToken();
  return (
    <section
      style={{
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        padding: 28,
        boxSizing: "border-box",
      }}
    >
      <Flex align="center" justify="space-between" gap={12} style={{ marginBottom: 20 }}>
        <Flex align="center" gap={10}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `${token.colorPrimary}12`,
              color: token.colorPrimary,
              fontSize: 18,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <div style={{ minWidth: 0 }}>
            <Text style={{ fontSize: 15, fontWeight: 600, display: "block" }}>{title}</Text>
            {description && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {description}
              </Text>
            )}
          </div>
        </Flex>
        {extra}
      </Flex>
      {children}
    </section>
  );
}

import { Flex, Typography, theme } from "antd";
import type { SectionProps } from "../types";

const { Title, Text } = Typography;

export function Section({ icon, title, description, children, extra }: SectionProps) {
  const { token } = theme.useToken();
  return (
    <section
      style={{
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        padding: 32,
        boxSizing: "border-box",
      }}
    >
      <Flex align="center" justify="space-between" gap={12} style={{ marginBottom: 24 }}>
        <Flex align="center" gap={12}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: `${token.colorPrimary}18`,
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
          <div style={{ minWidth: 0 }}>
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
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

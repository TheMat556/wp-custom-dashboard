import { Flex, Typography, theme } from "antd";
import type { ReactNode } from "react";

const { Title, Text } = Typography;

interface SurfaceCardProps {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}

export function SurfaceCard({ title, description, icon, children }: SurfaceCardProps) {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        padding: 32,
        boxSizing: "border-box",
      }}
    >
      <Flex align="center" gap={10} style={{ marginBottom: 24 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: `${token.colorPrimary}12`,
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
        <div style={{ minWidth: 0, marginLeft: 4 }}>
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>
            {title}
          </Title>
          {description && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              {description}
            </Text>
          )}
        </div>
      </Flex>

      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  );
}

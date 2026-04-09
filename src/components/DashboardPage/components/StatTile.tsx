import { QuestionCircleOutlined } from "@ant-design/icons";
import { Flex, Tooltip, Typography, theme } from "antd";
import type { StatTileProps } from "../types";

const { Text } = Typography;

export function StatTile({ icon, label, value, sub, color, tooltip, onClick }: StatTileProps) {
  const { token } = theme.useToken();
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      style={{
        background: token.colorBgContainer,
        borderRadius: token.borderRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderTop: `2px solid ${color}`,
        padding: "12px 14px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = token.boxShadow;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <Flex align="flex-start" gap={10}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${color}15`,
            color,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Flex align="center" gap={4}>
            <Text
              type="secondary"
              style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              {label}
            </Text>
            {tooltip && (
              <Tooltip title={tooltip} overlayStyle={{ maxWidth: 240 }}>
                <QuestionCircleOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
              </Tooltip>
            )}
          </Flex>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.25,
              color: token.colorText,
              marginTop: 1,
            }}
          >
            {value}
          </div>
          {sub && <div style={{ marginTop: 3 }}>{sub}</div>}
        </div>
      </Flex>
    </div>
  );
}

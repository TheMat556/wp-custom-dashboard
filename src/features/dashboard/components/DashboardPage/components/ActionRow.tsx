import { AlertOutlined, InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Flex, Tag, Typography, theme } from "antd";
import { useState } from "react";
import { navigate } from "../../../../../utils/wp";
import type { ActionRowProps } from "../types";

const { Text } = Typography;

export function ActionRow({ item, adminUrl }: ActionRowProps) {
  const { token } = theme.useToken();
  const [open, setOpen] = useState(item.severity === "error");

  const severityColor =
    item.severity === "error"
      ? token.colorError
      : item.severity === "warning"
        ? token.colorWarning
        : token.colorInfo;

  const tagColor =
    item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "processing";

  const SevIcon =
    item.severity === "error"
      ? AlertOutlined
      : item.severity === "warning"
        ? WarningOutlined
        : InfoCircleOutlined;

  const hasDetail = Boolean(item.impact || item.description);

  return (
    <div
      style={{
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        paddingBottom: 10,
        marginBottom: 10,
      }}
    >
      <Flex align="flex-start" gap={10}>
        <SevIcon style={{ color: severityColor, fontSize: 14, marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" justify="space-between" gap={8} wrap="wrap">
            <button
              type="button"
              style={{
                appearance: "none",
                background: "transparent",
                border: 0,
                cursor: hasDetail ? "pointer" : "default",
                padding: 0,
                fontSize: 14,
                fontWeight: 500,
                flex: 1,
                textAlign: "left",
                color: token.colorText,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => hasDetail && setOpen((o) => !o)}
              aria-expanded={hasDetail ? open : undefined}
              aria-label={
                hasDetail ? `${item.title}: ${open ? "collapse" : "expand"} details` : item.title
              }
            >
              {item.title}
              {hasDetail && (
                <span
                  aria-hidden="true"
                  style={{ fontSize: 12, color: token.colorTextDescription }}
                >
                  {open ? "▲" : "▼"}
                </span>
              )}
            </button>
            <Tag
              color={tagColor}
              style={{ margin: 0, cursor: "pointer", flexShrink: 0, fontSize: 12 }}
              onClick={() => navigate(item.url, adminUrl)}
            >
              {item.action}
            </Tag>
          </Flex>
          {open && hasDetail && (
            <div
              className="wp-react-ui-inset-panel"
              style={{
                marginTop: 6,
                padding: "8px 12px",
                borderLeft: `3px solid ${severityColor}`,
              }}
            >
              {item.impact && (
                <Text
                  style={{
                    fontSize: 12,
                    display: "block",
                    marginBottom: item.description ? 6 : 0,
                    fontWeight: 500,
                    color: severityColor,
                  }}
                >
                  Impact: {item.impact}
                </Text>
              )}
              {item.description && (
                <Text type="secondary" style={{ fontSize: 12, display: "block", lineHeight: 1.6 }}>
                  {item.description}
                </Text>
              )}
            </div>
          )}
        </div>
      </Flex>
    </div>
  );
}

// Re-export for convenience
export type { ActionRowProps };

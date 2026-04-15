import { AlertOutlined, InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Flex, Typography, theme } from "antd";
import { useState } from "react";
import { navigate } from "../../../../../utils/wp";
import type { ActionRowProps } from "../types";

const { Text } = Typography;

type Severity = "error" | "warning" | "info";

function getSeverityConfig(severity: Severity, token: ReturnType<typeof theme.useToken>["token"]) {
  const color =
    severity === "error"
      ? token.colorError
      : severity === "warning"
        ? token.colorWarning
        : token.colorInfo;
  const buttonDanger = severity === "error";
  const Icon =
    severity === "error"
      ? AlertOutlined
      : severity === "warning"
        ? WarningOutlined
        : InfoCircleOutlined;
  return { color, buttonDanger, Icon };
}

export function ActionRow({ item, adminUrl, t }: ActionRowProps & { t: (key: string) => string }) {
  const { token } = theme.useToken();
  const [open, setOpen] = useState(item.severity === "error");

  const {
    color: severityColor,
    buttonDanger,
    Icon: SevIcon,
  } = getSeverityConfig(item.severity, token);

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
            <Button
              danger={buttonDanger}
              size="small"
              onClick={() => navigate(item.url, adminUrl)}
              style={{ flexShrink: 0 }}
            >
              {item.action}
            </Button>
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
                  {t("Impact:")} {item.impact}
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

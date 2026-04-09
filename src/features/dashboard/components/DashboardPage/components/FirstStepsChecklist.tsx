import { CheckOutlined, CloseOutlined, RocketOutlined } from "@ant-design/icons";
import { Button, Flex, Progress, Tooltip, Typography, theme } from "antd";
import { navigate } from "../../../../../utils/wp";
import type { FirstStepsChecklistProps } from "../types";
import { Section } from "./Section";

const { Text } = Typography;

export function FirstStepsChecklist({
  checklist,
  checklistDone,
  t,
  adminUrl,
  isMd,
  onClose,
}: FirstStepsChecklistProps) {
  const { token } = theme.useToken();

  return (
    <Section
      icon={<RocketOutlined />}
      title={t("First Steps — {done} of {total} done", {
        done: checklistDone,
        total: checklist.length,
      })}
      description={t(
        "Complete these steps to get your site fully ready. Each one takes just a few minutes."
      )}
      extra={
        <Flex align="center" gap={12}>
          <Progress
            type="circle"
            percent={Math.round((checklistDone / checklist.length) * 100)}
            size={40}
            strokeColor={token.colorPrimary}
          />
          <Tooltip title={t("Dismiss checklist")}>
            <Button
              type="text"
              icon={<CloseOutlined />}
              size="small"
              onClick={onClose}
              style={{ color: token.colorTextTertiary }}
            />
          </Tooltip>
        </Flex>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMd ? "1fr 1fr" : "1fr",
          gap: 8,
        }}
      >
        {checklist.map((item) =>
          item.done ? (
            <Flex
              key={item.key}
              align="center"
              gap={10}
              className="wp-react-ui-inset-panel wp-react-ui-inset-panel--success"
              style={{ padding: "10px 14px" }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: token.colorSuccess,
                  border: `2px solid ${token.colorSuccess}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckOutlined style={{ fontSize: 11, color: "#fff" }} />
              </div>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: token.colorTextTertiary,
                  textDecoration: "line-through",
                }}
              >
                {item.label}
              </Text>
            </Flex>
          ) : (
            <button
              key={item.key}
              type="button"
              className="wp-react-ui-inset-panel"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                cursor: "pointer",
                transition: "border-color 0.15s",
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
                appearance: "none",
              }}
              onClick={() => navigate(item.url, adminUrl)}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "transparent",
                  border: `2px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: token.colorText,
                }}
              >
                {item.label}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                {t("Open →")}
              </Text>
            </button>
          )
        )}
      </div>
    </Section>
  );
}

import {
  AlertOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Alert, Collapse, Flex, Typography, theme } from "antd";
import type { ActionCenterProps } from "../types";
import { ActionRow } from "./ActionRow";
import { Section } from "./Section";

export function ActionCenter({
  actions,
  criticalActions,
  warningActions,
  infoActions,
  hasUpdates,
  t,
  adminUrl,
}: ActionCenterProps) {
  const { token } = theme.useToken();

  return (
    <Section
      icon={<AlertOutlined />}
      title={t("What Needs Your Attention")}
      description={
        actions.length === 0
          ? t("All clear")
          : t("{n} urgent, {w} to review", {
              n: criticalActions.length,
              w: warningActions.length,
            })
      }
      extra={
        criticalActions.length > 0 ? (
          <Typography.Text style={{ color: token.colorError, fontWeight: 600, fontSize: 14 }}>
            {criticalActions.length} urgent
          </Typography.Text>
        ) : undefined
      }
    >
      {actions.length === 0 ? (
        <Flex vertical align="center" gap={8} style={{ padding: "20px 0" }}>
          <CheckCircleOutlined style={{ fontSize: 32, color: token.colorSuccess }} />
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {t("Everything looks great! No action required.")}
          </Typography.Text>
        </Flex>
      ) : (
        <>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 14 }}
          >
            {criticalActions.length > 0
              ? t("Start with the red items first — everything else can wait.")
              : t("A few things to review. Start with the orange items.")}
          </Typography.Text>

          {hasUpdates && (
            <Alert
              type="info"
              showIcon
              message={
                <Typography.Text style={{ fontSize: 12 }}>
                  {t("Make a backup before applying updates — most hosts offer this in one click.")}
                </Typography.Text>
              }
              style={{ marginBottom: 14, borderRadius: token.borderRadius }}
            />
          )}

          {criticalActions.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                <AlertOutlined style={{ color: token.colorError, fontSize: 12 }} />
                <Typography.Text
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: token.colorError,
                    letterSpacing: "0.07em",
                  }}
                >
                  {t("Act Now")}
                </Typography.Text>
              </Flex>
              {criticalActions.map((item) => (
                <ActionRow key={item.title} item={item} adminUrl={adminUrl} />
              ))}
            </div>
          )}

          {warningActions.length > 0 && (
            <div style={{ marginTop: criticalActions.length ? 12 : 0 }}>
              <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                <WarningOutlined style={{ color: token.colorWarning, fontSize: 12 }} />
                <Typography.Text
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: token.colorWarning,
                    letterSpacing: "0.07em",
                  }}
                >
                  {t("Review Soon")}
                </Typography.Text>
              </Flex>
              {warningActions.map((item) => (
                <ActionRow key={item.title} item={item} adminUrl={adminUrl} />
              ))}
            </div>
          )}

          {infoActions.length > 0 && (
            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: "info",
                  label: (
                    <Flex align="center" gap={6}>
                      <InfoCircleOutlined style={{ color: token.colorInfo, fontSize: 12 }} />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {t(
                          infoActions.length === 1
                            ? "{n} low-priority item"
                            : "{n} low-priority items",
                          { n: infoActions.length }
                        )}
                      </Typography.Text>
                    </Flex>
                  ),
                  children: infoActions.map((item) => (
                    <ActionRow key={item.title} item={item} adminUrl={adminUrl} />
                  )),
                },
              ]}
              style={{ marginTop: 8 }}
            />
          )}
        </>
      )}
    </Section>
  );
}

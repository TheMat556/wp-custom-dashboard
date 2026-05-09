import { MailOutlined } from "@ant-design/icons";
import { Typography, theme } from "antd";
import type { BusinessFunctions, TFunc } from "../../types";
import { StatTile } from "../StatTile";

export interface KpiEmailProps {
  bizData: BusinessFunctions | null | undefined;
  t: TFunc;
}

export function KpiEmail({ bizData, t }: KpiEmailProps) {
  const { token } = theme.useToken();

  const email = bizData?.emailDelivery;

  if (!email) {
    return (
      <StatTile
        icon={<MailOutlined />}
        label={t("Email")}
        value="\u2014"
        color={token.colorTextSecondary}
        tooltip={t("Email delivery status not available")}
      />
    );
  }

  const isConfigured = email.status === "configured";

  const color = isConfigured ? token.colorSuccess : token.colorError;
  const value = isConfigured ? t("Configured") : t("Not configured");

  const sub = email.smtpPlugin ? (
    <Typography.Text style={{ fontSize: 11, color: token.colorTextTertiary }}>
      {email.smtpPlugin}
    </Typography.Text>
  ) : (
    <Typography.Text style={{ fontSize: 12, color: token.colorWarning }}>
      {t("Default (unreliable)")}
    </Typography.Text>
  );

  const tooltip = isConfigured
    ? t("Email delivery is configured and working")
    : t("Without an SMTP plugin, contact form emails may end up in spam");

  return (
    <StatTile
      icon={<MailOutlined />}
      label={t("Email")}
      value={value}
      sub={sub}
      color={color}
      tooltip={tooltip}
    />
  );
}

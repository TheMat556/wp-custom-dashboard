import { CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Progress, Typography, theme } from "antd";
import { navigate } from "../../../../../../utils/wp";
import type { SiteHealthData, SiteSpeedData, TFunc } from "../../types";
import { StatTile } from "../StatTile";

type TokenType = ReturnType<typeof theme.useToken>["token"];

export interface KpiWebsiteProps {
  isSiteDown: boolean;
  health: SiteHealthData | null | undefined;
  speed: SiteSpeedData | null | undefined;
  t: TFunc;
  adminUrl: string;
}

function getWebsiteSub(
  isSiteDown: boolean,
  health: SiteHealthData | null | undefined,
  strokeColor: string,
  t: TFunc,
  token: TokenType
): React.ReactNode {
  if (health && health.score > 0 && !isSiteDown) {
    return (
      <Progress
        percent={health.score}
        size="small"
        showInfo={false}
        strokeColor={strokeColor}
        style={{ margin: 0 }}
      />
    );
  }
  const textColor = isSiteDown ? token.colorError : token.colorTextTertiary;
  const text = isSiteDown ? t("Not reachable") : t("Click for details");
  return <Typography.Text style={{ fontSize: 12, color: textColor }}>{text}</Typography.Text>;
}

function getWebsiteColor(
  isSiteDown: boolean,
  healthStatus: string | undefined,
  token: TokenType
): string {
  if (isSiteDown || healthStatus === "critical") return token.colorError;
  if (healthStatus === "good") return token.colorSuccess;
  return token.colorWarning;
}

function getWebsiteTooltip(
  isSiteDown: boolean,
  healthStatus: string | undefined,
  speed: SiteSpeedData | null | undefined
): string {
  if (isSiteDown) return speed?.reason ?? "Site unreachable";
  if (healthStatus !== "good") return "WordPress found configuration issues";
  return "Site is running and reachable";
}

export function KpiWebsite({ isSiteDown, health, speed, t, adminUrl }: KpiWebsiteProps) {
  const { token } = theme.useToken();
  const healthStatus = health?.status;

  let icon: React.ReactNode;
  if (isSiteDown) icon = <ExclamationCircleOutlined />;
  else if (healthStatus === "good") icon = <CheckCircleOutlined />;
  else icon = <WarningOutlined />;

  let value: string;
  if (isSiteDown) value = t("Offline");
  else if (healthStatus === "good") value = t("Online");
  else value = t("Check");

  let strokeColor = token.colorWarning;
  if (healthStatus === "good") strokeColor = token.colorSuccess;
  else if (healthStatus === "critical") strokeColor = token.colorError;

  return (
    <StatTile
      icon={icon}
      label={t("Website")}
      value={value}
      sub={getWebsiteSub(isSiteDown, health, strokeColor, t, token)}
      color={getWebsiteColor(isSiteDown, healthStatus, token)}
      tooltip={getWebsiteTooltip(isSiteDown, healthStatus, speed)}
      onClick={() => navigate("site-health.php", adminUrl)}
    />
  );
}

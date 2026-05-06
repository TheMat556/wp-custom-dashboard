import { ThunderboltOutlined } from "@ant-design/icons";
import { Typography, theme } from "antd";
import type { SiteSpeedData, TFunc } from "../../types";
import { StatTile } from "../StatTile";

type TokenType = ReturnType<typeof theme.useToken>["token"];

export interface KpiSpeedProps {
  isSiteDown: boolean;
  speed: SiteSpeedData | null | undefined;
  t: TFunc;
}

function getSpeedLabel(speed: SiteSpeedData | null | undefined, t: TFunc): string {
  if (speed?.status === "good") return t("Fast");
  if (speed?.status === "fair") return t("Acceptable");
  if (speed?.status) return t("Slow");
  return "";
}

function getSpeedColor(
  isSiteDown: boolean,
  speed: SiteSpeedData | null | undefined,
  token: TokenType
): string {
  if (isSiteDown) return token.colorError;
  if (speed?.status === "good") return token.colorSuccess;
  if (speed?.status === "fair") return token.colorWarning;
  return token.colorError;
}

export function KpiSpeed({ isSiteDown, speed, t }: KpiSpeedProps) {
  const { token } = theme.useToken();
  const speedLabel = getSpeedLabel(speed, t);
  const value = isSiteDown ? t("Error") : speedLabel || "—";
  const color = getSpeedColor(isSiteDown, speed, token);
  const sub: React.ReactNode =
    !isSiteDown && speed?.ms != null ? (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {speed.ms} ms
      </Typography.Text>
    ) : null;

  return (
    <StatTile
      icon={<ThunderboltOutlined />}
      label={t("Speed")}
      value={value}
      sub={sub}
      color={color}
      tooltip={t("Homepage load time. Under 600 ms is good. Refreshes every 5 minutes.")}
    />
  );
}

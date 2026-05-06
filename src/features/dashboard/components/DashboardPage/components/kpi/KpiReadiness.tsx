import { RocketOutlined } from "@ant-design/icons";
import { Typography, theme } from "antd";
import type { TFunc } from "../../types";
import { StatTile } from "../StatTile";

export interface KpiReadinessProps {
  readiness: number | null | undefined;
  t: TFunc;
}

export function KpiReadiness({ readiness, t }: KpiReadinessProps) {
  const { token } = theme.useToken();

  if (readiness == null) {
    return (
      <StatTile
        icon={<RocketOutlined />}
        label={t("Readiness")}
        value="\u2014"
        color={token.colorTextSecondary}
        tooltip={t("Site readiness score measures how launch-ready your site is")}
      />
    );
  }

  let color: string;
  if (readiness >= 80) color = token.colorSuccess;
  else if (readiness >= 50) color = token.colorWarning;
  else color = token.colorError;

  const sub = (
    <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
      {t("Setup checklist")}
    </Typography.Text>
  );

  return (
    <StatTile
      icon={<RocketOutlined />}
      label={t("Readiness")}
      value={`${readiness}%`}
      sub={sub}
      color={color}
      tooltip={t(
        "Site readiness score — higher is better. Complete the setup checklist to improve it."
      )}
    />
  );
}

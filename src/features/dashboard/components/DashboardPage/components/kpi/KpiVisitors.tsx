import { LineChartOutlined } from "@ant-design/icons";
import { Typography, theme } from "antd";
import type { TFunc } from "../../types";
import { StatTile } from "../StatTile";

type TokenType = ReturnType<typeof theme.useToken>["token"];

export interface KpiVisitorsProps {
  total30Views: number;
  viewTrend: number;
  t: TFunc;
  intlLocale: string;
}

function getVisitorsSub(
  total30Views: number,
  viewTrend: number,
  t: TFunc,
  token: TokenType
): React.ReactNode {
  if (total30Views > 0 && viewTrend !== 0) {
    const trendColor = viewTrend > 0 ? token.colorSuccess : token.colorError;
    const arrow = viewTrend > 0 ? "↑" : "↓";
    return (
      <Typography.Text style={{ fontSize: 12, color: trendColor }}>
        {arrow} {Math.abs(viewTrend)}% {t("vs yesterday")}
      </Typography.Text>
    );
  }
  if (total30Views > 0) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("Stable traffic")}
      </Typography.Text>
    );
  }
  return (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      {t("Tracking active")}
    </Typography.Text>
  );
}

export function KpiVisitors({ total30Views, viewTrend, t, intlLocale }: KpiVisitorsProps) {
  const { token } = theme.useToken();
  return (
    <StatTile
      icon={<LineChartOutlined />}
      label={t("Visitors (last 30 days)")}
      value={total30Views > 0 ? total30Views.toLocaleString(intlLocale) : "\u2014"}
      sub={getVisitorsSub(total30Views, viewTrend, t, token)}
      color={token.colorPrimary}
      tooltip={t("Install Yoast SEO (free) to track your search visibility")}
    />
  );
}

import { LineChartOutlined } from "@ant-design/icons";
import { Typography, theme } from "antd";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { TrafficChartsProps } from "../types";
import { Section } from "./Section";

const { Text } = Typography;

export function TrafficCharts({ trend, t }: TrafficChartsProps) {
  const { token } = theme.useToken();

  const tooltipStyle = {
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    fontSize: 12,
    color: token.colorText,
  };

  return (
    <Section icon={<LineChartOutlined />} title={t("Page Views")} description={t("Last 30 days")}>
      {trend.some((d) => d.views > 0) ? (
        <div role="img" aria-label={t("Page views over the last 30 days")}>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={token.colorPrimary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={token.colorPrimary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: token.colorTextSecondary }}
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: token.colorTextSecondary }}
                width={30}
              />
              <RechartsTooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="views"
                name={t("Visits")}
                stroke={token.colorPrimary}
                fill="url(#viewsGrad)"
                strokeWidth={2}
                isAnimationActive
                animationBegin={120}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="wp-react-ui-empty-state">
          <LineChartOutlined style={{ fontSize: 28, color: token.colorTextQuaternary }} />
          <Text type="secondary" style={{ textAlign: "center", fontSize: 13, maxWidth: 260 }}>
            {t("No data yet. Tracking is active — views appear as people visit your site.")}
          </Text>
        </div>
      )}
    </Section>
  );
}

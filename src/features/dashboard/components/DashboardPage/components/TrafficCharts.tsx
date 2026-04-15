import { GlobalOutlined, LineChartOutlined } from "@ant-design/icons";
import { Flex, Typography, theme } from "antd";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { localCountryName } from "../../../../../utils/i18n";
import type { TrafficChartsProps } from "../types";
import { countryFlag } from "../utils/formatters";
import { Section } from "./Section";

const { Text } = Typography;

export function TrafficCharts({ trend, countries, t, intlLocale, isMd }: TrafficChartsProps) {
  const { token } = theme.useToken();

  const chartColors = [
    token.colorPrimary,
    token.colorInfo,
    token.colorSuccess,
    token.colorWarning,
    "#722ed1",
    "#eb2f96",
    "#13c2c2",
  ];

  const tooltipStyle = {
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    fontSize: 12,
    color: token.colorText,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMd ? "1fr 1fr" : "1fr",
        gap: 16,
        marginBottom: 16,
      }}
    >
      {/* Page Views */}
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
          <Flex vertical align="center" justify="center" style={{ height: 170 }} gap={10}>
            <LineChartOutlined style={{ fontSize: 32, color: token.colorTextQuaternary }} />
            <Text type="secondary" style={{ textAlign: "center", fontSize: 12, maxWidth: 240 }}>
              {t("No data yet. Tracking is active — views appear as people visit your site.")}
            </Text>
          </Flex>
        )}
      </Section>

      {/* Visitors by Country */}
      <Section
        icon={<GlobalOutlined />}
        title={t("Visitors by Country")}
        description={t("Last 30 days")}
      >
        {countries.length > 0 ? (
          <div role="img" aria-label={t("Visitor countries over the last 30 days")}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart
                data={countries.slice(0, 7).map((c) => ({
                  ...c,
                  label: `${countryFlag(c.country)} ${localCountryName(c.country, intlLocale)}`,
                }))}
                layout="vertical"
                margin={{ left: 8, right: 12 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: token.colorTextSecondary }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={116}
                  tick={{ fontSize: 12, fill: token.colorTextSecondary }}
                />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v}`, t("Visits")] as [string, string]}
                />
                <Bar
                  dataKey="visits"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive
                  animationBegin={180}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {countries.slice(0, 7).map((entry, i) => (
                    <Cell key={entry.country} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Flex vertical align="center" justify="center" style={{ height: 170 }} gap={10}>
            <GlobalOutlined style={{ fontSize: 32, color: token.colorTextQuaternary }} />
            <Text type="secondary" style={{ textAlign: "center", fontSize: 12 }}>
              {t("Install WP Statistics (free) to track visitor countries.")}
            </Text>
          </Flex>
        )}
      </Section>
    </div>
  );
}

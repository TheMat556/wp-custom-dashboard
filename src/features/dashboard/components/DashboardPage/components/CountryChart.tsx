import { GlobalOutlined } from "@ant-design/icons";
import { Flex, Typography, theme } from "antd";
import {
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
import type { CountryStatEntry, TFunc } from "../types";
import { countryFlag } from "../utils/formatters";
import { Section } from "./Section";

const { Text } = Typography;

interface CountryChartProps {
  countries: CountryStatEntry[];
  t: TFunc;
  intlLocale: string;
}

export function CountryChart({ countries, t, intlLocale }: CountryChartProps) {
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
    <Section
      icon={<GlobalOutlined />}
      title={t("Visitors by Country")}
      description={t("Last 30 days")}
    >
      {countries.length > 0 ? (
        <div
          role="img"
          aria-label={t("Visitor countries over the last 30 days")}
          style={{ minHeight: 170 }}
        >
          <ResponsiveContainer width="100%" height={170} minWidth={100}>
            <BarChart
              data={countries.slice(0, 7).map((c) => ({
                ...c,
                label: `${countryFlag(c.country)} ${localCountryName(c.country, intlLocale)}`,
              }))}
              layout="vertical"
              margin={{ left: 8, right: 12 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
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
  );
}

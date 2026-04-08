import { LinkOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Flex, Tag, Tooltip, Typography, theme } from "antd";
import {
  Line,
  LineChart,
  ResponsiveContainer,
} from "recharts";
import { navigate } from "../../../utils/wp";
import type { HeroBannerProps } from "../types";

const { Title, Text } = Typography;

export function HeroBanner({
  userName,
  adminUrl,
  greetingKey,
  intlLocale,
  t,
  total30Views,
  viewTrend,
  sparkline,
  stats,
  readiness,
  isMd,
}: HeroBannerProps) {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        borderRadius: token.borderRadiusLG,
        border: "1px solid var(--wp-react-ui-shell-border-strong)",
        background:
          "linear-gradient(135deg, var(--wp-react-ui-shell-accent-soft) 0%, transparent 100%)",
        padding: isMd ? "22px 28px" : "16px 18px",
        marginBottom: 16,
        boxSizing: "border-box",
      }}
    >
      <Flex justify="space-between" align="center" wrap gap={14}>
        <Flex vertical gap={4} style={{ minWidth: 0 }}>
          <Flex align="center" gap={10} wrap>
            <Title level={3} style={{ margin: 0, fontSize: isMd ? 22 : 18 }}>
              {t(greetingKey)}, {userName}!
            </Title>
            {readiness !== null && (
              <Tooltip title={t("{n}% of setup checklist complete", { n: readiness })}>
                <Tag
                  color={readiness >= 100 ? "success" : readiness >= 60 ? "warning" : "error"}
                  style={{ borderRadius: 999, cursor: "default" }}
                >
                  {t("{n}% ready", { n: readiness })}
                </Tag>
              </Tooltip>
            )}
          </Flex>
          {total30Views > 0 ? (
            <Flex align="center" gap={8} style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t("{n} page views in the last 30 days", {
                  n: total30Views.toLocaleString(intlLocale),
                })}
              </Text>
              {viewTrend !== 0 && (
                <Tag
                  color={viewTrend > 0 ? "success" : "error"}
                  style={{ margin: 0, fontSize: 11, borderRadius: 999 }}
                >
                  {viewTrend > 0 ? "↑" : "↓"} {Math.abs(viewTrend)}%
                </Tag>
              )}
            </Flex>
          ) : (
            <Text type="secondary" style={{ fontSize: 13, marginTop: 2 }}>
              {t("Visitor tracking is active — data will appear as people visit your site.")}
            </Text>
          )}
          {stats && (
            <Flex gap={12} style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                WordPress {stats.wpVersion}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                PHP {stats.phpVersion}
              </Text>
            </Flex>
          )}
        </Flex>
        <Flex align="center" gap={8} wrap>
          {isMd && sparkline.some((d) => d.views > 0) && (
            <Tooltip title="Page views — last 7 days">
              <div style={{ width: 90, height: 34 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkline}>
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke={token.colorPrimary}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Tooltip>
          )}
          <Button
            icon={<LinkOutlined />}
            onClick={() =>
              window.open(
                adminUrl.replace(/wp-admin\/?$/, ""),
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            {t("View Site")}
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => navigate("post-new.php?post_type=page", adminUrl)}
          >
            {t("New Page")}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("post-new.php", adminUrl)}
          >
            {t("New Post")}
          </Button>
        </Flex>
      </Flex>
    </div>
  );
}

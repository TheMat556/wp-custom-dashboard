import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LineChartOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UpCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Flex, Progress, Tag, Typography, theme } from "antd";
import { navigate } from "../../../utils/wp";
import type { SummaryTilesProps } from "../types";
import { relativeTime } from "../utils/formatters";
import { StatTile } from "./StatTile";

export function SummaryTiles({
  isSiteDown,
  health,
  speed,
  updates,
  seo,
  seoBasics,
  total30Views,
  viewTrend,
  hasUpdates,
  t,
  intlLocale,
  adminUrl,
  isLg,
  isMd,
}: SummaryTilesProps) {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isLg ? "repeat(5, 1fr)" : isMd ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
        gap: 10,
        marginBottom: 20,
      }}
    >
      {/* Website Status */}
      <StatTile
        icon={
          isSiteDown ? (
            <ExclamationCircleOutlined />
          ) : health?.status === "good" ? (
            <CheckCircleOutlined />
          ) : (
            <WarningOutlined />
          )
        }
        label={t("Website")}
        value={
          isSiteDown ? t("Offline") : health?.status === "good" ? t("Online") : t("Check")
        }
        sub={
          health && health.score > 0 && !isSiteDown ? (
            <Progress
              percent={health.score}
              size="small"
              showInfo={false}
              strokeColor={
                health.status === "good"
                  ? token.colorSuccess
                  : health.status === "critical"
                    ? token.colorError
                    : token.colorWarning
              }
              style={{ margin: 0 }}
            />
          ) : (
            <Typography.Text
              style={{
                fontSize: 11,
                color: isSiteDown ? token.colorError : token.colorTextTertiary,
              }}
            >
              {isSiteDown ? t("Not reachable") : t("Click for details")}
            </Typography.Text>
          )
        }
        color={
          isSiteDown
            ? token.colorError
            : health?.status === "good"
              ? token.colorSuccess
              : health?.status === "critical"
                ? token.colorError
                : token.colorWarning
        }
        tooltip={
          isSiteDown
            ? (speed?.reason ?? "Site unreachable")
            : health?.status !== "good"
              ? "WordPress found configuration issues"
              : "Site is running and reachable"
        }
        onClick={() => navigate("site-health.php", adminUrl)}
      />

      {/* Visitors */}
      <StatTile
        icon={<LineChartOutlined />}
        label={t("Visitors 30d")}
        value={total30Views > 0 ? total30Views.toLocaleString(intlLocale) : "—"}
        sub={
          total30Views > 0 ? (
            viewTrend !== 0 ? (
              <Typography.Text
                style={{
                  fontSize: 11,
                  color: viewTrend > 0 ? token.colorSuccess : token.colorError,
                }}
              >
                {viewTrend > 0 ? "↑" : "↓"} {Math.abs(viewTrend)}% {t("vs yesterday")}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {t("Stable traffic")}
              </Typography.Text>
            )
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t("Tracking active")}
            </Typography.Text>
          )
        }
        color={token.colorPrimary}
        tooltip={t("Install Yoast SEO (free) to track your search visibility")}
      />

      {/* Updates */}
      <StatTile
        icon={<UpCircleOutlined />}
        label={t("Updates")}
        value={updates?.total ?? 0}
        sub={
          hasUpdates ? (
            <Flex gap={3} wrap="wrap">
              {(updates?.plugins ?? 0) > 0 && (
                <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                  {updates!.plugins} plugins
                </Tag>
              )}
              {(updates?.themes ?? 0) > 0 && (
                <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>
                  {updates!.themes} themes
                </Tag>
              )}
              {(updates?.core ?? 0) > 0 && (
                <Tag color="red" style={{ margin: 0, fontSize: 10 }}>
                  core
                </Tag>
              )}
            </Flex>
          ) : updates?.lastChecked ? (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {relativeTime(updates.lastChecked, intlLocale)}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t("All up to date")}
            </Typography.Text>
          )
        }
        color={hasUpdates ? token.colorWarning : token.colorSuccess}
        tooltip={
          hasUpdates
            ? t("Updates fix security issues. Make a backup first, then update.")
            : t("Everything is up to date")
        }
        onClick={() => navigate("update-core.php", adminUrl)}
      />

      {/* Speed */}
      <StatTile
        icon={<ThunderboltOutlined />}
        label={t("Speed")}
        value={isSiteDown ? t("Error") : speed?.ms != null ? `${speed.ms} ms` : "—"}
        sub={
          !isSiteDown && speed?.status ? (
            <Typography.Text
              style={{
                fontSize: 11,
                color:
                  speed.status === "good"
                    ? token.colorSuccess
                    : speed.status === "fair"
                      ? token.colorWarning
                      : token.colorError,
              }}
            >
              {speed.status === "good"
                ? t("Fast")
                : speed.status === "fair"
                  ? t("Acceptable")
                  : t("Slow")}
            </Typography.Text>
          ) : (
            <Typography.Text style={{ fontSize: 11, color: token.colorError }}>
              {t("Unreachable")}
            </Typography.Text>
          )
        }
        color={
          isSiteDown
            ? token.colorError
            : speed?.status === "good"
              ? token.colorSuccess
              : speed?.status === "fair"
                ? token.colorWarning
                : token.colorError
        }
        tooltip={t("Homepage load time. Under 600 ms is good. Refreshes every 5 minutes.")}
      />

      {/* SEO */}
      <StatTile
        icon={<SearchOutlined />}
        label={t("SEO")}
        value={seo?.plugin ? `${seo.score}%` : seoBasics ? `${seoBasics.score}%` : "—"}
        sub={
          seo?.plugin ? (
            seo.issues.length === 0 ? (
              <Typography.Text style={{ fontSize: 11, color: token.colorSuccess }}>
                {t("No issues")}
              </Typography.Text>
            ) : (
              <Typography.Text style={{ fontSize: 11, color: token.colorWarning }}>
                {t("{n} issues", { n: seo.issues.length })}
              </Typography.Text>
            )
          ) : seoBasics ? (
            <Typography.Text
              style={{
                fontSize: 11,
                color: seoBasics.score >= 75 ? token.colorSuccess : token.colorWarning,
              }}
            >
              {t("Basic check")}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t("No plugin")}
            </Typography.Text>
          )
        }
        color={
          seo?.plugin
            ? seo.score >= 80
              ? token.colorSuccess
              : seo.score >= 50
                ? token.colorWarning
                : token.colorError
            : seoBasics
              ? seoBasics.score >= 75
                ? token.colorSuccess
                : token.colorWarning
              : token.colorTextSecondary
        }
        tooltip={
          seo?.plugin
            ? t("Based on Yoast SEO data")
            : seoBasics
              ? t("Basic SEO checks — install Yoast SEO (free) for full tracking")
              : t("Install Yoast SEO (free) to track your search visibility")
        }
        onClick={() => navigate("edit.php?post_type=page", adminUrl)}
      />
    </div>
  );
}

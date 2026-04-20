import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FormOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  UpCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Flex, Progress, Tag, Typography, theme } from "antd";
import { navigate } from "../../../../../utils/wp";
import type {
  PendingUpdates,
  SiteHealthData,
  SiteSpeedData,
  SubmissionStats,
  SummaryTilesProps,
  TFunc,
} from "../types";
import { relativeTime } from "../utils/formatters";
import { StatTile } from "./StatTile";

type TokenType = ReturnType<typeof theme.useToken>["token"];

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

function getWebsiteProps(
  isSiteDown: boolean,
  health: SiteHealthData | null | undefined,
  speed: SiteSpeedData | null | undefined,
  t: TFunc,
  token: TokenType
) {
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

  return {
    icon,
    value,
    sub: getWebsiteSub(isSiteDown, health, strokeColor, t, token),
    color: getWebsiteColor(isSiteDown, healthStatus, token),
    tooltip: getWebsiteTooltip(isSiteDown, healthStatus, speed),
  };
}

function getVisitorsProps(
  total30Views: number,
  viewTrend: number,
  _intlLocale: string,
  t: TFunc,
  token: TokenType
) {
  let sub: React.ReactNode;
  if (total30Views > 0 && viewTrend !== 0) {
    const trendColor = viewTrend > 0 ? token.colorSuccess : token.colorError;
    const arrow = viewTrend > 0 ? "↑" : "↓";
    sub = (
      <Typography.Text style={{ fontSize: 12, color: trendColor }}>
        {arrow} {Math.abs(viewTrend)}% {t("vs yesterday")}
      </Typography.Text>
    );
  } else if (total30Views > 0) {
    sub = (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("Stable traffic")}
      </Typography.Text>
    );
  } else {
    sub = (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("Tracking active")}
      </Typography.Text>
    );
  }
  return { sub };
}

function getUpdatesProps(
  updates: PendingUpdates | null | undefined,
  hasUpdates: boolean,
  intlLocale: string,
  t: TFunc,
  token: TokenType
) {
  let sub: React.ReactNode;
  if (hasUpdates) {
    sub = (
      <Flex gap={3} wrap="wrap">
        {(updates?.plugins ?? 0) > 0 && (
          <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
            {updates?.plugins} plugins
          </Tag>
        )}
        {(updates?.themes ?? 0) > 0 && (
          <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
            {updates?.themes} themes
          </Tag>
        )}
        {(updates?.core ?? 0) > 0 && (
          <Tag color="red" style={{ margin: 0, fontSize: 11 }}>
            {t("WordPress")}
          </Tag>
        )}
      </Flex>
    );
  } else if (updates?.lastChecked) {
    sub = (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {relativeTime(updates.lastChecked, intlLocale)}
      </Typography.Text>
    );
  } else {
    sub = (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("All up to date")}
      </Typography.Text>
    );
  }
  const color = hasUpdates ? token.colorWarning : token.colorSuccess;
  const tooltip = hasUpdates
    ? t("Updates fix security issues. Make a backup first, then update.")
    : t("Everything is up to date");
  return { sub, color, tooltip };
}

function getSpeedProps(
  isSiteDown: boolean,
  speed: SiteSpeedData | null | undefined,
  t: TFunc,
  token: TokenType
) {
  let speedLabel = "";
  if (speed?.status === "good") speedLabel = t("Fast");
  else if (speed?.status === "fair") speedLabel = t("Acceptable");
  else if (speed?.status) speedLabel = t("Slow");

  // Primary value is the speed label
  const value = isSiteDown ? t("Error") : speedLabel || "—";

  let color: string;
  if (isSiteDown) color = token.colorError;
  else if (speed?.status === "good") color = token.colorSuccess;
  else if (speed?.status === "fair") color = token.colorWarning;
  else color = token.colorError;

  // Secondary shows the milliseconds
  const sub: React.ReactNode =
    !isSiteDown && speed?.ms != null ? (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {speed.ms} ms
      </Typography.Text>
    ) : null;

  return { value, sub, color };
}

function getConversionsProps(
  submissionStats: SubmissionStats | null | undefined,
  t: TFunc,
  token: TokenType
) {
  const forms = submissionStats?.formSubmissions30d ?? null;
  const bookings = submissionStats?.bookings30d ?? null;
  const hasAny = forms !== null || bookings !== null;

  const value = hasAny
    ? (forms ?? 0) + (bookings ?? 0)
    : "—";

  let sub: React.ReactNode;
  if (!hasAny) {
    sub = (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("No plugin detected")}
      </Typography.Text>
    );
  } else {
    const parts: React.ReactNode[] = [];
    if (forms !== null) {
      parts.push(
        <Tag key="forms" color="blue" style={{ margin: 0, fontSize: 11 }}>
          {forms} {t("forms")}
        </Tag>
      );
    }
    if (bookings !== null) {
      parts.push(
        <Tag key="bookings" color="purple" style={{ margin: 0, fontSize: 11 }}>
          {bookings} {t("bookings")}
        </Tag>
      );
    }
    sub = (
      <Flex gap={3} wrap="wrap">
        {parts}
      </Flex>
    );
  }

  const color = hasAny && (forms ?? 0) + (bookings ?? 0) > 0
    ? token.colorSuccess
    : token.colorTextSecondary;

  const tooltip = t("Form submissions and bookings in the last 30 days");

  return { value, sub, color, tooltip };
}

export function SummaryTiles({
  isSiteDown,
  health,
  speed,
  updates,
  submissionStats,
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
  const websiteProps = getWebsiteProps(isSiteDown, health, speed, t, token);
  const visitorsProps = getVisitorsProps(total30Views, viewTrend, intlLocale, t, token);
  const updatesProps = getUpdatesProps(updates, hasUpdates, intlLocale, t, token);
  const speedProps = getSpeedProps(isSiteDown, speed, t, token);
  const conversionsProps = getConversionsProps(submissionStats, t, token);

  return (
    <div
      className="wp-react-ui-kpi-grid"
      style={{
        display: "grid",
        gridTemplateColumns: isLg
          ? "repeat(5, minmax(0, 1fr))"
          : isMd
            ? "repeat(3, minmax(0, 1fr))"
            : "repeat(2, minmax(0, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <StatTile
        icon={websiteProps.icon}
        label={t("Website")}
        value={websiteProps.value}
        sub={websiteProps.sub}
        color={websiteProps.color}
        tooltip={websiteProps.tooltip}
        onClick={() => navigate("site-health.php", adminUrl)}
      />

      <StatTile
        icon={<LineChartOutlined />}
        label={t("Visitors (last 30 days)")}
        value={total30Views > 0 ? total30Views.toLocaleString(intlLocale) : "\u2014"}
        sub={visitorsProps.sub}
        color={token.colorPrimary}
        tooltip={t("Install Yoast SEO (free) to track your search visibility")}
      />

      <StatTile
        icon={<UpCircleOutlined />}
        label={t("Updates")}
        value={updates?.total ?? 0}
        sub={updatesProps.sub}
        color={updatesProps.color}
        tooltip={updatesProps.tooltip}
        onClick={() => navigate("update-core.php", adminUrl)}
      />

      <StatTile
        icon={<ThunderboltOutlined />}
        label={t("Speed")}
        value={speedProps.value}
        sub={speedProps.sub}
        color={speedProps.color}
        tooltip={t("Homepage load time. Under 600 ms is good. Refreshes every 5 minutes.")}
      />

      <StatTile
        icon={<FormOutlined />}
        label={t("Conversions (30d)")}
        value={conversionsProps.value}
        sub={conversionsProps.sub}
        color={conversionsProps.color}
        tooltip={conversionsProps.tooltip}
      />
    </div>
  );
}

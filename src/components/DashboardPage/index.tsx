import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileOutlined,
  GlobalOutlined,
  LineChartOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UpCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Flex,
  Grid,
  Progress,
  Spin,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "zustand";
import { useShellConfig } from "../../context/ShellConfigContext";
import {
  bootstrapDashboardStore,
  dashboardStore,
} from "../../store/dashboardStore";
import type { ActionItem, CountryStatEntry, PageItem } from "../../services/dashboardApi";
import { navigate } from "../../utils/wp";

const { Title, Text } = Typography;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  if (h >= 18 && h < 22) return "Good evening";
  return "Good night";
}

function countryFlag(code: string): string {
  return code.toUpperCase().split("").map((c) =>
    String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
  ).join("");
}

function countryName(code: string): string {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; }
  catch { return code; }
}

/* ── Priority icon ─────────────────────────────────────────────────────────── */
function SeverityDot({ severity, size = 10 }: { severity: ActionItem["severity"]; size?: number }) {
  const { token } = theme.useToken();
  const color = severity === "error" ? token.colorError : severity === "warning" ? token.colorWarning : token.colorInfo;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      flexShrink: 0, marginTop: 3,
      boxShadow: severity === "error" ? `0 0 0 3px ${color}28` : undefined,
    }} />
  );
}

/* ── Summary card ──────────────────────────────────────────────────────────── */
function SummaryCard({
  icon, label, value, sub, color, tooltip, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color: string;
  tooltip?: string;
  onClick?: () => void;
}) {
  const { token } = theme.useToken();
  const card = (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        borderRadius: token.borderRadiusLG,
        cursor: onClick ? "pointer" : "default",
        height: "100%",
        borderTop: `3px solid ${color}`,
      }}
      styles={{ body: { padding: "14px 18px" } }}
    >
      <Flex align="flex-start" gap={10}>
        <div style={{
          width: 38, height: 38, borderRadius: token.borderRadius,
          background: `${color}18`, color, fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Flex align="center" gap={4}>
            <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {label}
            </Text>
            {tooltip && (
              <Tooltip title={tooltip} overlayStyle={{ maxWidth: 260 }}>
                <QuestionCircleOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} />
              </Tooltip>
            )}
          </Flex>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25, color: token.colorText, marginTop: 2 }}>
            {value}
          </div>
          {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
        </div>
      </Flex>
    </Card>
  );
  return card;
}

/* ── Action item row with expandable description ───────────────────────────── */
function ActionRow({ item, adminUrl }: { item: ActionItem; adminUrl: string }) {
  const { token } = theme.useToken();
  const [open, setOpen] = useState(item.severity === "error");
  const tagColor = item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "processing";

  return (
    <div style={{
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      paddingBottom: 10, marginBottom: 10,
    }}>
      <Flex align="flex-start" gap={10}>
        <SeverityDot severity={item.severity} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" justify="space-between" gap={8} wrap="wrap">
            <Text
              style={{ fontSize: 13, fontWeight: 500, cursor: item.description ? "pointer" : "default", flex: 1 }}
              onClick={() => item.description && setOpen((o) => !o)}
            >
              {item.title}
              {item.description && (
                <span style={{ marginLeft: 6, fontSize: 11, color: token.colorTextTertiary }}>
                  {open ? "▲" : "▼"}
                </span>
              )}
            </Text>
            <Tag
              color={tagColor}
              style={{ margin: 0, fontSize: 11, cursor: "pointer", flexShrink: 0 }}
              onClick={() => navigate(item.url, adminUrl)}
            >
              {item.action}
            </Tag>
          </Flex>
          {open && item.description && (
            <Text
              type="secondary"
              style={{
                fontSize: 12, display: "block", marginTop: 6, lineHeight: 1.5,
                background: token.colorBgLayout, borderRadius: token.borderRadius,
                padding: "6px 10px",
              }}
            >
              {item.description}
            </Text>
          )}
        </div>
      </Flex>
    </div>
  );
}

/* ── Page row ──────────────────────────────────────────────────────────────── */
function PageRow({ page }: { page: PageItem }) {
  const { token } = theme.useToken();
  const isStale = (page.daysOld ?? 0) > 90;
  return (
    <Flex align="center" gap={8} style={{
      padding: "8px 0", borderBottom: `1px solid ${token.colorBorderSecondary}`,
    }}>
      <FileOutlined style={{ color: token.colorTextTertiary, fontSize: 12, flexShrink: 0 }} />
      <Text
        style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        title={page.title}
      >
        {page.title}
      </Text>
      {isStale && (
        <Tooltip title="Not updated in 90+ days">
          <WarningOutlined style={{ color: token.colorWarning, fontSize: 12 }} />
        </Tooltip>
      )}
      <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}>
        {page.modified}
      </Text>
      <Flex gap={2} style={{ flexShrink: 0 }}>
        <Tooltip title="Edit">
          <Button size="small" type="text" icon={<EditOutlined />}
            onClick={() => window.location.assign(page.editUrl)}
            style={{ color: token.colorTextTertiary }} />
        </Tooltip>
        <Tooltip title="View">
          <Button size="small" type="text" icon={<EyeOutlined />}
            onClick={() => window.open(page.viewUrl, "_blank", "noopener,noreferrer")}
            style={{ color: token.colorTextTertiary }} />
        </Tooltip>
      </Flex>
    </Flex>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const config = useShellConfig();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const data = useStore(dashboardStore, (s) => s.data);
  const loading = useStore(dashboardStore, (s) => s.loading);
  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    bootstrapDashboardStore(config);
    dashboardStore.getState().load();
  }, [config]);

  if (loading && !data) {
    return (
      <Flex align="center" justify="center" style={{ height: "100%", background: token.colorBgLayout }}>
        <Spin size="large" />
      </Flex>
    );
  }

  const health  = data?.siteHealth;
  const updates = data?.pendingUpdates;
  const trend   = data?.visitorTrend ?? [];
  const countries = data?.countryStats ?? [];
  const speed   = data?.siteSpeed;
  const pages   = data?.pagesOverview;
  const actions = data?.actionItems ?? [];
  const seo     = data?.seoOverview;
  const stats   = data?.atAGlance;

  const total30Views = trend.reduce((s, d) => s + d.views, 0);
  const sparkline    = trend.slice(-7);
  const yesterday    = trend[trend.length - 2]?.views ?? 0;
  const todayViews   = trend[trend.length - 1]?.views ?? 0;
  const viewTrend    = yesterday > 0 ? Math.round(((todayViews - yesterday) / yesterday) * 100) : 0;

  const criticalActions = actions.filter((a) => a.severity === "error");
  const warningActions  = actions.filter((a) => a.severity === "warning");
  const infoActions     = actions.filter((a) => a.severity === "info");

  const isSiteDown = speed?.status === "error";

  const tooltipStyle = {
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    fontSize: 12,
    color: token.colorText,
  };

  const isLg = screens.lg;
  const isMd = screens.md;

  return (
    <div style={{
      height: "100%", overflow: "auto",
      background: token.colorBgLayout,
      padding: isMd ? "28px 36px" : "16px 14px",
    }}>

      {/* ── CRITICAL: Site unreachable banner ───────────────────────────── */}
      {isSiteDown && (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={<strong>Your website is not reachable right now</strong>}
          description="We could not connect to your homepage. Your visitors may see an error when trying to visit your site. This could be caused by your hosting provider or a recent change. Contact your host and share this message."
          style={{ marginBottom: 20, borderRadius: token.borderRadiusLG }}
          action={
            <Button danger size="small" onClick={() => navigate("site-health.php", config.adminUrl)}>
              Check Site Health
            </Button>
          }
        />
      )}

      {/* ── Welcome hero ─────────────────────────────────────────────────── */}
      <Card
        style={{
          marginBottom: 20,
          borderRadius: token.borderRadiusLG * 1.5,
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: token.boxShadowTertiary,
        }}
        styles={{ body: { padding: isMd ? "22px 30px" : "16px 18px" } }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Flex vertical gap={3} style={{ minWidth: 0 }}>
            <Flex align="center" gap={10} wrap="wrap">
              <Title level={3} style={{ margin: 0, fontSize: isMd ? 22 : 17 }}>
                {greeting}, {config.user.name}!
              </Title>
              {health && health.status !== "unknown" && !isSiteDown && (
                <Tag
                  icon={health.status === "good" ? <CheckCircleOutlined /> : <WarningOutlined />}
                  color={health.status === "good" ? "success" : health.status === "critical" ? "error" : "warning"}
                  style={{ borderRadius: 999 }}
                >
                  {health.status === "good" ? "All good" : health.status === "recommended" ? "Needs attention" : "Critical"}
                </Tag>
              )}
            </Flex>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {config.branding.siteName} — here's how your site is doing today.
            </Text>
            {total30Views > 0 ? (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 2 }}>
                <LineChartOutlined style={{ marginRight: 4 }} />
                {total30Views.toLocaleString()} page views in the last 30 days
                {viewTrend !== 0 && (
                  <span style={{ marginLeft: 6, color: viewTrend > 0 ? token.colorSuccess : token.colorError }}>
                    {viewTrend > 0 ? "↑" : "↓"} {Math.abs(viewTrend)}% today
                  </span>
                )}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 2 }}>
                Visitor tracking is active — data will appear as people visit your site.
              </Text>
            )}
          </Flex>

          <Flex align="center" gap={14}>
            {isMd && sparkline.some((d) => d.views > 0) && (
              <Tooltip title="Page views — last 7 days">
                <div style={{ width: 110, height: 40 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkline}>
                      <Line type="monotone" dataKey="views" stroke={token.colorPrimary} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Tooltip>
            )}
            <Flex gap={8} wrap="wrap">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("post-new.php?post_type=page", config.adminUrl)}>
                New Page
              </Button>
              <Button icon={<FileOutlined />} onClick={() => navigate("edit.php?post_type=page", config.adminUrl)}>
                All Pages
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isLg ? "repeat(5, 1fr)" : isMd ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
        gap: 12,
        marginBottom: 20,
      }}>
        <SummaryCard
          icon={isSiteDown ? <ExclamationCircleOutlined /> : health?.status === "good" ? <CheckCircleOutlined /> : <WarningOutlined />}
          label="Website"
          value={isSiteDown ? "Offline" : health?.status === "good" ? "Online" : health?.status === "critical" ? "Critical" : "Needs check"}
          sub={
            health && health.score > 0 && !isSiteDown ? (
              <Progress
                percent={health.score}
                size="small"
                showInfo={false}
                strokeColor={health.status === "good" ? token.colorSuccess : health.status === "critical" ? token.colorError : token.colorWarning}
                style={{ margin: 0 }}
              />
            ) : isSiteDown ? (
              <Text style={{ fontSize: 11, color: token.colorError }}>Visitors can't reach you</Text>
            ) : undefined
          }
          color={isSiteDown ? token.colorError : health?.status === "good" ? token.colorSuccess : health?.status === "critical" ? token.colorError : token.colorWarning}
          tooltip={isSiteDown ? "We couldn't connect to your homepage" : health?.status !== "good" ? "WordPress found configuration issues — click for details" : "Your site is running and reachable"}
          onClick={() => navigate("site-health.php", config.adminUrl)}
        />

        <SummaryCard
          icon={<LineChartOutlined />}
          label="Visitors (30d)"
          value={total30Views > 0 ? total30Views.toLocaleString() : "—"}
          sub={
            total30Views > 0 ? (
              viewTrend !== 0 ? (
                <Text style={{ fontSize: 11, color: viewTrend > 0 ? token.colorSuccess : token.colorError }}>
                  {viewTrend > 0 ? "↑" : "↓"} {Math.abs(viewTrend)}% vs yesterday
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 11 }}>Stable traffic</Text>
              )
            ) : (
              <Text type="secondary" style={{ fontSize: 11 }}>Tracking active</Text>
            )
          }
          color={token.colorPrimary}
          tooltip="Page views tracked since the plugin was installed. Unique visitor count requires WP Statistics."
        />

        <SummaryCard
          icon={<UpCircleOutlined />}
          label="Updates"
          value={updates?.total ?? 0}
          sub={
            updates && updates.total > 0 ? (
              <Flex gap={3} wrap="wrap">
                {updates.plugins > 0 && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{updates.plugins} plugins</Tag>}
                {updates.themes > 0 && <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>{updates.themes} themes</Tag>}
                {updates.core > 0 && <Tag color="red" style={{ margin: 0, fontSize: 10 }}>core</Tag>}
              </Flex>
            ) : (
              <Text type="secondary" style={{ fontSize: 11 }}>All up to date ✓</Text>
            )
          }
          color={updates && updates.total > 0 ? token.colorWarning : token.colorSuccess}
          tooltip={updates && updates.total > 0 ? "Updates often fix security issues. Your content won't be affected." : "Everything is up to date"}
          onClick={() => navigate("update-core.php", config.adminUrl)}
        />

        <SummaryCard
          icon={<ThunderboltOutlined />}
          label="Response Time"
          value={isSiteDown ? "Error" : speed?.ms != null ? `${speed.ms} ms` : "—"}
          sub={
            speed?.status && !isSiteDown ? (
              <Text style={{
                fontSize: 11,
                color: speed.status === "good" ? token.colorSuccess : speed.status === "fair" ? token.colorWarning : token.colorError,
              }}>
                {speed.status === "good" ? "Fast load time" : speed.status === "fair" ? "Acceptable" : "Slow — check hosting"}
              </Text>
            ) : isSiteDown ? (
              <Text style={{ fontSize: 11, color: token.colorError }}>Could not connect</Text>
            ) : undefined
          }
          color={isSiteDown ? token.colorError : speed?.status === "good" ? token.colorSuccess : speed?.status === "fair" ? token.colorWarning : token.colorError}
          tooltip="How long your homepage takes to load. Under 600ms is good. Refreshes every 5 minutes."
        />

        <SummaryCard
          icon={<SearchOutlined />}
          label="SEO Health"
          value={seo?.plugin ? `${seo.score}%` : "—"}
          sub={
            seo?.plugin ? (
              seo.issues.length === 0
                ? <Text style={{ fontSize: 11, color: token.colorSuccess }}>No issues found ✓</Text>
                : <Text style={{ fontSize: 11, color: token.colorWarning }}>{seo.issues.length} issue{seo.issues.length > 1 ? "s" : ""} found</Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 11 }}>Install Yoast or RankMath</Text>
            )
          }
          color={!seo?.plugin ? token.colorTextSecondary : seo.score >= 80 ? token.colorSuccess : seo.score >= 50 ? token.colorWarning : token.colorError}
          tooltip={seo?.plugin ? "SEO score based on page titles and meta descriptions" : "Install an SEO plugin like Yoast SEO to track and improve your search engine visibility"}
          onClick={seo?.plugin ? () => navigate("edit.php?post_type=page", config.adminUrl) : undefined}
        />
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isLg ? "2fr 1fr" : "1fr",
        gap: 20,
        marginBottom: 20,
      }}>
        {/* LEFT: Traffic */}
        <Flex vertical gap={16}>
          <Card
            title={<Flex align="center" gap={8}><LineChartOutlined />Page Views — Last 30 Days</Flex>}
            style={{ borderRadius: token.borderRadiusLG, background: token.colorBgContainer }}
            styles={{ body: { padding: "12px 20px 20px" } }}
          >
            {trend.some((d) => d.views > 0) ? (
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={token.colorPrimary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={token.colorPrimary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: token.colorTextSecondary }} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: token.colorTextSecondary }} width={34} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="views" name="Page Views" stroke={token.colorPrimary} fill="url(#viewsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Flex vertical align="center" justify="center" style={{ height: 190 }} gap={10}>
                <LineChartOutlined style={{ fontSize: 36, color: token.colorTextQuaternary }} />
                <Flex vertical align="center" gap={4}>
                  <Text type="secondary" style={{ textAlign: "center", fontSize: 13 }}>No visitor data yet</Text>
                  <Text type="secondary" style={{ textAlign: "center", fontSize: 12 }}>
                    Tracking started automatically. Visit your website to record the first data point.
                  </Text>
                </Flex>
              </Flex>
            )}
          </Card>

          {/* Country chart */}
          <Card
            title={<Flex align="center" gap={8}><GlobalOutlined />Visitors by Country (30 days)</Flex>}
            style={{ borderRadius: token.borderRadiusLG, background: token.colorBgContainer }}
            styles={{ body: { padding: "12px 20px 20px" } }}
          >
            {countries.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart
                  data={countries.slice(0, 7).map((c: CountryStatEntry) => ({
                    ...c, label: `${countryFlag(c.country)} ${countryName(c.country)}`,
                  }))}
                  layout="vertical" margin={{ left: 8, right: 16 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10, fill: token.colorTextSecondary }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: token.colorTextSecondary }} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}`, "Visits"] as [string, string]} />
                  <Bar dataKey="visits" radius={[0, 4, 4, 0]}>
                    {countries.slice(0, 7).map((_, i) => (
                      <Cell key={i} fill={[token.colorPrimary, token.colorInfo, token.colorSuccess, token.colorWarning, "#722ed1", "#eb2f96", "#13c2c2"][i % 7]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Flex vertical align="center" justify="center" style={{ height: 160 }} gap={8}>
                <GlobalOutlined style={{ fontSize: 32, color: token.colorTextQuaternary }} />
                <Text type="secondary" style={{ textAlign: "center", fontSize: 12 }}>
                  Country data requires{" "}
                  <a href="https://wordpress.org/plugins/wp-statistics/" target="_blank" rel="noopener noreferrer">
                    WP Statistics
                  </a>
                </Text>
              </Flex>
            )}
          </Card>
        </Flex>

        {/* RIGHT: Action Center */}
        <Card
          title={
            <Flex align="center" gap={8}>
              What Needs Your Attention
              {criticalActions.length > 0 && (
                <Tag color="error" style={{ margin: 0, fontSize: 11 }}>
                  {criticalActions.length} urgent
                </Tag>
              )}
            </Flex>
          }
          style={{ borderRadius: token.borderRadiusLG, background: token.colorBgContainer, height: "fit-content" }}
          styles={{ body: { padding: "8px 20px 16px" } }}
        >
          {actions.length === 0 ? (
            <Flex vertical align="center" gap={8} style={{ padding: "28px 0" }}>
              <CheckCircleOutlined style={{ fontSize: 36, color: token.colorSuccess }} />
              <Text type="secondary" style={{ textAlign: "center", fontSize: 13 }}>
                Everything looks great!<br />No action required right now.
              </Text>
            </Flex>
          ) : (
            <div>
              {/* 🔴 Critical */}
              {criticalActions.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: token.colorError, letterSpacing: "0.06em", display: "block", marginBottom: 8, marginTop: 8 }}>
                    🔴 Act Now
                  </Text>
                  {criticalActions.map((item, i) => <ActionRow key={i} item={item} adminUrl={config.adminUrl} />)}
                </div>
              )}
              {/* 🟡 Warnings */}
              {warningActions.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: token.colorWarning, letterSpacing: "0.06em", display: "block", marginBottom: 8, marginTop: criticalActions.length > 0 ? 12 : 8 }}>
                    🟡 Review Soon
                  </Text>
                  {warningActions.map((item, i) => <ActionRow key={i} item={item} adminUrl={config.adminUrl} />)}
                </div>
              )}
              {/* 🟢 Info */}
              {infoActions.length > 0 && (
                <Collapse
                  ghost
                  size="small"
                  items={[{
                    key: "info",
                    label: (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        🟢 {infoActions.length} low-priority item{infoActions.length > 1 ? "s" : ""}
                      </Text>
                    ),
                    children: infoActions.map((item, i) => <ActionRow key={i} item={item} adminUrl={config.adminUrl} />),
                  }]}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
          )}

          {/* Quick stats */}
          {stats && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>
                Site Overview
              </Text>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Live Pages", value: pages?.totalPublished ?? stats.pages },
                  { label: "Draft Pages", value: pages?.totalDrafts ?? stats.pagesDraft },
                  { label: "Users", value: stats.users },
                  { label: "WP Version", value: stats.wpVersion },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: token.colorBgLayout, borderRadius: token.borderRadius,
                    padding: "8px 10px",
                  }}>
                    <Text type="secondary" style={{ fontSize: 10, display: "block" }}>{label}</Text>
                    <Text strong style={{ fontSize: 15 }}>{value}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO issues */}
          {seo && seo.issues.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                SEO Issues
              </Text>
              {seo.issues.map((issue, i) => (
                <Flex key={i} align="center" gap={8} style={{ padding: "6px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                  <WarningOutlined style={{ color: token.colorWarning, fontSize: 11 }} />
                  <Text
                    style={{ flex: 1, fontSize: 12, cursor: "pointer", color: token.colorWarning }}
                    onClick={() => navigate(issue.url, config.adminUrl)}
                  >
                    {issue.label}
                  </Text>
                </Flex>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Pages section ────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMd ? "1fr 1fr" : "1fr",
        gap: 16,
        marginBottom: 24,
      }}>
        <Card
          title={
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={8}><ClockCircleOutlined />Recently Updated Pages</Flex>
              <Tag color="default" style={{ margin: 0, fontSize: 11 }}>{pages?.totalPublished ?? 0} live</Tag>
            </Flex>
          }
          style={{ borderRadius: token.borderRadiusLG, background: token.colorBgContainer }}
          styles={{ body: { padding: "4px 20px 16px" } }}
          extra={<Button type="link" size="small" onClick={() => navigate("edit.php?post_type=page", config.adminUrl)}>View all</Button>}
        >
          {pages?.recent && pages.recent.length > 0 ? (
            pages.recent.map((page) => <PageRow key={page.id} page={page} />)
          ) : (
            <Flex align="center" justify="center" style={{ height: 70 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>No published pages yet.</Text>
            </Flex>
          )}
        </Card>

        <Card
          title={
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={8}><EditOutlined />Draft Pages</Flex>
              {(pages?.totalDrafts ?? 0) > 0 && (
                <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                  {pages!.totalDrafts} unpublished
                </Tag>
              )}
            </Flex>
          }
          style={{ borderRadius: token.borderRadiusLG, background: token.colorBgContainer }}
          styles={{ body: { padding: "4px 20px 16px" } }}
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />}
              onClick={() => navigate("post-new.php?post_type=page", config.adminUrl)}>
              New
            </Button>
          }
        >
          {pages?.drafts && pages.drafts.length > 0 ? (
            pages.drafts.map((page) => <PageRow key={page.id} page={page} />)
          ) : (
            <Flex align="center" justify="center" style={{ height: 70 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>No draft pages — you're all caught up! 🎉</Text>
            </Flex>
          )}
        </Card>
      </div>

      {/* Footer */}
      {stats && (
        <Flex gap={16} style={{ paddingBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>WordPress {stats.wpVersion}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>PHP {stats.phpVersion}</Text>
        </Flex>
      )}
    </div>
  );
}

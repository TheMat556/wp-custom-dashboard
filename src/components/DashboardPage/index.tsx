import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
  LinkOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UpCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
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
import { shellPreferencesStore } from "../../store/shellPreferencesStore";
import type { ActionItem, CalendarBooking, CountryStatEntry } from "../../services/dashboardApi";
import { navigate } from "../../utils/wp";

const { Title, Text, Link } = Typography;

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
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

function relativeTime(unixTs: number): string {
  const diffMin = Math.round((Date.now() / 1000 - unixTs) / 60);
  if (diffMin < 2) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} day${diffD > 1 ? "s" : ""} ago`;
}

function formatBookingTime(dtStr: string): string {
  try {
    const dt = new Date(dtStr);
    const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    const timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (today.toDateString() === dt.toDateString()) return `Today, ${timeStr}`;
    if (tomorrow.toDateString() === dt.toDateString()) return `Tomorrow, ${timeStr}`;
    return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + `, ${timeStr}`;
  } catch { return dtStr; }
}

/* ── Section wrapper (same style as Brand Assets) ───────────────────────────── */
function Section({ icon, title, description, children, extra }: {
  icon: React.ReactNode; title: string; description?: string;
  children: React.ReactNode; extra?: React.ReactNode;
}) {
  const { token } = theme.useToken();
  return (
    <section style={{
      borderRadius: token.borderRadiusLG,
      border: `1px solid ${token.colorBorderSecondary}`,
      background: token.colorBgContainer,
      padding: 28,
      boxSizing: "border-box",
    }}>
      <Flex align="center" justify="space-between" gap={12} style={{ marginBottom: 20 }}>
        <Flex align="center" gap={10}>
          <span style={{
            width: 34, height: 34, borderRadius: 10,
            background: `${token.colorPrimary}12`, color: token.colorPrimary,
            fontSize: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>{icon}</span>
          <div style={{ minWidth: 0 }}>
            <Text style={{ fontSize: 15, fontWeight: 600, display: "block" }}>{title}</Text>
            {description && <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>}
          </div>
        </Flex>
        {extra}
      </Flex>
      {children}
    </section>
  );
}

/* ── Summary stat tile ───────────────────────────────────────────────────────── */
function StatTile({ icon, label, value, sub, color, tooltip, onClick }: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
  sub?: React.ReactNode; color: string; tooltip?: string; onClick?: () => void;
}) {
  const { token } = theme.useToken();
  return (
    <div
      onClick={onClick}
      style={{
        background: token.colorBgContainer, borderRadius: token.borderRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderTop: `2px solid ${color}`,
        padding: "12px 14px", cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = token.boxShadow; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <Flex align="flex-start" gap={10}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}15`, color, fontSize: 15,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>{icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Flex align="center" gap={4}>
            <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</Text>
            {tooltip && (
              <Tooltip title={tooltip} overlayStyle={{ maxWidth: 240 }}>
                <QuestionCircleOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} />
              </Tooltip>
            )}
          </Flex>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, color: token.colorText, marginTop: 1 }}>{value}</div>
          {sub && <div style={{ marginTop: 3 }}>{sub}</div>}
        </div>
      </Flex>
    </div>
  );
}

/* ── Action item row ─────────────────────────────────────────────────────────── */
function ActionRow({ item, adminUrl }: { item: ActionItem; adminUrl: string }) {
  const { token } = theme.useToken();
  const [open, setOpen] = useState(item.severity === "error");
  const severityColor = item.severity === "error" ? token.colorError : item.severity === "warning" ? token.colorWarning : token.colorInfo;
  const tagColor = item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "processing";
  const SevIcon = item.severity === "error" ? AlertOutlined : item.severity === "warning" ? WarningOutlined : InfoCircleOutlined;

  return (
    <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 10, marginBottom: 10 }}>
      <Flex align="flex-start" gap={10}>
        <SevIcon style={{ color: severityColor, fontSize: 13, marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" justify="space-between" gap={8} wrap="wrap">
            <Text
              style={{ fontSize: 13, fontWeight: 500, cursor: item.description ? "pointer" : "default", flex: 1 }}
              onClick={() => item.description && setOpen((o) => !o)}
            >
              {item.title}
              {item.description && (
                <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>{open ? "▲" : "▼"}</Text>
              )}
            </Text>
            <Tag color={tagColor} style={{ margin: 0, fontSize: 11, cursor: "pointer", flexShrink: 0 }}
              onClick={() => navigate(item.url, adminUrl)}>
              {item.action}
            </Tag>
          </Flex>
          {open && item.description && (
            <Text type="secondary" style={{
              fontSize: 12, display: "block", marginTop: 6, lineHeight: 1.6,
              background: token.colorBgLayout, borderRadius: token.borderRadius, padding: "6px 10px",
            }}>
              {item.description}
            </Text>
          )}
        </div>
      </Flex>
    </div>
  );
}

const CHECKLIST_CLOSED_KEY = "wp-react-ui-checklist-closed";

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const config      = useShellConfig();
  const { token }   = theme.useToken();
  const screens     = Grid.useBreakpoint();
  const data        = useStore(dashboardStore, (s) => s.data);
  const loading     = useStore(dashboardStore, (s) => s.loading);
  const recentPages = useStore(shellPreferencesStore, (s) => s.recentPages);
  const greeting    = useMemo(() => getGreeting(), []);
  const isMd        = screens.md;
  const isLg        = screens.lg;

  const [checklistClosed, setChecklistClosed] = useState(
    () => localStorage.getItem(CHECKLIST_CLOSED_KEY) === "1"
  );

  useEffect(() => {
    bootstrapDashboardStore(config);
    dashboardStore.getState().load();
  }, [config]);

  const closeChecklist = () => {
    localStorage.setItem(CHECKLIST_CLOSED_KEY, "1");
    setChecklistClosed(true);
  };

  if (loading && !data) {
    return (
      <Flex align="center" justify="center" style={{ height: "100%", background: token.colorBgLayout }}>
        <Spin size="large" />
      </Flex>
    );
  }

  const health    = data?.siteHealth;
  const updates   = data?.pendingUpdates;
  const trend     = data?.visitorTrend ?? [];
  const countries = data?.countryStats ?? [];
  const speed     = data?.siteSpeed;
  const baseActions = data?.actionItems ?? [];
  const seo       = data?.seoOverview;
  const stats     = data?.atAGlance;
  const checklist = data?.onboardingChecklist ?? [];
  const readiness = data?.siteReadinessScore ?? null;
  const calendar  = data?.calendarPreview ?? null;

  // Merge SEO issues into action items (if not already included)
  const seoActionIds = new Set(baseActions.map((a) => a.title));
  const seoActions: ActionItem[] = (seo?.issues ?? [])
    .filter((issue) => !seoActionIds.has(issue.label))
    .map((issue) => ({
      type: "seo" as const,
      title: issue.label,
      url: issue.editUrl ?? issue.url,
      action: "View page",
      severity: "warning" as const,
      description: "This page has an SEO issue that may reduce its visibility in search results.",
    }));
  const actions = [...baseActions, ...seoActions];

  const total30Views    = trend.reduce((s, d) => s + d.views, 0);
  const sparkline       = trend.slice(-7);
  const viewTrend       = (() => {
    const y = trend[trend.length - 2]?.views ?? 0;
    const t = trend[trend.length - 1]?.views ?? 0;
    return y > 0 ? Math.round(((t - y) / y) * 100) : 0;
  })();
  const criticalActions = actions.filter((a) => a.severity === "error");
  const warningActions  = actions.filter((a) => a.severity === "warning");
  const infoActions     = actions.filter((a) => a.severity === "info");
  const hasUpdates      = (updates?.total ?? 0) > 0;
  const isSiteDown      = speed?.status === "error";
  const checklistDone   = checklist.filter((c) => c.done).length;
  const showChecklist   = checklist.length > 0 && checklistDone < checklist.length && !checklistClosed;

  const recentAdminPages = recentPages
    .filter((p) => !p.pageUrl.endsWith("index.php"))
    .slice(0, 6);

  const tooltipStyle = {
    background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius, fontSize: 12, color: token.colorText,
  };
  const chartColors = [token.colorPrimary, token.colorInfo, token.colorSuccess, token.colorWarning, "#722ed1", "#eb2f96", "#13c2c2"];

  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden", background: token.colorBgLayout, pointerEvents: "auto" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: isMd ? 40 : 20, boxSizing: "border-box" }}>

        {/* ── Welcome hero with sidebar-style gradient ─────────────────────── */}
        <div style={{
          borderRadius: token.borderRadiusLG,
          border: "1px solid var(--wp-react-ui-shell-border-strong)",
          background: "linear-gradient(135deg, var(--wp-react-ui-shell-accent-soft) 0%, transparent 100%)",
          padding: isMd ? "22px 28px" : "16px 18px",
          marginBottom: 16,
          boxSizing: "border-box",
        }}>
          <Flex justify="space-between" align="center" wrap gap={14}>
            <Flex vertical gap={4} style={{ minWidth: 0 }}>
              <Flex align="center" gap={10} wrap>
                <Title level={3} style={{ margin: 0, fontSize: isMd ? 22 : 18 }}>
                  {greeting}, {config.user.name}!
                </Title>
                {readiness !== null && (
                  <Tooltip title={`${readiness}% of setup checklist complete`}>
                    <Tag
                      color={readiness >= 100 ? "success" : readiness >= 60 ? "warning" : "error"}
                      style={{ borderRadius: 999, cursor: "default" }}
                    >
                      {readiness}% ready
                    </Tag>
                  </Tooltip>
                )}
              </Flex>
              {total30Views > 0 ? (
                <Flex align="center" gap={8} style={{ marginTop: 2 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {total30Views.toLocaleString()} page views in the last 30 days
                  </Text>
                  {viewTrend !== 0 && (
                    <Tag color={viewTrend > 0 ? "success" : "error"} style={{ margin: 0, fontSize: 11, borderRadius: 999 }}>
                      {viewTrend > 0 ? "↑" : "↓"} {Math.abs(viewTrend)}%
                    </Tag>
                  )}
                </Flex>
              ) : (
                <Text type="secondary" style={{ fontSize: 13, marginTop: 2 }}>
                  Visitor tracking is active — data will appear as people visit your site.
                </Text>
              )}
              {stats && (
                <Flex gap={12} style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>WordPress {stats.wpVersion}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>PHP {stats.phpVersion}</Text>
                </Flex>
              )}
            </Flex>
            <Flex align="center" gap={8} wrap>
              {isMd && sparkline.some((d) => d.views > 0) && (
                <Tooltip title="Page views — last 7 days">
                  <div style={{ width: 90, height: 34 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkline}>
                        <Line type="monotone" dataKey="views" stroke={token.colorPrimary} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Tooltip>
              )}
              <Button icon={<LinkOutlined />}
                onClick={() => window.open(config.adminUrl.replace(/wp-admin\/?$/, ""), "_blank", "noopener,noreferrer")}>
                View Site
              </Button>
              <Button icon={<PlusOutlined />}
                onClick={() => navigate("post-new.php?post_type=page", config.adminUrl)}>
                New Page
              </Button>
              <Button type="primary" icon={<PlusOutlined />}
                onClick={() => navigate("post-new.php", config.adminUrl)}>
                New Post
              </Button>
            </Flex>
          </Flex>
        </div>

        {/* ── Offline alert ───────────────────────────────────────────────── */}
        {isSiteDown && (
          <Alert
            type="error" showIcon icon={<ExclamationCircleOutlined />}
            message={<strong>Your website is not reachable right now</strong>}
            description={
              <div>
                <p style={{ margin: "4px 0 8px" }}>
                  {speed?.reason ?? "We could not connect to your homepage."}{" "}
                  Your visitors may see an error page.
                </p>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <strong>What to do:</strong> Contact your hosting provider and tell them your website is not loading.
                  Common causes: server is down, domain expired, or a recent plugin change broke something.
                </Text>
              </div>
            }
            style={{ marginBottom: 16, borderRadius: token.borderRadiusLG }}
            action={
              <Button danger size="small" onClick={() => navigate("site-health.php", config.adminUrl)}>
                Site Health
              </Button>
            }
          />
        )}

        {/* ── Summary tiles ─────────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isLg ? "repeat(5, 1fr)" : isMd ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
          gap: 10, marginBottom: 20,
        }}>
          <StatTile
            icon={isSiteDown ? <ExclamationCircleOutlined /> : health?.status === "good" ? <CheckCircleOutlined /> : <WarningOutlined />}
            label="Website"
            value={isSiteDown ? "Offline" : health?.status === "good" ? "Online" : "Check"}
            sub={
              health && health.score > 0 && !isSiteDown
                ? <Progress percent={health.score} size="small" showInfo={false}
                    strokeColor={health.status === "good" ? token.colorSuccess : health.status === "critical" ? token.colorError : token.colorWarning}
                    style={{ margin: 0 }} />
                : <Text style={{ fontSize: 11, color: isSiteDown ? token.colorError : token.colorTextTertiary }}>
                    {isSiteDown ? "Not reachable" : "Click for details"}
                  </Text>
            }
            color={isSiteDown ? token.colorError : health?.status === "good" ? token.colorSuccess : health?.status === "critical" ? token.colorError : token.colorWarning}
            tooltip={isSiteDown ? (speed?.reason ?? "Site unreachable") : health?.status !== "good" ? "WordPress found configuration issues" : "Site is running and reachable"}
            onClick={() => navigate("site-health.php", config.adminUrl)}
          />
          <StatTile
            icon={<LineChartOutlined />}
            label="Visitors 30d"
            value={total30Views > 0 ? total30Views.toLocaleString() : "—"}
            sub={
              total30Views > 0
                ? viewTrend !== 0
                  ? <Text style={{ fontSize: 11, color: viewTrend > 0 ? token.colorSuccess : token.colorError }}>{viewTrend > 0 ? "↑" : "↓"} {Math.abs(viewTrend)}% vs yesterday</Text>
                  : <Text type="secondary" style={{ fontSize: 11 }}>Stable traffic</Text>
                : <Text type="secondary" style={{ fontSize: 11 }}>Tracking active</Text>
            }
            color={token.colorPrimary}
            tooltip="Page views tracked automatically. Install WP Statistics (free) for country-level data."
          />
          <StatTile
            icon={<UpCircleOutlined />}
            label="Updates"
            value={updates?.total ?? 0}
            sub={
              hasUpdates
                ? <Flex gap={3} wrap="wrap">
                    {(updates?.plugins ?? 0) > 0 && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{updates!.plugins} plugins</Tag>}
                    {(updates?.themes ?? 0) > 0 && <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>{updates!.themes} themes</Tag>}
                    {(updates?.core ?? 0) > 0 && <Tag color="red" style={{ margin: 0, fontSize: 10 }}>core</Tag>}
                  </Flex>
                : updates?.lastChecked
                  ? <Text type="secondary" style={{ fontSize: 11 }}>Checked {relativeTime(updates.lastChecked)}</Text>
                  : <Text type="secondary" style={{ fontSize: 11 }}>All up to date</Text>
            }
            color={hasUpdates ? token.colorWarning : token.colorSuccess}
            tooltip={hasUpdates ? "Updates fix security issues. Make a backup first, then update." : "Everything is up to date"}
            onClick={() => navigate("update-core.php", config.adminUrl)}
          />
          <StatTile
            icon={<ThunderboltOutlined />}
            label="Speed"
            value={isSiteDown ? "Error" : speed?.ms != null ? `${speed.ms} ms` : "—"}
            sub={
              !isSiteDown && speed?.status
                ? <Text style={{ fontSize: 11, color: speed.status === "good" ? token.colorSuccess : speed.status === "fair" ? token.colorWarning : token.colorError }}>
                    {speed.status === "good" ? "Fast" : speed.status === "fair" ? "Acceptable" : "Slow"}
                  </Text>
                : <Text style={{ fontSize: 11, color: token.colorError }}>Unreachable</Text>
            }
            color={isSiteDown ? token.colorError : speed?.status === "good" ? token.colorSuccess : speed?.status === "fair" ? token.colorWarning : token.colorError}
            tooltip="Homepage load time. Under 600 ms is good. Refreshes every 5 minutes."
          />
          <StatTile
            icon={<SearchOutlined />}
            label="SEO"
            value={seo?.plugin ? `${seo.score}%` : "—"}
            sub={
              seo?.plugin
                ? seo.issues.length === 0
                  ? <Text style={{ fontSize: 11, color: token.colorSuccess }}>No issues</Text>
                  : <Text style={{ fontSize: 11, color: token.colorWarning }}>{seo.issues.length} issue{seo.issues.length > 1 ? "s" : ""}</Text>
                : <Text type="secondary" style={{ fontSize: 11 }}>No plugin</Text>
            }
            color={!seo?.plugin ? token.colorTextSecondary : seo.score >= 80 ? token.colorSuccess : seo.score >= 50 ? token.colorWarning : token.colorError}
            tooltip={seo?.plugin ? "Based on page titles and meta descriptions" : "Install Yoast SEO (free) to track your search visibility"}
            onClick={seo?.plugin ? () => navigate("edit.php?post_type=page", config.adminUrl) : undefined}
          />
        </div>

        {/* ── First Steps ───────────────────────────────────────────────────── */}
        {showChecklist && (
          <Section
            icon={<RocketOutlined />}
            title={`First Steps — ${checklistDone} of ${checklist.length} done`}
            description="Complete these steps to get your site fully ready. Each one takes just a few minutes."
            extra={
              <Flex align="center" gap={12}>
                <Progress
                  type="circle"
                  percent={Math.round((checklistDone / checklist.length) * 100)}
                  size={40}
                  strokeColor={token.colorPrimary}
                />
                <Tooltip title="Dismiss checklist">
                  <Button type="text" icon={<CloseOutlined />} size="small"
                    onClick={closeChecklist} style={{ color: token.colorTextTertiary }} />
                </Tooltip>
              </Flex>
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: isMd ? "1fr 1fr" : "1fr", gap: 8 }}>
              {checklist.map((item) => (
                <Flex key={item.key} align="center" gap={10}
                  style={{
                    padding: "10px 14px", borderRadius: token.borderRadius,
                    background: item.done ? `${token.colorSuccess}08` : token.colorBgLayout,
                    border: `1px solid ${item.done ? token.colorSuccess + "30" : token.colorBorderSecondary}`,
                    cursor: item.done ? "default" : "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onClick={item.done ? undefined : () => navigate(item.url, config.adminUrl)}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    background: item.done ? token.colorSuccess : "transparent",
                    border: `2px solid ${item.done ? token.colorSuccess : token.colorBorderSecondary}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {item.done && <CheckOutlined style={{ fontSize: 10, color: "#fff" }} />}
                  </div>
                  <Text style={{
                    flex: 1, fontSize: 13,
                    color: item.done ? token.colorTextTertiary : token.colorText,
                    textDecoration: item.done ? "line-through" : undefined,
                  }}>
                    {item.label}
                  </Text>
                  {!item.done && (
                    <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>Open →</Text>
                  )}
                </Flex>
              ))}
            </div>
          </Section>
        )}
        {showChecklist && <div style={{ height: 20 }} />}

        {/* ── Charts ────────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: isMd ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 16 }}>
          <Section icon={<LineChartOutlined />} title="Page Views" description="Last 30 days">
            {trend.some((d) => d.views > 0) ? (
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={token.colorPrimary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={token.colorPrimary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: token.colorTextSecondary }} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: token.colorTextSecondary }} width={30} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="views" name="Views" stroke={token.colorPrimary} fill="url(#viewsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Flex vertical align="center" justify="center" style={{ height: 170 }} gap={10}>
                <LineChartOutlined style={{ fontSize: 32, color: token.colorTextQuaternary }} />
                <Text type="secondary" style={{ textAlign: "center", fontSize: 12, maxWidth: 240 }}>
                  No data yet. Tracking is active — views appear as people visit your site.
                </Text>
              </Flex>
            )}
          </Section>

          <Section icon={<GlobalOutlined />} title="Visitors by Country" description="Last 30 days">
            {countries.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart
                  data={countries.slice(0, 7).map((c: CountryStatEntry) => ({
                    ...c, label: `${countryFlag(c.country)} ${countryName(c.country)}`,
                  }))}
                  layout="vertical" margin={{ left: 8, right: 12 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10, fill: token.colorTextSecondary }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={116} tick={{ fontSize: 11, fill: token.colorTextSecondary }} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}`, "Visits"] as [string, string]} />
                  <Bar dataKey="visits" radius={[0, 4, 4, 0]}>
                    {countries.slice(0, 7).map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Flex vertical align="center" justify="center" style={{ height: 170 }} gap={10}>
                <GlobalOutlined style={{ fontSize: 32, color: token.colorTextQuaternary }} />
                <Text type="secondary" style={{ textAlign: "center", fontSize: 12 }}>
                  Install{" "}
                  <Link href="https://wordpress.org/plugins/wp-statistics/" target="_blank" rel="noopener noreferrer">
                    WP Statistics
                  </Link>{" "}
                  (free) to track visitor countries.
                </Text>
              </Flex>
            )}
          </Section>
        </div>

        {/* ── Action Center + Right sidebar ─────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: isLg ? "1fr 320px" : "1fr", gap: 16, marginBottom: 16 }}>

          {/* Action Center */}
          <Section
            icon={<AlertOutlined />}
            title="What Needs Your Attention"
            description={actions.length === 0 ? "All clear" : `${criticalActions.length} urgent, ${warningActions.length} to review`}
            extra={criticalActions.length > 0 ? <Tag color="error" style={{ margin: 0 }}>{criticalActions.length} urgent</Tag> : undefined}
          >
            {actions.length === 0 ? (
              <Flex vertical align="center" gap={8} style={{ padding: "20px 0" }}>
                <CheckCircleOutlined style={{ fontSize: 32, color: token.colorSuccess }} />
                <Text type="secondary" style={{ fontSize: 13 }}>Everything looks great! No action required.</Text>
              </Flex>
            ) : (
              <>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 14 }}>
                  {criticalActions.length > 0
                    ? "Start with the red items first — everything else can wait."
                    : "A few things to review. Start with the orange items."}
                </Text>
                {hasUpdates && (
                  <Alert
                    type="info" showIcon
                    message={<Text style={{ fontSize: 12 }}>Make a backup before applying updates — most hosts offer this in one click.</Text>}
                    style={{ marginBottom: 14, borderRadius: token.borderRadius }}
                  />
                )}
                {criticalActions.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                      <AlertOutlined style={{ color: token.colorError, fontSize: 11 }} />
                      <Text style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: token.colorError, letterSpacing: "0.07em" }}>
                        Act Now
                      </Text>
                    </Flex>
                    {criticalActions.map((item, i) => <ActionRow key={i} item={item} adminUrl={config.adminUrl} />)}
                  </div>
                )}
                {warningActions.length > 0 && (
                  <div style={{ marginTop: criticalActions.length ? 12 : 0 }}>
                    <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                      <WarningOutlined style={{ color: token.colorWarning, fontSize: 11 }} />
                      <Text style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: token.colorWarning, letterSpacing: "0.07em" }}>
                        Review Soon
                      </Text>
                    </Flex>
                    {warningActions.map((item, i) => <ActionRow key={i} item={item} adminUrl={config.adminUrl} />)}
                  </div>
                )}
                {infoActions.length > 0 && (
                  <Collapse ghost size="small"
                    items={[{
                      key: "info",
                      label: (
                        <Flex align="center" gap={6}>
                          <InfoCircleOutlined style={{ color: token.colorInfo, fontSize: 11 }} />
                          <Text type="secondary" style={{ fontSize: 11 }}>{infoActions.length} low-priority item{infoActions.length > 1 ? "s" : ""}</Text>
                        </Flex>
                      ),
                      children: infoActions.map((item, i) => <ActionRow key={i} item={item} adminUrl={config.adminUrl} />),
                    }]}
                    style={{ marginTop: 8 }}
                  />
                )}
              </>
            )}
          </Section>

          {/* Right column */}
          <Flex vertical gap={16}>

            {/* Calendar */}
            {calendar?.available && (
              <Section
                icon={<CalendarOutlined />}
                title="Upcoming Bookings"
                description="Next 7 days"
                extra={
                  <Flex align="center" gap={8}>
                    {calendar.totalToday > 0 && <Badge count={calendar.totalToday} color={token.colorPrimary} />}
                    <Button type="link" size="small" style={{ padding: 0 }}
                      onClick={() => navigate("admin.php?page=h-bricks-elements", config.adminUrl)}>
                      View all
                    </Button>
                  </Flex>
                }
              >
                {calendar.upcoming.length === 0 ? (
                  <Flex align="center" justify="center" style={{ height: 60 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>No bookings in the next 7 days</Text>
                  </Flex>
                ) : (
                  calendar.upcoming.map((booking: CalendarBooking) => (
                    <Flex key={booking.id} align="center" gap={10}
                      style={{ padding: "8px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: booking.isToday ? token.colorPrimary : token.colorTextQuaternary,
                      }} />
                      <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {booking.customerName || "—"}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {formatBookingTime(booking.startDate)}
                        </Text>
                      </Flex>
                      {booking.isToday && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Today</Tag>}
                    </Flex>
                  ))
                )}
              </Section>
            )}

            {/* Recent pages */}
            {recentAdminPages.length > 0 && (
              <Section icon={<HistoryOutlined />} title="Recently Visited" description="Your navigation history">
                {recentAdminPages.map((page, i) => (
                  <Flex key={i} align="center" gap={8}
                    style={{
                      padding: "8px 0",
                      borderBottom: i < recentAdminPages.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(page.pageUrl, config.adminUrl)}
                  >
                    <ClockCircleOutlined style={{ color: token.colorTextTertiary, fontSize: 11, flexShrink: 0 }} />
                    <Text style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: token.colorPrimary }}
                      title={page.title}>
                      {page.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                      {relativeTime(Math.round(page.visitedAt / 1000))}
                    </Text>
                  </Flex>
                ))}
              </Section>
            )}

          </Flex>
        </div>
      </div>
    </div>
  );
}

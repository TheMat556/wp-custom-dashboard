import {
  AlertOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined as _ClockCircleOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  FileProtectOutlined,
  GlobalOutlined,
  HistoryOutlined as _HistoryOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
  LinkOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UpCircleOutlined,
  WarningOutlined,
  WifiOutlined as _WifiOutlined,
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
import { bootstrapDashboardStore, dashboardStore } from "../../store/dashboardStore";
import type { ActionItem, BusinessFunctions, CalendarBooking, CountryStatEntry, LegalCompliance, SeoBasics, WeekDay } from "../../services/dashboardApi";
import { navigate } from "../../utils/wp";
import { createT, localeToIntl, localCountryName } from "../../utils/i18n";

const { Title, Text } = Typography;

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

function relativeTime(unixTs: number, intlLocale: string): string {
  const diffMs = Date.now() - unixTs * 1000;
  const diffMin = Math.round(diffMs / 60000);
  try {
    const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });
    if (diffMin < 2) return rtf.format(0, "minute");
    if (diffMin < 60) return rtf.format(-diffMin, "minute");
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return rtf.format(-diffH, "hour");
    const diffD = Math.round(diffH / 24);
    return rtf.format(-diffD, "day");
  } catch {
    if (diffMin < 2) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.round(diffH / 24)}d ago`;
  }
}

function formatBookingTime(dtStr: string, intlLocale: string, t: (k: string) => string): string {
  try {
    const dt = new Date(dtStr);
    const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    const timeStr = dt.toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" });
    if (today.toDateString() === dt.toDateString()) return `${t("Today")}, ${timeStr}`;
    if (tomorrow.toDateString() === dt.toDateString()) return `${t("Tomorrow")}, ${timeStr}`;
    return dt.toLocaleDateString(intlLocale, { weekday: "short", month: "short", day: "numeric" }) + `, ${timeStr}`;
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
              style={{ fontSize: 13, fontWeight: 500, cursor: (item.impact || item.description) ? "pointer" : "default", flex: 1 }}
              onClick={() => (item.impact || item.description) && setOpen((o) => !o)}
            >
              {item.title}
              {(item.impact || item.description) && (
                <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>{open ? "▲" : "▼"}</Text>
              )}
            </Text>
            <Tag color={tagColor} style={{ margin: 0, fontSize: 11, cursor: "pointer", flexShrink: 0 }}
              onClick={() => navigate(item.url, adminUrl)}>
              {item.action}
            </Tag>
          </Flex>
          {open && (item.impact || item.description) && (
            <div style={{
              marginTop: 6, background: token.colorBgLayout, borderRadius: token.borderRadius,
              padding: "8px 12px", borderLeft: `3px solid ${severityColor}`,
            }}>
              {item.impact && (
                <Text style={{ fontSize: 12, display: "block", marginBottom: item.description ? 6 : 0, fontWeight: 500, color: severityColor }}>
                  Impact: {item.impact}
                </Text>
              )}
              {item.description && (
                <Text type="secondary" style={{ fontSize: 12, display: "block", lineHeight: 1.6 }}>
                  {item.description}
                </Text>
              )}
            </div>
          )}
        </div>
      </Flex>
    </div>
  );
}

const CHECKLIST_CLOSED_KEY = "wp-react-ui-checklist-closed";

/* ── Week calendar grid ──────────────────────────────────────────────────────── */
function WeekCalendar({ weekDays, intlLocale }: {
  weekDays: WeekDay[];
  intlLocale: string;
}) {
  const { token } = theme.useToken();
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${weekDays.length}, 1fr)`, gap: 6, overflowX: "auto", minWidth: 0 }}>
      {weekDays.map((day) => {
        const localLabel = new Date(day.date + "T12:00:00")
          .toLocaleDateString(intlLocale, { weekday: "short" });
        return (
          <div key={day.date} style={{
            borderRadius: token.borderRadius,
            border: `1px solid ${day.isToday ? token.colorPrimary + "60" : token.colorBorderSecondary}`,
            background: day.isToday ? `${token.colorPrimary}08` : token.colorBgLayout,
            padding: "8px 4px",
            minWidth: 0,
          }}>
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: day.isToday ? token.colorPrimary : token.colorTextSecondary, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>
                {localLabel}
              </div>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: day.isToday ? token.colorPrimary : "transparent",
                color: day.isToday ? "#fff" : token.colorText,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "2px auto 0",
                fontSize: 13, fontWeight: day.isToday ? 700 : 400,
              }}>
                {day.dayNum}
              </div>
            </div>
            {day.bookings.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 10 }}>—</Text>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {day.bookings.map((b: CalendarBooking) => {
                  const timeStr = new Date(b.startDate).toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" });
                  return (
                    <Tooltip key={b.id} title={`${b.customerName || "—"} · ${timeStr}`}>
                      <div style={{
                        padding: "2px 4px", borderRadius: 4,
                        background: `${token.colorPrimary}18`,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          fontSize: 10, color: token.colorPrimary,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {timeStr}
                        </div>
                        <div style={{
                          fontSize: 10, color: token.colorText,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontWeight: 500,
                        }}>
                          {b.customerName || "—"}
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Legal compliance section ────────────────────────────────────────────────── */
function LegalSection({ legal, adminUrl }: { legal: LegalCompliance; adminUrl: string }) {
  const { token } = theme.useToken();
  const rows = [
    {
      key: "privacy",
      label: legal.privacyPolicy.title ?? "Privacy Policy",
      item: legal.privacyPolicy,
      url: legal.privacyPolicy.editUrl ?? "options-privacy.php",
    },
    {
      key: "impressum",
      label: legal.impressum.title ?? "Imprint / Impressum",
      item: legal.impressum,
      url: legal.impressum.editUrl ?? "post-new.php?post_type=page",
    },
  ];
  const allOk = rows.every((r) => r.item.exists && r.item.published) && !legal.trackingWithoutConsent;

  return (
    <Section
      icon={<FileProtectOutlined />}
      title="Legal & Compliance"
      description="Required pages and data protection status"
      extra={allOk ? <Tag color="success" style={{ margin: 0 }}>All good</Tag> : <Tag color="error" style={{ margin: 0 }}>Action needed</Tag>}
    >
      {rows.map((row) => {
        const ok = row.item.exists && row.item.published;
        const warn = row.item.exists && !row.item.published;
        const color = ok ? token.colorSuccess : warn ? token.colorError : token.colorWarning;
        const statusLabel = ok ? "Published" : warn ? `Draft${row.item.daysOld ? ` (${row.item.daysOld}d old)` : ""}` : "Missing";
        return (
          <Flex key={row.key} align="center" justify="space-between" gap={8}
            style={{ padding: "10px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Flex align="center" gap={8}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <div>
                <Text style={{ fontSize: 13 }}>{row.label}</Text>
                {!ok && (
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {warn ? "This legal page exists but is not published — visitors cannot access it." : "This required page is missing."}
                  </Text>
                )}
              </div>
            </Flex>
            <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
              <Tag color={ok ? "success" : warn ? "error" : "warning"} style={{ margin: 0, fontSize: 11 }}>{statusLabel}</Tag>
              {!ok && (
                <Button size="small" onClick={() => navigate(row.url, adminUrl)}>
                  {warn ? "Publish now" : "Create"}
                </Button>
              )}
            </Flex>
          </Flex>
        );
      })}
      <Flex align="center" justify="space-between" gap={8}
        style={{ padding: "10px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex align="center" gap={8}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: legal.cookiePlugin ? token.colorSuccess : token.colorWarning, flexShrink: 0 }} />
          <div>
            <Text style={{ fontSize: 13 }}>Cookie Consent</Text>
            {!legal.cookiePlugin && (
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>No cookie notice plugin detected.</Text>
            )}
          </div>
        </Flex>
        <Tag color={legal.cookiePlugin ? "success" : "warning"} style={{ margin: 0, fontSize: 11 }}>
          {legal.cookiePlugin ?? "Not configured"}
        </Tag>
      </Flex>
      {legal.trackingWithoutConsent && (
        <Alert
          type="warning" showIcon
          message={<Text style={{ fontSize: 12 }}>Tracking plugin active without cookie consent banner — this may violate GDPR.</Text>}
          style={{ marginTop: 12, borderRadius: token.borderRadius }}
          action={
            <Button size="small" onClick={() => navigate("plugins.php", adminUrl)}>
              Review plugins
            </Button>
          }
        />
      )}
    </Section>
  );
}

/* ── Business functions section ──────────────────────────────────────────────── */
function BusinessSection({ biz, adminUrl }: { biz: BusinessFunctions; adminUrl: string }) {
  const { token } = theme.useToken();
  return (
    <Section
      icon={<BankOutlined />}
      title="Business & Contact Functions"
      description="Key tools your customers use to reach you"
    >
      {/* Bookings */}
      <Flex align="center" justify="space-between" gap={8}
        style={{ padding: "10px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex align="center" gap={8}>
          <CalendarOutlined style={{ color: biz.bookings.available ? token.colorSuccess : token.colorTextTertiary, fontSize: 14, flexShrink: 0 }} />
          <div>
            <Text style={{ fontSize: 13 }}>Booking System</Text>
            {biz.bookings.note && <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{biz.bookings.note}</Text>}
          </div>
        </Flex>
        <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
          {biz.bookings.available && biz.bookings.totalUpcoming != null && (
            <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{biz.bookings.totalUpcoming} upcoming</Tag>
          )}
          <Tag color={biz.bookings.available ? "success" : "default"} style={{ margin: 0, fontSize: 11 }}>
            {biz.bookings.available ? "Active" : "Not installed"}
          </Tag>
        </Flex>
      </Flex>

      {/* Contact Forms */}
      <Flex align="center" justify="space-between" gap={8}
        style={{ padding: "10px 0", borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex align="center" gap={8}>
          <PhoneOutlined style={{ color: biz.contactForms.available ? token.colorSuccess : token.colorWarning, fontSize: 14, flexShrink: 0 }} />
          <div>
            <Text style={{ fontSize: 13 }}>Contact Forms</Text>
            {biz.contactForms.note && <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{biz.contactForms.note}</Text>}
          </div>
        </Flex>
        <Tag color={biz.contactForms.available ? "success" : "warning"} style={{ margin: 0, fontSize: 11 }}>
          {biz.contactForms.available ? biz.contactForms.plugin ?? "Active" : "Not installed"}
        </Tag>
      </Flex>

      {/* Email Delivery */}
      <Flex align="center" justify="space-between" gap={8} style={{ paddingTop: 10 }}>
        <Flex align="center" gap={8}>
          <MailOutlined style={{ color: biz.emailDelivery.smtpPlugin ? token.colorSuccess : token.colorWarning, fontSize: 14, flexShrink: 0 }} />
          <div>
            <Text style={{ fontSize: 13 }}>Email Delivery</Text>
            {biz.emailDelivery.note && <Text type="secondary" style={{ fontSize: 11, display: "block", maxWidth: 280 }}>{biz.emailDelivery.note}</Text>}
          </div>
        </Flex>
        <Tag color={biz.emailDelivery.smtpPlugin ? "success" : "warning"} style={{ margin: 0, fontSize: 11, flexShrink: 0 }}>
          {biz.emailDelivery.smtpPlugin ? "Configured" : "Default (unreliable)"}
        </Tag>
      </Flex>
      {!biz.emailDelivery.smtpPlugin && (
        <Alert
          type="warning" showIcon
          message={<Text style={{ fontSize: 12 }}>Without an SMTP plugin, contact form emails may end up in spam. Install WP Mail SMTP (free) to fix this.</Text>}
          style={{ marginTop: 12, borderRadius: token.borderRadius }}
          action={<Button size="small" onClick={() => navigate("plugin-install.php?s=wp+mail+smtp&tab=search&type=term", adminUrl)}>Install free</Button>}
        />
      )}
    </Section>
  );
}

/* ── SEO basics section ──────────────────────────────────────────────────────── */
function SeoBasicsSection({ seoBasics, adminUrl }: { seoBasics: SeoBasics; adminUrl: string }) {
  const { token } = theme.useToken();
  const checks = Object.values(seoBasics.checks);
  return (
    <Section
      icon={<SearchOutlined />}
      title="SEO Basics"
      description={seoBasics.plugin ? `Powered by ${seoBasics.plugin}` : "Basic checks — no SEO plugin required"}
      extra={
        <Flex align="center" gap={8}>
          <Progress type="circle" percent={seoBasics.score} size={36}
            strokeColor={seoBasics.score >= 75 ? token.colorSuccess : token.colorWarning} />
        </Flex>
      }
    >
      {checks.map((check, i) => (
        <Flex key={i} align="center" justify="space-between" gap={8}
          style={{ padding: "9px 0", borderBottom: i < checks.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
          <Flex align="center" gap={8}>
            {check.ok
              ? <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 13 }} />
              : <ExclamationCircleOutlined style={{ color: check.critical ? token.colorError : token.colorWarning, fontSize: 13 }} />
            }
            <Text style={{ fontSize: 13 }}>{check.label}</Text>
          </Flex>
          {!check.ok && check.url && (
            <Button size="small" type="link" style={{ padding: 0, fontSize: 12, flexShrink: 0 }}
              onClick={() => navigate(check.url!, adminUrl)}>
              Fix →
            </Button>
          )}
        </Flex>
      ))}
      {!seoBasics.plugin && (
        <Alert
          type="info" showIcon icon={<InfoCircleOutlined />}
          message={<Text style={{ fontSize: 12 }}>Install Yoast SEO (free) for full SEO tracking, meta descriptions, and XML sitemaps.</Text>}
          style={{ marginTop: 12, borderRadius: token.borderRadius }}
          action={<Button size="small" onClick={() => navigate("plugin-install.php?s=yoast+seo&tab=search&type=term", adminUrl)}>Install free</Button>}
        />
      )}
    </Section>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const config      = useShellConfig();
  const { token }   = theme.useToken();
  const screens     = Grid.useBreakpoint();
  const data        = useStore(dashboardStore, (s) => s.data);
  const loading     = useStore(dashboardStore, (s) => s.loading);
  const greetingKey = useMemo(() => getGreeting(), []);
  const intlLocale  = useMemo(() => localeToIntl(config.locale ?? "en_US"), [config.locale]);
  const t           = useMemo(() => createT(config.locale ?? "en_US"), [config.locale]);
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
  const trendData = data?.visitorTrend;
  const trend     = trendData?.days ?? [];
  const countries = data?.countryStats ?? [];
  const speed     = data?.siteSpeed;
  const baseActions = data?.actionItems ?? [];
  const seo       = data?.seoOverview;
  const seoBasics = data?.seoBasics;
  const legalData = data?.legalCompliance;
  const bizData   = data?.businessFunctions;
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

  const total30Views    = trendData?.total ?? trend.reduce((s, d) => s + d.views, 0);
  const sparkline       = trend.slice(-7);
  const viewTrend       = trendData?.trendPct ?? (() => {
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
                  {t(greetingKey)}, {config.user.name}!
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
                    {t("{n} page views in the last 30 days", { n: total30Views.toLocaleString(intlLocale) })}
                  </Text>
                  {viewTrend !== 0 && (
                    <Tag color={viewTrend > 0 ? "success" : "error"} style={{ margin: 0, fontSize: 11, borderRadius: 999 }}>
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
                {t("View Site")}
              </Button>
              <Button icon={<PlusOutlined />}
                onClick={() => navigate("post-new.php?post_type=page", config.adminUrl)}>
                {t("New Page")}
              </Button>
              <Button type="primary" icon={<PlusOutlined />}
                onClick={() => navigate("post-new.php", config.adminUrl)}>
                {t("New Post")}
              </Button>
            </Flex>
          </Flex>
        </div>

        {/* ── Offline alert ───────────────────────────────────────────────── */}
        {isSiteDown && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              type="error" showIcon icon={<ExclamationCircleOutlined />}
              message={<strong>{t("Your website is not reachable right now")}</strong>}
              description={
                <div>
                  <p style={{ margin: "4px 0 8px" }}>
                    {speed?.reason ?? t("We could not connect to your homepage.")}{" "}
                    {t("Your visitors may see an error page.")}
                  </p>
                  {speed?.firstFailAt && (
                    <p style={{ margin: "0 0 8px", fontSize: 12 }}>
                      <strong>{t("Problem started:")}</strong>{" "}
                      {new Date(speed.firstFailAt * 1000).toLocaleString(intlLocale, { dateStyle: "medium", timeStyle: "short" })}
                      {" "}({relativeTime(speed.firstFailAt, intlLocale)})
                    </p>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>{t("Recommended next step:")}</strong>{" "}
                    {speed?.errorClass === "ssl"
                      ? t("Contact your hosting provider about your SSL certificate — it may be expired.")
                      : speed?.errorClass === "dns"
                        ? t("Check if your domain registration is still active and DNS settings are correct.")
                        : speed?.errorClass === "timeout"
                          ? t("Contact your hosting provider — the server may be overloaded or a plugin may have caused a PHP error.")
                          : t("Contact your hosting provider. Tell them your website is not loading and ask them to check the server.")}
                  </Text>
                  {speed?.errorDetail && (
                    <Collapse ghost size="small" style={{ marginTop: 8 }}
                      items={[{
                        key: "tech",
                        label: <Text type="secondary" style={{ fontSize: 11 }}>{t("Technical details (for developers)")}</Text>,
                        children: (
                          <div style={{
                            fontFamily: "monospace", fontSize: 11,
                            background: token.colorBgLayout, borderRadius: token.borderRadius,
                            padding: "8px 12px", color: token.colorTextSecondary,
                          }}>
                            <div><strong>{t("Error class:")}</strong> {speed.errorClass ?? "connection"}</div>
                            <div><strong>{t("Detail:")}</strong> {speed.errorDetail}</div>
                            {speed.checkedAt && <div><strong>{t("Last checked:")}</strong> {new Date(speed.checkedAt * 1000).toLocaleString(intlLocale)}</div>}
                          </div>
                        ),
                      }]}
                    />
                  )}
                </div>
              }
              style={{ borderRadius: token.borderRadiusLG }}
              action={
                <Button danger size="small" onClick={() => navigate("site-health.php", config.adminUrl)}>
                  {t("Site Health")}
                </Button>
              }
            />
          </div>
        )}

        {/* ── Summary tiles ─────────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isLg ? "repeat(5, 1fr)" : isMd ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
          gap: 10, marginBottom: 20,
        }}>
          <StatTile
            icon={isSiteDown ? <ExclamationCircleOutlined /> : health?.status === "good" ? <CheckCircleOutlined /> : <WarningOutlined />}
            label={t("Website")}
            value={isSiteDown ? t("Offline") : health?.status === "good" ? t("Online") : t("Check")}
            sub={
              health && health.score > 0 && !isSiteDown
                ? <Progress percent={health.score} size="small" showInfo={false}
                    strokeColor={health.status === "good" ? token.colorSuccess : health.status === "critical" ? token.colorError : token.colorWarning}
                    style={{ margin: 0 }} />
                : <Text style={{ fontSize: 11, color: isSiteDown ? token.colorError : token.colorTextTertiary }}>
                    {isSiteDown ? t("Not reachable") : t("Click for details")}
                  </Text>
            }
            color={isSiteDown ? token.colorError : health?.status === "good" ? token.colorSuccess : health?.status === "critical" ? token.colorError : token.colorWarning}
            tooltip={isSiteDown ? (speed?.reason ?? "Site unreachable") : health?.status !== "good" ? "WordPress found configuration issues" : "Site is running and reachable"}
            onClick={() => navigate("site-health.php", config.adminUrl)}
          />
          <StatTile
            icon={<LineChartOutlined />}
            label={t("Visitors 30d")}
            value={total30Views > 0 ? total30Views.toLocaleString(intlLocale) : "—"}
            sub={
              total30Views > 0
                ? viewTrend !== 0
                  ? <Text style={{ fontSize: 11, color: viewTrend > 0 ? token.colorSuccess : token.colorError }}>{viewTrend > 0 ? "↑" : "↓"} {Math.abs(viewTrend)}% {t("vs yesterday")}</Text>
                  : <Text type="secondary" style={{ fontSize: 11 }}>{t("Stable traffic")}</Text>
                : <Text type="secondary" style={{ fontSize: 11 }}>{t("Tracking active")}</Text>
            }
            color={token.colorPrimary}
            tooltip={t("Install Yoast SEO (free) to track your search visibility")}
          />
          <StatTile
            icon={<UpCircleOutlined />}
            label={t("Updates")}
            value={updates?.total ?? 0}
            sub={
              hasUpdates
                ? <Flex gap={3} wrap="wrap">
                    {(updates?.plugins ?? 0) > 0 && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{updates!.plugins} plugins</Tag>}
                    {(updates?.themes ?? 0) > 0 && <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>{updates!.themes} themes</Tag>}
                    {(updates?.core ?? 0) > 0 && <Tag color="red" style={{ margin: 0, fontSize: 10 }}>core</Tag>}
                  </Flex>
                : updates?.lastChecked
                  ? <Text type="secondary" style={{ fontSize: 11 }}>{relativeTime(updates.lastChecked, intlLocale)}</Text>
                  : <Text type="secondary" style={{ fontSize: 11 }}>{t("All up to date")}</Text>
            }
            color={hasUpdates ? token.colorWarning : token.colorSuccess}
            tooltip={hasUpdates ? t("Updates fix security issues. Make a backup first, then update.") : t("Everything is up to date")}
            onClick={() => navigate("update-core.php", config.adminUrl)}
          />
          <StatTile
            icon={<ThunderboltOutlined />}
            label={t("Speed")}
            value={isSiteDown ? t("Error") : speed?.ms != null ? `${speed.ms} ms` : "—"}
            sub={
              !isSiteDown && speed?.status
                ? <Text style={{ fontSize: 11, color: speed.status === "good" ? token.colorSuccess : speed.status === "fair" ? token.colorWarning : token.colorError }}>
                    {speed.status === "good" ? t("Fast") : speed.status === "fair" ? t("Acceptable") : t("Slow")}
                  </Text>
                : <Text style={{ fontSize: 11, color: token.colorError }}>{t("Unreachable")}</Text>
            }
            color={isSiteDown ? token.colorError : speed?.status === "good" ? token.colorSuccess : speed?.status === "fair" ? token.colorWarning : token.colorError}
            tooltip={t("Homepage load time. Under 600 ms is good. Refreshes every 5 minutes.")}
          />
          <StatTile
            icon={<SearchOutlined />}
            label={t("SEO")}
            value={seo?.plugin ? `${seo.score}%` : seoBasics ? `${seoBasics.score}%` : "—"}
            sub={
              seo?.plugin
                ? seo.issues.length === 0
                  ? <Text style={{ fontSize: 11, color: token.colorSuccess }}>{t("No issues")}</Text>
                  : <Text style={{ fontSize: 11, color: token.colorWarning }}>{t("{n} issues", { n: seo.issues.length })}</Text>
                : seoBasics
                  ? <Text style={{ fontSize: 11, color: seoBasics.score >= 75 ? token.colorSuccess : token.colorWarning }}>{t("Basic check")}</Text>
                  : <Text type="secondary" style={{ fontSize: 11 }}>{t("No plugin")}</Text>
            }
            color={
              seo?.plugin
                ? seo.score >= 80 ? token.colorSuccess : seo.score >= 50 ? token.colorWarning : token.colorError
                : seoBasics
                  ? seoBasics.score >= 75 ? token.colorSuccess : token.colorWarning
                  : token.colorTextSecondary
            }
            tooltip={seo?.plugin ? t("Based on Yoast SEO data") : seoBasics ? t("Basic SEO checks — install Yoast SEO (free) for full tracking") : t("Install Yoast SEO (free) to track your search visibility")}
            onClick={() => navigate("edit.php?post_type=page", config.adminUrl)}
          />
        </div>

        {/* ── First Steps ───────────────────────────────────────────────────── */}
        {showChecklist && (
          <Section
            icon={<RocketOutlined />}
            title={t("First Steps — {done} of {total} done", { done: checklistDone, total: checklist.length })}
            description={t("Complete these steps to get your site fully ready. Each one takes just a few minutes.")}
            extra={
              <Flex align="center" gap={12}>
                <Progress
                  type="circle"
                  percent={Math.round((checklistDone / checklist.length) * 100)}
                  size={40}
                  strokeColor={token.colorPrimary}
                />
                <Tooltip title={t("Dismiss checklist")}>
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
                    <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{t("Open →")}</Text>
                  )}
                </Flex>
              ))}
            </div>
          </Section>
        )}
        {showChecklist && <div style={{ height: 20 }} />}

        {/* ── Charts ────────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: isMd ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 16 }}>
          <Section icon={<LineChartOutlined />} title={t("Page Views")} description={t("Last 30 days")}>
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
                  <Area type="monotone" dataKey="views" name={t("Visits")} stroke={token.colorPrimary} fill="url(#viewsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Flex vertical align="center" justify="center" style={{ height: 170 }} gap={10}>
                <LineChartOutlined style={{ fontSize: 32, color: token.colorTextQuaternary }} />
                <Text type="secondary" style={{ textAlign: "center", fontSize: 12, maxWidth: 240 }}>
                  {t("No data yet. Tracking is active — views appear as people visit your site.")}
                </Text>
              </Flex>
            )}
          </Section>

          <Section icon={<GlobalOutlined />} title={t("Visitors by Country")} description={t("Last 30 days")}>
            {countries.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart
                  data={countries.slice(0, 7).map((c: CountryStatEntry) => ({
                    ...c, label: `${countryFlag(c.country)} ${localCountryName(c.country, intlLocale)}`,
                  }))}
                  layout="vertical" margin={{ left: 8, right: 12 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10, fill: token.colorTextSecondary }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={116} tick={{ fontSize: 11, fill: token.colorTextSecondary }} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}`, t("Visits")] as [string, string]} />
                  <Bar dataKey="visits" radius={[0, 4, 4, 0]}>
                    {countries.slice(0, 7).map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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

        {/* ── Upcoming Bookings / Week Calendar (right after charts) ────────── */}
        {calendar?.available && (
          <div style={{ marginBottom: 16 }}>
            <Section
              icon={<CalendarOutlined />}
              title={t("Upcoming Bookings")}
              description={t("Next 7 days")}
              extra={
                <Flex align="center" gap={8}>
                  {calendar.totalToday > 0 && <Badge count={calendar.totalToday} color={token.colorPrimary} />}
                  <Button type="link" size="small" style={{ padding: 0 }}
                    onClick={() => navigate("admin.php?page=h-bricks-elements", config.adminUrl)}>
                    {t("View all")}
                  </Button>
                </Flex>
              }
            >
              {/* Week view grid */}
              {calendar.weekDays && calendar.weekDays.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <WeekCalendar weekDays={calendar.weekDays} intlLocale={intlLocale} />
                </div>
              )}
              {/* Upcoming list */}
              {calendar.upcoming.length === 0 ? (
                <Flex align="center" justify="center" style={{ height: 48 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t("No bookings in the next 7 days")}</Text>
                </Flex>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: isMd ? "repeat(2, 1fr)" : "1fr", gap: 8 }}>
                  {calendar.upcoming.map((booking: CalendarBooking) => (
                    <Flex key={booking.id} align="center" gap={10}
                      style={{ padding: "10px 14px", background: token.colorBgLayout, borderRadius: token.borderRadius, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: booking.isToday ? token.colorPrimary : token.colorTextQuaternary,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {booking.customerName || "—"}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{formatBookingTime(booking.startDate, intlLocale, t)}</Text>
                      </div>
                      {booking.isToday && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{t("Today")}</Tag>}
                    </Flex>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ── Action Center (full width) ────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          <Section
            icon={<AlertOutlined />}
            title={t("What Needs Your Attention")}
            description={actions.length === 0 ? t("All clear") : t("{n} urgent, {w} to review", { n: criticalActions.length, w: warningActions.length })}
            extra={criticalActions.length > 0 ? <Tag color="error" style={{ margin: 0 }}>{criticalActions.length} urgent</Tag> : undefined}
          >
            {actions.length === 0 ? (
              <Flex vertical align="center" gap={8} style={{ padding: "20px 0" }}>
                <CheckCircleOutlined style={{ fontSize: 32, color: token.colorSuccess }} />
                <Text type="secondary" style={{ fontSize: 13 }}>{t("Everything looks great! No action required.")}</Text>
              </Flex>
            ) : (
              <>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 14 }}>
                  {criticalActions.length > 0
                    ? t("Start with the red items first — everything else can wait.")
                    : t("A few things to review. Start with the orange items.")}
                </Text>
                {hasUpdates && (
                  <Alert
                    type="info" showIcon
                    message={<Text style={{ fontSize: 12 }}>{t("Make a backup before applying updates — most hosts offer this in one click.")}</Text>}
                    style={{ marginBottom: 14, borderRadius: token.borderRadius }}
                  />
                )}
                {criticalActions.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                      <AlertOutlined style={{ color: token.colorError, fontSize: 11 }} />
                      <Text style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: token.colorError, letterSpacing: "0.07em" }}>
                        {t("Act Now")}
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
                        {t("Review Soon")}
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
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {t(infoActions.length === 1 ? "{n} low-priority item" : "{n} low-priority items", { n: infoActions.length })}
                          </Text>
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

          {/* Update Details (full width) */}
          {hasUpdates && (
            <Section icon={<UpCircleOutlined />} title={t("Available Updates")} description={t("Review before updating — always backup first")}>
              <Alert
                type="info" showIcon icon={<InfoCircleOutlined />}
                message={<Text style={{ fontSize: 12 }}>{t("Create a backup before updating. Most hosting control panels offer one-click backups.")}</Text>}
                style={{ marginBottom: 14, borderRadius: token.borderRadius }}
              />
              <div style={{ display: "grid", gridTemplateColumns: isMd ? "repeat(2, 1fr)" : "1fr", gap: 8 }}>
                {updates?.coreList?.map((u, i) => (
                  <Flex key={i} align="center" justify="space-between" gap={8}
                    style={{ padding: "10px 14px", background: `${token.colorError}08`, borderRadius: token.borderRadius, border: `1px solid ${token.colorError}20` }}>
                    <div>
                      <Text style={{ fontSize: 13, fontWeight: 500 }}>{t("WordPress Core")}</Text>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{u.currentVersion} → {u.newVersion}</Text>
                    </div>
                    <Button size="small" danger onClick={() => navigate("update-core.php", config.adminUrl)}>{t("Update")}</Button>
                  </Flex>
                ))}
                {updates?.pluginList?.map((p, i) => (
                  <Flex key={i} align="center" justify="space-between" gap={8}
                    style={{ padding: "10px 14px", background: token.colorBgLayout, borderRadius: token.borderRadius, border: `1px solid ${token.colorBorderSecondary}` }}>
                    <div style={{ minWidth: 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{p.currentVersion} → {p.newVersion}{p.testedUpTo ? ` · ${t("Tested WP {v}", { v: p.testedUpTo })}` : ""}</Text>
                    </div>
                    <Button size="small" onClick={() => navigate("update-core.php", config.adminUrl)} style={{ flexShrink: 0 }}>{t("Update")}</Button>
                  </Flex>
                ))}
                {updates?.themeList?.map((t2, i) => (
                  <Flex key={i} align="center" justify="space-between" gap={8}
                    style={{ padding: "10px 14px", background: token.colorBgLayout, borderRadius: token.borderRadius, border: `1px solid ${token.colorBorderSecondary}` }}>
                    <div>
                      <Text style={{ fontSize: 13, fontWeight: 500 }}>{t2.name} (Theme)</Text>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{t2.currentVersion} → {t2.newVersion}</Text>
                    </div>
                    <Button size="small" onClick={() => navigate("update-core.php", config.adminUrl)}>{t("Update")}</Button>
                  </Flex>
                ))}
              </div>
            </Section>
          )}

          {/* Site Status accordion — Legal, Business, SEO consolidated */}
          {(legalData || bizData || seoBasics) && (
            <Section
              icon={<InfoCircleOutlined />}
              title={t("Site Status Overview")}
              description={t("Legal compliance, business functions, and SEO health")}
            >
              <Collapse ghost
                items={[
                  ...(legalData ? [{
                    key: "legal",
                    label: (
                      <Flex align="center" gap={8}>
                        <FileProtectOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
                        <Text style={{ fontSize: 13 }}>{t("Legal & Compliance")}</Text>
                        {(!legalData.privacyPolicy.published || !legalData.impressum.published || legalData.trackingWithoutConsent)
                          ? <Tag color="error" style={{ margin: 0, fontSize: 11 }}>{t("Action needed")}</Tag>
                          : <Tag color="success" style={{ margin: 0, fontSize: 11 }}>{t("All good")}</Tag>
                        }
                      </Flex>
                    ),
                    children: <LegalSection legal={legalData} adminUrl={config.adminUrl} />,
                  }] : []),
                  ...(bizData ? [{
                    key: "business",
                    label: (
                      <Flex align="center" gap={8}>
                        <BankOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
                        <Text style={{ fontSize: 13 }}>{t("Business Functions")}</Text>
                        {(!bizData.contactForms.available || !bizData.emailDelivery.smtpPlugin)
                          ? <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>Review</Tag>
                          : <Tag color="success" style={{ margin: 0, fontSize: 11 }}>{t("Active")}</Tag>
                        }
                      </Flex>
                    ),
                    children: <BusinessSection biz={bizData} adminUrl={config.adminUrl} />,
                  }] : []),
                  ...(seoBasics ? [{
                    key: "seo",
                    label: (
                      <Flex align="center" gap={8}>
                        <SearchOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
                        <Text style={{ fontSize: 13 }}>{t("SEO Basics")}</Text>
                        <Tag color={seoBasics.score >= 75 ? "success" : "warning"} style={{ margin: 0, fontSize: 11 }}>
                          {seoBasics.score}%
                        </Tag>
                      </Flex>
                    ),
                    children: <SeoBasicsSection seoBasics={seoBasics} adminUrl={config.adminUrl} />,
                  }] : []),
                ]}
              />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

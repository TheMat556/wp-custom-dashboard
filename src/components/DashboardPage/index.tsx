import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileOutlined,
  PlusOutlined,
  RocketOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Button, Card, Flex, Grid, Spin, Tag, Typography, theme } from "antd";
import { useEffect, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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
import { navigate } from "../../utils/wp";
import { SiteHealthWidget } from "./SiteHealthWidget";
import { QuickDraftWidget } from "./QuickDraftWidget";

const { Title, Text } = Typography;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  if (hour >= 18 && hour < 22) return "Good evening";
  return "Good night";
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  const { token } = theme.useToken();
  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      style={{ borderRadius: token.borderRadiusLG, cursor: onClick ? "pointer" : "default", height: "100%" }}
      styles={{ body: { padding: "20px 24px" } }}
    >
      <Flex align="flex-start" gap={14}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: token.borderRadiusLG,
            background: `${color}18`,
            color,
            fontSize: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>
            {label}
          </Text>
          <Text strong style={{ fontSize: 24, display: "block", lineHeight: 1.2 }}>
            {value}
          </Text>
          {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
        </div>
      </Flex>
    </Card>
  );
}

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

  const stats = data?.atAGlance;
  const health = data?.siteHealth;
  const updates = data?.pendingUpdates;
  const activity = data?.activityPerMonth ?? [];
  const thisMonth = activity[activity.length - 1];

  const engagementRate =
    stats && stats.posts > 0 ? (stats.comments / stats.posts).toFixed(1) : "\u2014";

  const totalPending = (stats?.commentsPending ?? 0) + (updates?.total ?? 0);
  const cols = screens.lg ? 4 : screens.sm ? 2 : 2;

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        background: token.colorBgLayout,
        padding: screens.md ? "32px 40px" : "20px 16px",
      }}
    >
      {/* Welcome hero */}
      <Card
        style={{
          marginBottom: 28,
          borderRadius: token.borderRadiusLG * 1.5,
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: token.boxShadowTertiary,
        }}
        styles={{ body: { padding: screens.md ? "28px 36px" : "20px 20px" } }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Flex vertical gap={6}>
            <Flex align="center" gap={10}>
              <Title level={2} style={{ margin: 0, fontSize: screens.md ? 26 : 20 }}>
                {greeting}, {config.user.name}!
              </Title>
              {health && health.status !== "unknown" && (
                <Tag
                  icon={
                    health.status === "good" ? (
                      <CheckCircleOutlined />
                    ) : health.status === "critical" ? (
                      <ExclamationCircleOutlined />
                    ) : (
                      <WarningOutlined />
                    )
                  }
                  color={
                    health.status === "good"
                      ? "success"
                      : health.status === "critical"
                        ? "error"
                        : "warning"
                  }
                  style={{ fontSize: 12, borderRadius: 999 }}
                >
                  Site {health.status === "good" ? "Healthy" : health.status === "recommended" ? "Needs Attention" : "Critical"}
                </Tag>
              )}
            </Flex>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Welcome to <strong>{config.branding.siteName}</strong> \u2014 here\u2019s an overview of your site.
            </Text>
          </Flex>
          <Flex gap={8} wrap="wrap">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("post-new.php", config.adminUrl)}>
              New Post
            </Button>
            <Button icon={<FileOutlined />} onClick={() => navigate("post-new.php?post_type=page", config.adminUrl)}>
              New Page
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate("edit.php", config.adminUrl)}>
              All Posts
            </Button>
          </Flex>
        </Flex>
      </Card>

      {/* Performance metrics */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 28 }}>
        <MetricCard
          icon={<RocketOutlined />}
          label="Published This Month"
          value={thisMonth?.posts ?? 0}
          sub={
            thisMonth?.comments != null && thisMonth.comments > 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {thisMonth.comments} comment{thisMonth.comments !== 1 ? "s" : ""}
              </Text>
            ) : undefined
          }
          color={token.colorPrimary}
          onClick={() => navigate("edit.php", config.adminUrl)}
        />
        <MetricCard
          icon={<ClockCircleOutlined />}
          label="Avg. Comments / Post"
          value={engagementRate}
          sub={
            stats ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {stats.comments} total comment{stats.comments !== 1 ? "s" : ""}
              </Text>
            ) : undefined
          }
          color={token.colorInfo}
          onClick={() => navigate("edit-comments.php", config.adminUrl)}
        />
        <MetricCard
          icon={<AlertOutlined />}
          label="Pending Actions"
          value={totalPending}
          sub={
            totalPending > 0 ? (
              <Flex gap={4} wrap="wrap">
                {(stats?.commentsPending ?? 0) > 0 && (
                  <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                    {stats!.commentsPending} comment{stats!.commentsPending !== 1 ? "s" : ""}
                  </Tag>
                )}
                {(updates?.total ?? 0) > 0 && (
                  <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                    {updates!.total} update{updates!.total !== 1 ? "s" : ""}
                  </Tag>
                )}
              </Flex>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>All clear</Text>
            )
          }
          color={totalPending > 0 ? token.colorWarning : token.colorSuccess}
          onClick={() => navigate("edit-comments.php?comment_status=moderated", config.adminUrl)}
        />
        <MetricCard
          icon={<SyncOutlined />}
          label="Updates Available"
          value={updates?.total ?? 0}
          sub={
            updates && updates.total > 0 ? (
              <Flex gap={4} wrap="wrap">
                {updates.plugins > 0 && (
                  <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{updates.plugins} plugin{updates.plugins !== 1 ? "s" : ""}</Tag>
                )}
                {updates.themes > 0 && (
                  <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>{updates.themes} theme{updates.themes !== 1 ? "s" : ""}</Tag>
                )}
                {updates.core > 0 && (
                  <Tag color="red" style={{ margin: 0, fontSize: 11 }}>core</Tag>
                )}
              </Flex>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>Up to date</Text>
            )
          }
          color={updates && updates.total > 0 ? token.colorError : token.colorSuccess}
          onClick={() => navigate("update-core.php", config.adminUrl)}
        />
      </div>

      {/* Activity charts */}
      {activity.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <Title level={4} style={{ marginBottom: 16, color: token.colorTextHeading }}>
            Site Activity
          </Title>
          <div style={{ display: "grid", gridTemplateColumns: screens.lg ? "2fr 1fr" : "1fr", gap: 20 }}>
            <Card
              title="Content & Engagement (Last 6 Months)"
              style={{ borderRadius: token.borderRadiusLG, background: token.colorBgContainer }}
              styles={{ body: { padding: "16px 20px" } }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={activity}>
                  <defs>
                    <linearGradient id="postGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={token.colorPrimary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={token.colorPrimary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="commentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={token.colorInfo} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={token.colorInfo} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: token.colorTextSecondary }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: token.colorTextSecondary }} />
                  <RechartsTooltip
                    contentStyle={{
                      background: token.colorBgElevated,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      borderRadius: token.borderRadius,
                      fontSize: 12,
                      color: token.colorText,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: token.colorTextSecondary }} />
                  <Area type="monotone" dataKey="posts" name="Posts" stroke={token.colorPrimary} fill="url(#postGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="comments" name="Comments" stroke={token.colorInfo} fill="url(#commentGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {data?.contentBreakdown && data.contentBreakdown.filter((d) => d.value > 0).length > 0 && (
              <Card
                title="Content Mix"
                style={{ borderRadius: token.borderRadiusLG, background: token.colorBgContainer }}
                styles={{ body: { padding: "16px 20px" } }}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.contentBreakdown.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="45%"
                      innerRadius={52}
                      outerRadius={80}
                      dataKey="value"
                      labelLine={false}
                    >
                      {data.contentBreakdown.filter((d) => d.value > 0).map((_, i) => (
                        <Cell key={i} fill={[token.colorPrimary, token.colorInfo, token.colorSuccess, token.colorWarning][i % 4]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: token.colorBgElevated,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: token.borderRadius,
                        fontSize: 12,
                        color: token.colorText,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: token.colorTextSecondary }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Widgets */}
      <div style={{ display: "grid", gridTemplateColumns: screens.lg ? "1fr 1fr" : "1fr", gap: 20, marginBottom: 24 }}>
        {data?.siteHealth && <SiteHealthWidget data={data.siteHealth} />}
        <QuickDraftWidget />
      </div>

      {/* Version footer */}
      {stats && (
        <Flex gap={16}>
          <Text type="secondary" style={{ fontSize: 12 }}>WordPress {stats.wpVersion}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>PHP {stats.phpVersion}</Text>
        </Flex>
      )}
    </div>
  );
}

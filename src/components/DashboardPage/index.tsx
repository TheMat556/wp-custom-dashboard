import {
  CommentOutlined,
  EditOutlined,
  FileOutlined,
  FileTextOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Card, Flex, Grid, Spin, Statistic, Tag, Typography, theme } from "antd";
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
      <Flex align="center" justify="center" style={{ height: "100%", overflow: "auto" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  const stats = data?.atAGlance;
  const cols = screens.lg ? 4 : screens.sm ? 2 : 2;

  return (
    <div style={{ height: "100%", overflow: "auto", padding: screens.md ? "32px 40px" : "20px 16px" }}>

      {/* ── Welcome hero ── */}
      <Card
        style={{
          marginBottom: 28,
          borderRadius: token.borderRadiusLG * 1.5,
          background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
          border: `1px solid ${token.colorPrimaryBorder}`,
          boxShadow: token.boxShadowTertiary,
        }}
        styles={{ body: { padding: screens.md ? "28px 36px" : "20px 20px" } }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <Flex vertical gap={6}>
            <Title level={2} style={{ margin: 0, fontSize: screens.md ? 26 : 20 }}>
              {greeting}, {config.user.name}!
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Welcome to <strong>{config.branding.siteName}</strong> — here's your site at a glance.
            </Text>
          </Flex>
          <Flex gap={8} wrap="wrap">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("post-new.php", config.adminUrl)}
            >
              New Post
            </Button>
            <Button
              icon={<FileOutlined />}
              onClick={() => navigate("post-new.php?post_type=page", config.adminUrl)}
            >
              New Page
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate("edit.php", config.adminUrl)}
            >
              All Posts
            </Button>
          </Flex>
        </Flex>
      </Card>

      {/* ── Stats row ── */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 16,
            marginBottom: 28,
          }}
        >
          <Card
            hoverable
            style={{ borderRadius: token.borderRadiusLG, cursor: "pointer" }}
            styles={{ body: { padding: "20px 24px" } }}
            onClick={() => navigate("edit.php", config.adminUrl)}
          >
            <Statistic
              title="Published Posts"
              value={stats.posts}
              prefix={<FileTextOutlined style={{ color: token.colorPrimary }} />}
              suffix={
                stats.postsDraft > 0 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>+{stats.postsDraft} draft{stats.postsDraft !== 1 ? "s" : ""}</Text>
                ) : undefined
              }
            />
          </Card>

          <Card
            hoverable
            style={{ borderRadius: token.borderRadiusLG, cursor: "pointer" }}
            styles={{ body: { padding: "20px 24px" } }}
            onClick={() => navigate("edit.php?post_type=page", config.adminUrl)}
          >
            <Statistic
              title="Pages"
              value={stats.pages}
              prefix={<FileOutlined style={{ color: token.colorInfo }} />}
              suffix={
                stats.pagesDraft > 0 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>+{stats.pagesDraft} draft{stats.pagesDraft !== 1 ? "s" : ""}</Text>
                ) : undefined
              }
            />
          </Card>

          <Card
            hoverable
            style={{ borderRadius: token.borderRadiusLG, cursor: "pointer" }}
            styles={{ body: { padding: "20px 24px" } }}
            onClick={() => navigate("edit-comments.php", config.adminUrl)}
          >
            <Statistic
              title="Comments"
              value={stats.comments}
              prefix={<CommentOutlined style={{ color: token.colorSuccess }} />}
              suffix={
                stats.commentsPending > 0 ? (
                  <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                    {stats.commentsPending} pending
                  </Tag>
                ) : undefined
              }
            />
          </Card>

          <Card
            hoverable
            style={{ borderRadius: token.borderRadiusLG, cursor: "pointer" }}
            styles={{ body: { padding: "20px 24px" } }}
            onClick={() => navigate("users.php", config.adminUrl)}
          >
            <Statistic
              title="Users"
              value={stats.users}
              prefix={<TeamOutlined style={{ color: token.colorWarning }} />}
            />
          </Card>
        </div>
      )}

      {/* ── Widget grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.lg ? "1fr 1fr" : "1fr",
          gap: 20,
        }}
      >
        {data?.siteHealth && <SiteHealthWidget data={data.siteHealth} />}
        <QuickDraftWidget />
      </div>

      {/* ── Content Insights ── */}
      {(data?.postsPerMonth || data?.contentBreakdown) && (
        <div style={{ marginTop: 24 }}>
          <Title level={4} style={{ marginBottom: 16 }}>Content Insights</Title>
          <div style={{ display: "grid", gridTemplateColumns: screens.lg ? "2fr 1fr" : "1fr", gap: 20 }}>

            {data.postsPerMonth && data.postsPerMonth.length > 0 && (
              <Card
                title="Posts Published (Last 6 Months)"
                style={{ borderRadius: token.borderRadiusLG }}
                styles={{ body: { padding: "16px 20px" } }}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.postsPerMonth}>
                    <defs>
                      <linearGradient id="postGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={token.colorPrimary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={token.colorPrimary} stopOpacity={0} />
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
                      }}
                    />
                    <Area type="monotone" dataKey="posts" stroke={token.colorPrimary} fill="url(#postGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}

            {data.contentBreakdown && data.contentBreakdown.length > 0 && (
              <Card
                title="Content Breakdown"
                style={{ borderRadius: token.borderRadiusLG }}
                styles={{ body: { padding: "16px 20px" } }}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.contentBreakdown.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      // @ts-ignore – recharts PieLabelRenderProps has name?: string but our data always has name
                      label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {data.contentBreakdown.filter((d) => d.value > 0).map((_, index) => (
                        <Cell
                          key={index}
                          fill={[token.colorPrimary, token.colorInfo, token.colorSuccess, token.colorWarning][index % 4]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: token.colorBgElevated,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: token.borderRadius,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── WP / PHP version footer ── */}
      {stats && (
        <Flex gap={16} style={{ marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>WordPress {stats.wpVersion}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>PHP {stats.phpVersion}</Text>
        </Flex>
      )}
    </div>
  );
}

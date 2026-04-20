import { FileOutlined, FileTextOutlined, TeamOutlined } from "@ant-design/icons";
import { Card, Flex, Statistic, Typography, theme } from "antd";
import type { AtAGlanceData } from "../../services/dashboardApi";

const { Text } = Typography;

export function AtAGlanceWidget({ data }: { data: AtAGlanceData }) {
  const { token } = theme.useToken();

  return (
    <Card
      className="wp-react-ui-dashboard-widget-card"
      title="At a Glance"
      style={{ borderRadius: token.borderRadiusLG }}
    >
      <Flex wrap gap={24}>
        <Statistic
          title="Posts"
          value={data.posts}
          prefix={<FileTextOutlined />}
          suffix={
            data.postsDraft > 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({data.postsDraft} drafts)
              </Text>
            ) : undefined
          }
        />
        <Statistic
          title="Pages"
          value={data.pages}
          prefix={<FileOutlined />}
          suffix={
            data.pagesDraft > 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({data.pagesDraft} drafts)
              </Text>
            ) : undefined
          }
        />
        <Statistic title="Users" value={data.users} prefix={<TeamOutlined />} />
      </Flex>
      <Flex
        gap={16}
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          WordPress {data.wpVersion}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          PHP {data.phpVersion}
        </Text>
        {data.lastBackupDate && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Last backup: {data.lastBackupDate}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

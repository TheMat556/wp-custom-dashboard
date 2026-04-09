import { EditOutlined } from "@ant-design/icons";
import { Button, Card, Flex, List, Tag, Typography, theme } from "antd";
import { navigate } from "../../../../utils/wp";
import { useShellConfig } from "../../../shell/context/ShellConfigContext";

interface RecentPostData {
  id: number;
  title: string;
  status: string;
  author: string;
  modified: string;
  editUrl: string | null;
}

const { Text } = Typography;

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(`${dateStr}Z`).getTime(); // GMT
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(date).toLocaleDateString();
}

const STATUS_COLORS: Record<string, string> = {
  publish: "green",
  draft: "default",
  pending: "orange",
};

export function RecentActivityWidget({ posts }: { posts: RecentPostData[] }) {
  const { token } = theme.useToken();
  const { adminUrl } = useShellConfig();

  return (
    <Card
      className="wp-react-ui-dashboard-widget-card wp-react-ui-dashboard-widget-card--compact"
      title="Recent Activity"
      style={{ borderRadius: token.borderRadiusLG }}
    >
      <List
        dataSource={posts}
        renderItem={(post) => (
          <List.Item
            style={{ padding: "10px 20px" }}
            actions={[
              post.editUrl ? (
                <Button
                  key="edit"
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`post.php?post=${post.id}&action=edit`, adminUrl)}
                >
                  Edit
                </Button>
              ) : null,
            ]}
          >
            <Flex vertical gap={2} style={{ minWidth: 0, flex: 1 }}>
              <Text strong ellipsis style={{ fontSize: 14 }}>
                {post.title}
              </Text>
              <Flex gap={8} align="center">
                <Tag
                  color={STATUS_COLORS[post.status] ?? "default"}
                  style={{ margin: 0, fontSize: 12 }}
                >
                  {post.status}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {post.author}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {getRelativeTime(post.modified)}
                </Text>
              </Flex>
            </Flex>
          </List.Item>
        )}
        locale={{ emptyText: "No recent posts" }}
      />
    </Card>
  );
}

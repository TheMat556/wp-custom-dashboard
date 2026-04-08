import { Card, Flex, Progress, Typography, theme } from "antd";
import type { SiteHealthData } from "../../services/dashboardApi";

const { Text } = Typography;

const STATUS_LABELS: Record<string, string> = {
  good: "Good",
  recommended: "Should be improved",
  critical: "Needs attention",
  unknown: "Unknown",
};

function getStrokeColor(status: string, token: ReturnType<typeof theme.useToken>["token"]): string {
  if (status === "good") return token.colorSuccess;
  if (status === "recommended") return token.colorWarning;
  if (status === "critical") return token.colorError;
  return token.colorTextQuaternary;
}

export function SiteHealthWidget({ data }: { data: SiteHealthData }) {
  const { token } = theme.useToken();

  return (
    <Card
      title="Site Health"
      styles={{ body: { padding: "20px" } }}
      style={{ borderRadius: token.borderRadiusLG }}
    >
      <Flex align="center" gap={24}>
        <Progress
          type="circle"
          percent={data.score}
          size={80}
          strokeColor={getStrokeColor(data.status, token)}
          format={(percent) => `${percent}%`}
        />
        <Flex vertical>
          <Text strong style={{ fontSize: 16 }}>
            {STATUS_LABELS[data.status] ?? data.status}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {data.score >= 80
              ? "Your site is in great shape."
              : data.score >= 50
                ? "Some improvements are recommended."
                : "Your site needs attention."}
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}

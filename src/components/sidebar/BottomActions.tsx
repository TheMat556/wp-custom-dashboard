import { QuestionCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Flex, theme } from "antd";

export function BottomActions({
  collapsed,
  loading,
  onRefresh,
}: {
  collapsed: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  const { token } = theme.useToken();

  if (collapsed) return null;

  return (
    <Flex
      vertical
      gap={4}
      style={{
        padding: 12,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        flexShrink: 0,
      }}
    >
      <Button
        type="text"
        icon={<ReloadOutlined spin={loading} />}
        onClick={onRefresh}
        disabled={loading}
        block
        style={{ justifyContent: "flex-start", fontWeight: 600 }}
      >
        {loading ? "Refreshing…" : "Refresh menu"}
      </Button>

      <Button
        type="text"
        icon={<QuestionCircleOutlined />}
        block
        style={{ justifyContent: "flex-start", fontWeight: 600 }}
      >
        Support
      </Button>
    </Flex>
  );
}

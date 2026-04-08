import { ReloadOutlined } from "@ant-design/icons";
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
      className="wp-react-ui-sidebar-bottom-actions"
      style={{
        padding: "12px 12px 14px",
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
        style={{
          justifyContent: "flex-start",
          fontWeight: 600,
          minHeight: 40,
          borderRadius: token.borderRadiusLG,
        }}
      >
        {loading ? "Refreshing..." : "Refresh menu"}
      </Button>
    </Flex>
  );
}

export default BottomActions;

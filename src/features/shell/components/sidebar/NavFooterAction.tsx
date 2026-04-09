import { ReloadOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";

export function NavFooterAction({
  collapsed,
  loading,
  onRefresh,
}: {
  collapsed: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  const action = (
    <Button
      type="text"
      className={[
        "wp-react-ui-shell-action",
        "wp-react-ui-shell-action--ghost",
        collapsed ? "wp-react-ui-shell-action--icon-only" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      icon={<ReloadOutlined spin={loading} />}
      onClick={onRefresh}
      disabled={loading}
      aria-label={loading ? "Refreshing navigation menu" : "Refresh navigation menu"}
    >
      {!collapsed ? (loading ? "Refreshing..." : "Refresh menu") : null}
    </Button>
  );

  return (
    <div className="wp-react-ui-nav-footer">
      {collapsed ? <Tooltip placement="right" title="Refresh menu">{action}</Tooltip> : action}
    </div>
  );
}

export default NavFooterAction;

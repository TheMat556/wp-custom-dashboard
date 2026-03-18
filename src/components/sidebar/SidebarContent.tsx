import { Flex, Menu, theme } from "antd";
import { useMemo } from "react";
import type { MenuItem } from "../../hooks/useMenu";
import { Logo } from "./Logo";
import { BottomActions } from "./BottomActions";
import { transformMenuItems } from "./menuTransform";

export function SidebarContent({
  collapsed,
  menuItems,
  activeKey,
  openKeys,
  onOpenChange,
  onMenuClick,
  onParentClick,
  loading,
  onRefresh,
  showClose,
  onClose,
}: {
  collapsed: boolean;
  menuItems: MenuItem[];
  activeKey?: string;
  openKeys: string[];
  onOpenChange: (keys: string[]) => void;
  onMenuClick: (key: string) => void;
  onParentClick?: (key: string) => void;
  loading: boolean;
  onRefresh: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const { token } = theme.useToken();

  const transformedItems = useMemo(
    () => transformMenuItems(menuItems, collapsed, onParentClick),
    [menuItems, collapsed, onParentClick]
  );

  return (
    <Flex
      vertical
      style={{
        height: "100%",
        backgroundColor: token.colorBgContainer,
      }}
    >
      <Logo collapsed={collapsed} showClose={showClose} onClose={onClose} />

      <Menu
        mode="inline"
        selectedKeys={activeKey ? [activeKey] : []}
        openKeys={collapsed ? [] : openKeys}
        onOpenChange={onOpenChange}
        onClick={({ key }) => onMenuClick(key)}
        items={transformedItems}
        inlineCollapsed={collapsed}
        style={{
          flex: 1,
          borderRight: 0,
          overflow: "auto",
          padding: "12px 8px",
        }}
      />

      <BottomActions
        collapsed={collapsed}
        loading={loading}
        onRefresh={onRefresh}
      />
    </Flex>
  );
}

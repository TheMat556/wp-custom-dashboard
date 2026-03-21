import { Flex, Menu, theme } from "antd";
import {
  useMemo,
  type MouseEventHandler,
  type PointerEventHandler,
} from "react";
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
  onMenuPointerDownCapture,
  onMenuClickCapture,
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
  onMenuPointerDownCapture?: PointerEventHandler<HTMLDivElement>;
  onMenuClickCapture?: MouseEventHandler<HTMLDivElement>;
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

      <div
        style={{
          flex: 1,
          minHeight: 0,
        }}
        onPointerDownCapture={onMenuPointerDownCapture}
        onClickCapture={onMenuClickCapture}
      >
        <Menu
          mode="inline"
          selectedKeys={activeKey ? [activeKey] : []}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={onOpenChange}
          onClick={({ key }) => onMenuClick(key)}
          items={transformedItems}
          inlineCollapsed={collapsed}
          style={{
            height: "100%",
            borderRight: 0,
            overflow: "auto",
            padding: "12px 8px",
          }}
        />
      </div>

      <BottomActions
        collapsed={collapsed}
        loading={loading}
        onRefresh={onRefresh}
      />
    </Flex>
  );
}

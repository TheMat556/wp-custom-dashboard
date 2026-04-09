import { Flex, Menu } from "antd";
import { memo, useCallback, useMemo } from "react";
import type { MenuItem } from "../../../../types/menu";
import { cancelPrefetch, startPrefetch } from "../../../../utils/prefetch";
import BottomActions from "./BottomActions";
import { Logo } from "./Logo";
import { transformMenuItems } from "./menuTransform";

export const SidebarContent = memo(function SidebarContent({
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
  adminUrl,
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
  adminUrl?: string;
}) {
  const transformedItems = useMemo(
    () => transformMenuItems(menuItems, collapsed, onParentClick),
    [menuItems, collapsed, onParentClick]
  );

  // Prefetch: find menu key from hovered DOM element.
  const handleMouseOver = useCallback(
    (e: React.MouseEvent) => {
      if (!adminUrl) return;
      const menuItem = (e.target as HTMLElement).closest<HTMLElement>("[data-menu-id]");
      if (!menuItem) return;
      const rawId = menuItem.dataset.menuId ?? "";
      // Ant Menu uses data-menu-id with format "rc-menu-uuid-N-slug"
      const parts = rawId.split("-");
      const slug = parts[parts.length - 1];
      if (slug) startPrefetch(slug, adminUrl);
    },
    [adminUrl]
  );

  const handleMouseLeave = useCallback(() => {
    cancelPrefetch();
  }, []);

  return (
    <Flex
      vertical
      role="navigation"
      aria-label="Admin menu"
      className="wp-react-ui-sidebar-shell"
      style={{
        height: "100%",
        backgroundColor: "var(--shell-chrome-bg)",
      }}
    >
      <Logo collapsed={collapsed} showClose={showClose} onClose={onClose} />

      <div
        className="wp-react-ui-sidebar-scroll"
        style={{
          flex: 1,
          minHeight: 0,
        }}
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
      >
        <Menu
          className="wp-react-ui-sidebar-menu"
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
            padding: collapsed ? "12px 8px" : "16px 10px",
            background: "transparent",
          }}
        />
      </div>

      <BottomActions collapsed={collapsed} loading={loading} onRefresh={onRefresh} />
    </Flex>
  );
});

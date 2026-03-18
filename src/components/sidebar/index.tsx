import { Layout, theme } from "antd";
import { useMemo, useState, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useSidebar } from "../../context/SidebarContext";
import { useMenu } from "../../hooks/useMenu";
import type { MenuItem } from "../../hooks/useMenu";
import "../../types/wp";
import { getActiveKey, navigate } from "../../utils/wp";
import { SidebarContent } from "./SidebarContent";
import { MobileDrawer } from "./MobileDrawer";

const { Sider } = Layout;

const SIDEBAR_FULL = 240;
const SIDEBAR_COLLAPSED = 64;

function getInitialOpenKeys(
  menuItems: MenuItem[],
  activeKey?: string
): string[] {
  if (!activeKey) return [];
  const parent = menuItems.find(
    (item) =>
      item.slug === activeKey ||
      item.children?.some((c) => c.slug === activeKey)
  );
  return parent?.children?.length ? [parent.slug] : [];
}

export default function Sidebar() {
  const { theme: appTheme } = useTheme();
  const { collapsed, toggle, isMobile, mobileOpen } = useSidebar();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";

  const { menuItems, loading, refresh } = useMenu();
  const activeKey = useMemo(() => getActiveKey(), []);

  const [openKeys, setOpenKeys] = useState<string[]>(() =>
    getInitialOpenKeys(menuItems, activeKey)
  );

  // Prevent re-opening an already-open submenu (accordion style)
  const handleOpenChange = (keys: string[]) => {
    const newlyOpened = keys.find((k) => !openKeys.includes(k));
    if (keys.length === 0) {
      setOpenKeys([]);
    } else if (newlyOpened) {
      setOpenKeys([newlyOpened]);
    }
    // If clicking the already-open parent → do nothing, keep it open
  };

  // Called when a collapsed parent icon is clicked — expand + open submenu
  const handleParentClick = useCallback(
    (key: string) => {
      toggle();
      setTimeout(() => setOpenKeys([key]), 50);
    },
    [toggle]
  );

  // Called for all menu item clicks (leaf items only reach here when expanded,
  // or any item on mobile)
  const handleMenuClick = (key: string) => {
    if (isMobile) {
      toggle();
      navigate(key);
      return;
    }
    // Collapsed leaf item or expanded item — just navigate
    navigate(key);
  };

  // Mobile
  if (isMobile) {
    return (
      <MobileDrawer open={mobileOpen} onClose={toggle}>
        <SidebarContent
          collapsed={false}
          menuItems={menuItems}
          activeKey={activeKey}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          onMenuClick={handleMenuClick}
          loading={loading}
          onRefresh={refresh}
          showClose={true}
          onClose={toggle}
        />
      </MobileDrawer>
    );
  }

  // Desktop
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Sider
        width={SIDEBAR_FULL}
        collapsedWidth={SIDEBAR_COLLAPSED}
        collapsed={collapsed}
        theme={isDark ? "dark" : "light"}
        style={{
          height: "100%",
          minHeight: "100%",
          flex: "1 1 auto",
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflow: "hidden",
        }}
      >
        <SidebarContent
          collapsed={collapsed}
          menuItems={menuItems}
          activeKey={activeKey}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          onMenuClick={handleMenuClick}
          onParentClick={collapsed ? handleParentClick : undefined}
          loading={loading}
          onRefresh={refresh}
        />
      </Sider>
    </div>
  );
}

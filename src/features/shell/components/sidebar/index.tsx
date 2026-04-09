import { Layout, theme } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBootConfig } from "../../../../config/bootConfig";
import { useShellConfig } from "../../context/ShellConfigContext";
import { useSidebar } from "../../context/SidebarContext";
import { useTheme } from "../../context/ThemeContext";
import { useMenu } from "../../../navigation/hooks/useMenu";
import type { MenuItem } from "../../../../types/menu";
import "../../../../types/wp";
import { useActiveKey } from "../../../../utils/spaNavigate";
import { navigate } from "../../../../utils/wp";
import { MobileDrawer } from "./MobileDrawer";
import { SidebarContent } from "./SidebarContent";

const { Sider } = Layout;
const SIDEBAR_WIDTHS = getBootConfig().layout.sidebarWidths;

function getInitialOpenKeys(menuItems: MenuItem[], activeKey?: string): string[] {
  if (!activeKey) return [];
  const parent = menuItems.find(
    (item) => item.slug === activeKey || item.children?.some((c) => c.slug === activeKey)
  );
  return parent?.children?.length ? [parent.slug] : [];
}

export default function Sidebar() {
  const { adminUrl } = useShellConfig();
  const { theme: appTheme } = useTheme();
  const { collapsed, toggle, isMobile, mobileOpen } = useSidebar();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";

  const { menuItems, loading, refresh } = useMenu();
  const activeKey = useActiveKey();

  const [openKeys, setOpenKeys] = useState<string[]>(() =>
    getInitialOpenKeys(menuItems, activeKey)
  );

  // Keep a ref to openKeys so callbacks don't need it in their deps.
  const openKeysRef = useRef(openKeys);
  openKeysRef.current = openKeys;

  // Sync open submenu when activeKey changes (iframe navigation)
  useEffect(() => {
    const keys = getInitialOpenKeys(menuItems, activeKey);
    if (keys.length > 0) {
      setOpenKeys(keys);
    }
  }, [activeKey, menuItems]);

  const handleOpenChange = useCallback((keys: string[]) => {
    const newlyOpened = keys.find((k) => !openKeysRef.current.includes(k));
    if (keys.length === 0) {
      setOpenKeys([]);
    } else if (newlyOpened) {
      setOpenKeys([newlyOpened]);
    }
  }, []);

  const handleParentClick = useCallback(
    (key: string) => {
      toggle();
      setOpenKeys([key]);
    },
    [toggle]
  );

  const handleMenuClick = useCallback(
    (key: string) => {
      if (isMobile) {
        toggle();
        navigate(key, adminUrl);
        return;
      }
      navigate(key, adminUrl);
    },
    [adminUrl, isMobile, toggle]
  );

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
          adminUrl={adminUrl}
        />
      </MobileDrawer>
    );
  }

  // Desktop
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Sider
        width={SIDEBAR_WIDTHS.expanded}
        collapsedWidth={SIDEBAR_WIDTHS.collapsed}
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
          adminUrl={adminUrl}
        />
      </Sider>
    </div>
  );
}

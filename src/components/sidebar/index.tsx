import { Layout, theme } from "antd";
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSidebar } from "../../context/SidebarContext";
import { useTheme } from "../../context/ThemeContext";
import type { MenuItem } from "../../hooks/useMenu";
import { useMenu } from "../../hooks/useMenu";
import "../../types/wp";
import { useActiveKey } from "../../utils/spaNavigate";
import { buildAdminUrl, navigate } from "../../utils/wp";
import { MobileDrawer } from "./MobileDrawer";
import { SidebarContent } from "./SidebarContent";

const { Sider } = Layout;

const SIDEBAR_FULL = 240;
const SIDEBAR_COLLAPSED = 64;

function describeElement(element: Element | null): string | null {
  if (!element) return null;

  const htmlElement = element as HTMLElement;
  const tag = htmlElement.tagName.toLowerCase();
  const id = htmlElement.id ? `#${htmlElement.id}` : "";
  const className =
    typeof htmlElement.className === "string" && htmlElement.className.trim() !== ""
      ? `.${htmlElement.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";

  return `${tag}${id}${className}`;
}

function getInitialOpenKeys(menuItems: MenuItem[], activeKey?: string): string[] {
  if (!activeKey) return [];
  const parent = menuItems.find(
    (item) => item.slug === activeKey || item.children?.some((c) => c.slug === activeKey)
  );
  return parent?.children?.length ? [parent.slug] : [];
}

export default function Sidebar() {
  const { theme: appTheme } = useTheme();
  const { collapsed, toggle, isMobile, mobileOpen } = useSidebar();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";

  const { menuItems, loading, refresh } = useMenu();
  const activeKey = useActiveKey();

  const [openKeys, setOpenKeys] = useState<string[]>(() =>
    getInitialOpenKeys(menuItems, activeKey)
  );

  const logCollapsedDebug = useCallback(
    (eventName: string, details: Record<string, unknown> = {}) => {
      if (isMobile || !collapsed) return;

      const transition = window.__wpReactUiTransitionState;
      console.debug("[WP React UI][collapsed-sidebar]", {
        event: eventName,
        activeKey,
        openKeys,
        transitionActive: transition?.active ?? false,
        transitionId: transition?.id ?? null,
        transitionTargetUrl: transition?.targetUrl ?? null,
        transitionAgeMs: transition ? Math.round(performance.now() - transition.startedAt) : null,
        ...details,
      });
    },
    [activeKey, collapsed, isMobile, openKeys]
  );

  // Sync open submenu when activeKey changes (SPA navigation)
  useEffect(() => {
    const keys = getInitialOpenKeys(menuItems, activeKey);
    if (keys.length > 0) {
      setOpenKeys(keys);
    }
  }, [activeKey, menuItems]);

  const handleOpenChange = (keys: string[]) => {
    const newlyOpened = keys.find((k) => !openKeys.includes(k));
    logCollapsedDebug("open-change", {
      keys,
      newlyOpened: newlyOpened ?? null,
    });
    if (keys.length === 0) {
      setOpenKeys([]);
    } else if (newlyOpened) {
      setOpenKeys([newlyOpened]);
    }
  };

  const handleParentClick = useCallback(
    (key: string) => {
      logCollapsedDebug("parent-click", { key });
      toggle();
      setOpenKeys([key]);
    },
    [logCollapsedDebug, toggle]
  );

  // Called for all menu item clicks (leaf items only reach here when expanded,
  // or any item on mobile)
  const handleMenuClick = (key: string) => {
    logCollapsedDebug("menu-click", {
      key,
      targetUrl: buildAdminUrl(key),
    });
    if (isMobile) {
      toggle();
      navigate(key);
      return;
    }
    // Collapsed leaf item or expanded item — just navigate
    navigate(key);
  };

  const handleMenuPointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = event.target instanceof Element ? event.target : null;
      logCollapsedDebug("menu-pointerdown-capture", {
        button: event.button,
        detail: event.detail,
        target: describeElement(target),
      });
    },
    [logCollapsedDebug]
  );

  const handleMenuClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target instanceof Element ? event.target : null;
      logCollapsedDebug("menu-click-capture", {
        detail: event.detail,
        defaultPrevented: event.defaultPrevented,
        target: describeElement(target),
      });
    },
    [logCollapsedDebug]
  );

  useEffect(() => {
    if (isMobile || !collapsed) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const sidebarRoot = document.getElementById("react-sidebar-root");
      if (!sidebarRoot) return;

      const rect = sidebarRoot.getBoundingClientRect();
      const insideSidebar =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!insideSidebar) return;

      const target = event.target instanceof Element ? event.target : null;
      const topElement = document.elementFromPoint(event.clientX, event.clientY);

      logCollapsedDebug("document-pointerdown", {
        clientX: event.clientX,
        clientY: event.clientY,
        target: describeElement(target),
        topElement: describeElement(topElement),
      });
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    };
  }, [collapsed, isMobile, logCollapsedDebug]);

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
          onMenuPointerDownCapture={handleMenuPointerDownCapture}
          onMenuClickCapture={handleMenuClickCapture}
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
          onMenuPointerDownCapture={handleMenuPointerDownCapture}
          onMenuClickCapture={handleMenuClickCapture}
        />
      </Sider>
    </div>
  );
}

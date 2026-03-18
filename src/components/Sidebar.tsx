import {
  QuestionCircleOutlined,
  AppstoreOutlined,
  SettingOutlined,
  UserOutlined,
  FileOutlined,
  DashboardOutlined,
  ShopOutlined,
  TagOutlined,
  TeamOutlined,
  BarChartOutlined,
  BellOutlined,
  LockOutlined,
  ToolOutlined,
  GlobalOutlined,
  InboxOutlined,
  PictureOutlined,
  CommentOutlined,
  LinkOutlined,
  ReloadOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Menu,
  Button,
  Badge,
  Typography,
  theme,
  Flex,
  type MenuProps,
} from "antd";
import type { ReactNode } from "react";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useSidebar } from "../context/SidebarContext";
import { useMenu } from "../hooks/useMenu";
import type { MenuItem, SubMenuItem } from "../hooks/useMenu";

const { Sider } = Layout;
const { Text } = Typography;

const SIDEBAR_FULL = 240;
const SIDEBAR_COLLAPSED = 64;

// ── Types ─────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    wpReactUi?: {
      adminUrl?: string;
      menu?: MenuItem[];
      menuVersion?: number;
      restUrl?: string;
      nonce?: string;
      siteName?: string;
      theme?: string;
      assetsUrl?: string;
      user?: {
        name: string;
        role: string;
        avatar: string;
      };
    };
  }
}

// ── Icon Map ──────────────────────────────────────────────────────────────────

const dashiconMap: Record<string, ReactNode> = {
  "dashicons-dashboard": <DashboardOutlined />,
  "dashicons-admin-post": <FileOutlined />,
  "dashicons-admin-media": <PictureOutlined />,
  "dashicons-admin-links": <LinkOutlined />,
  "dashicons-admin-page": <FileOutlined />,
  "dashicons-admin-comments": <CommentOutlined />,
  "dashicons-admin-appearance": <AppstoreOutlined />,
  "dashicons-admin-plugins": <AppstoreOutlined />,
  "dashicons-admin-users": <TeamOutlined />,
  "dashicons-admin-tools": <ToolOutlined />,
  "dashicons-admin-settings": <SettingOutlined />,
  "dashicons-admin-network": <GlobalOutlined />,
  "dashicons-admin-generic": <SettingOutlined />,
  "dashicons-admin-home": <DashboardOutlined />,
  "dashicons-cart": <ShopOutlined />,
  "dashicons-tag": <TagOutlined />,
  "dashicons-groups": <TeamOutlined />,
  "dashicons-chart-bar": <BarChartOutlined />,
  "dashicons-bell": <BellOutlined />,
  "dashicons-lock": <LockOutlined />,
  "dashicons-inbox": <InboxOutlined />,
  "dashicons-businessman": <UserOutlined />,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWpConfig() {
  if (typeof window === "undefined") return {};
  return window.wpReactUi ?? {};
}

function getAdminBaseUrl(): string {
  const adminUrl = getWpConfig().adminUrl ?? "/wp-admin/";
  return adminUrl.replace(/\/$/, "");
}

function navigate(slug: string): void {
  const base = getAdminBaseUrl();
  const normalizedSlug = slug.replace(/^\/+/, "");
  const target =
    normalizedSlug.includes("?") || normalizedSlug.includes(".php")
      ? `${base}/${normalizedSlug}`
      : `${base}/admin.php?page=${normalizedSlug}`;
  window.location.assign(target);
}

function getActiveKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const page = new URLSearchParams(window.location.search).get("page");
  if (page) return page;
  return window.location.pathname.split("/").filter(Boolean).pop();
}

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

function resolveIcon(icon?: string): ReactNode {
  if (!icon) return <AppstoreOutlined />;

  if (icon.startsWith("data:image/svg+xml;base64,"))
    return (
      <img
        src={icon}
        alt=""
        aria-hidden
        style={{ width: 16, height: 16, display: "block", flexShrink: 0 }}
      />
    );

  if (icon.startsWith("dashicons-"))
    return dashiconMap[icon] ?? <AppstoreOutlined />;

  return (
    <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
      {icon.slice(0, 2)}
    </span>
  );
}

// ── Badge Types ───────────────────────────────────────────────────────────────

type BadgeType = "default" | "primary" | "warning" | "danger";

function getBadgeColor(
  type: BadgeType,
  token: ReturnType<typeof theme.useToken>["token"]
): string {
  switch (type) {
    case "primary":
      return token.colorPrimary;
    case "warning":
      return token.colorWarning;
    case "danger":
      return token.colorError;
    default:
      return token.colorPrimary;
  }
}

// ── Menu Label with Badge ─────────────────────────────────────────────────────

interface MenuLabelProps {
  label: string;
  count?: number | null;
  badgeType?: BadgeType;
  isSubmenu?: boolean;
}

function MenuLabel({
  label,
  count,
  badgeType = "primary",
  isSubmenu = false,
}: MenuLabelProps) {
  const { token } = theme.useToken();
  const hasCount = count != null && count > 0;

  return (
    <Flex
      justify="space-between"
      align="center"
      gap={8}
      style={{ width: "100%", minWidth: 0 }}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {label}
      </span>
      {hasCount && (
        <Badge
          count={count}
          overflowCount={99}
          size="small"
          color={
            isSubmenu
              ? token.colorPrimaryBg
              : getBadgeColor(badgeType, token)
          }
          style={{
            color: isSubmenu ? token.colorPrimary : "#fff",
            fontWeight: 600,
            fontSize: 11,
          }}
        />
      )}
    </Flex>
  );
}

// ── Icon with Badge Dot (for collapsed state) ─────────────────────────────────

interface IconWithBadgeProps {
  icon: ReactNode;
  count?: number | null;
  badgeType?: BadgeType;
}

function IconWithBadge({
  icon,
  count,
  badgeType = "primary",
}: IconWithBadgeProps) {
  const { token } = theme.useToken();
  const hasCount = count != null && count > 0;

  if (!hasCount) return <>{icon}</>;

  return (
    <Badge
      dot
      offset={[-2, 4]}
      style={{
        backgroundColor: getBadgeColor(badgeType, token),
        boxShadow: `0 0 0 2px ${token.colorBgContainer}`,
      }}
    >
      {icon}
    </Badge>
  );
}

// ── Determine Badge Type Based on Slug ────────────────────────────────────────

function getBadgeTypeForItem(slug: string): BadgeType {
  if (slug.includes("update") || slug.includes("plugin")) return "warning";
  if (slug.includes("comment") || slug.includes("spam")) return "danger";
  return "primary";
}

// ── Transform Menu Items ──────────────────────────────────────────────────────

function transformMenuItems(
  menuItems: MenuItem[],
  collapsed: boolean,
  onParentClick?: (key: string) => void
): MenuProps["items"] {
  return menuItems.map((item) => {
    const hasChildren = (item.children ?? []).length > 0;

    const totalChildCount = hasChildren
      ? (item.children ?? []).reduce((acc, c) => acc + (c.count ?? 0), 0)
      : 0;

    const parentCount =
      item.count ?? (totalChildCount > 0 ? totalChildCount : null);

    const badgeType = getBadgeTypeForItem(item.slug);

    const iconElement = collapsed ? (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
        onClick={
          hasChildren && onParentClick
            ? (e) => {
                e.stopPropagation();
                onParentClick(item.slug);
              }
            : undefined
        }
      >
        <IconWithBadge
          icon={resolveIcon(item.icon)}
          count={parentCount}
          badgeType={badgeType}
        />
      </span>
    ) : (
      resolveIcon(item.icon)
    );

    const parentLabel = collapsed ? null : (
      <MenuLabel label={item.label} count={parentCount} badgeType={badgeType} />
    );

    if (hasChildren) {
      return {
        key: item.slug,
        icon: iconElement,
        title: item.label,
        label: parentLabel,
        children: item.children?.map((child: SubMenuItem) => {
          const childBadgeType = getBadgeTypeForItem(child.slug);
          return {
            key: child.slug,
            label: (
              <MenuLabel
                label={child.label}
                count={child.count}
                badgeType={childBadgeType}
                isSubmenu
              />
            ),
          };
        }),
      };
    }

    return {
      key: item.slug,
      icon: iconElement,
      title: item.label,
      label: parentLabel,
    };
  });
}

// ── Logo Component ────────────────────────────────────────────────────────────

function Logo({
  collapsed,
  showClose,
  onClose,
}: {
  collapsed: boolean;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const { token } = theme.useToken();
  const assetsUrl = window.wpReactUi?.assetsUrl ?? "/";

  return (
    <Flex
      align="center"
      style={{
        height: 64,
        padding: collapsed ? 0 : "0 16px 0 20px",
        justifyContent: collapsed ? "center" : "space-between",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        flexShrink: 0,
      }}
    >
      <Flex align="center">
        <img
          src={`${assetsUrl}logo.svg`}
          alt="Logo"
          style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0 }}
        />
        {!collapsed && (
          <div style={{ marginLeft: 12, lineHeight: 1.2 }}>
            <Text
              strong
              style={{
                display: "block",
                fontSize: 17,
                letterSpacing: "-0.02em",
              }}
            >
              Hader
            </Text>
            <Text
              type="secondary"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Control Panel
            </Text>
          </div>
        )}
      </Flex>

      {showClose && onClose && (
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      )}
    </Flex>
  );
}

// ── Bottom Actions ────────────────────────────────────────────────────────────

function BottomActions({
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

// ── Sidebar Content ───────────────────────────────────────────────────────────

function SidebarContent({
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

// ── Mobile Drawer Wrapper ─────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { token } = theme.useToken();

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          zIndex: 1000,
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_FULL,
          backgroundColor: token.colorBgContainer,
          boxShadow: open ? "6px 0 16px rgba(0, 0, 0, 0.12)" : "none",
          zIndex: 1001,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { theme: appTheme } = useTheme();
  const { collapsed, toggle, isMobile, mobileOpen } = useSidebar();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";

  const { menuItems, loading, refresh } = useMenu();
  const activeKey = useMemo(() => getActiveKey(), []);

  // Seed open keys exactly once after menu items load
  const openKeysSeeded = useRef(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  useEffect(() => {
    if (menuItems.length > 0 && !openKeysSeeded.current) {
      openKeysSeeded.current = true;
      setOpenKeys(getInitialOpenKeys(menuItems, activeKey));
    }
  }, [menuItems, activeKey]);

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
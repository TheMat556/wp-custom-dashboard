import {
  BulbOutlined,
  BulbFilled,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  HomeOutlined,
  LogoutOutlined,
  EditOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Dropdown,
  Avatar,
  Button,
  Divider,
  Space,
  Typography,
  theme,
  Flex,
  type MenuProps,
} from "antd";
import { useTheme } from "../context/ThemeContext";
import { useSidebar } from "../context/SidebarContext";
import { useMenu } from "../hooks/useMenu";
import { useMemo, useRef, useEffect } from "react";

const { Text } = Typography;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWpUser() {
  const wp = (window as any).wpReactUi;
  const name = wp?.user?.name ?? "Admin User";
  const role = wp?.user?.role ?? "Super Admin";
  const avatar = wp?.user?.avatar ?? null;
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { name, role, initials, avatar };
}

function getAdminBaseUrl(): string {
  const adminUrl = (window as any).wpReactUi?.adminUrl ?? "/wp-admin/";
  return adminUrl.replace(/\/$/, "");
}

function getActiveKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const page = new URLSearchParams(window.location.search).get("page");
  if (page) return page;
  return window.location.pathname.split("/").filter(Boolean).pop();
}

function navigate(slug: string): void {
  const base = getAdminBaseUrl();
  const normalizedSlug = slug.replace(/^\/+/, "");
  const target =
    normalizedSlug.includes("?") || normalizedSlug.includes(".php")
      ? `${base}/${normalizedSlug}`
      : `${base}/admin.php?page=${normalizedSlug}`;
  window.location.href = target;
}

function navigateHome(): void {
  const base = getAdminBaseUrl();
  window.location.href = `${base}/index.php`;
}

// ── User Dropdown ─────────────────────────────────────────────────────────────

function UserDropdown({
  isDark,
  getContainer,
}: {
  isDark: boolean;
  getContainer: () => HTMLElement;
}) {
  const user = useMemo(() => getWpUser(), []);
  const { token } = theme.useToken();

  const goEditProfile = () => {
    const base = getAdminBaseUrl();
    window.location.href = `${base}/profile.php`;
  };

  const goLogout = () => {
    const wp = (window as any).wpReactUi;
    const url =
      wp?.logoutUrl ?? `${getAdminBaseUrl()}/wp-login.php?action=logout`;
    window.location.href = url;
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "user-header",
      type: "group",
      label: (
        <Flex gap={12} align="center" style={{ padding: "8px 4px" }}>
          <Avatar
            size={40}
            src={user.avatar}
            style={{
              backgroundColor: isDark ? "#1e1b4b" : "#ede9fe",
              color: isDark ? "#818cf8" : "#4f46e5",
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {user.initials || <UserOutlined />}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text
              strong
              style={{
                display: "block",
                fontSize: 14,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </Text>
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {user.role}
            </Text>
          </div>
        </Flex>
      ),
    },
    { type: "divider" },
    {
      key: "edit-profile",
      icon: <EditOutlined />,
      label: "Edit Profile",
      onClick: goEditProfile,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Log Out",
      danger: true,
      onClick: goLogout,
    },
  ];

  return (
    <Dropdown
      menu={{
        items: menuItems,
        style: { minWidth: 200 },
      }}
      trigger={["click"]}
      placement="bottomRight"
      getPopupContainer={getContainer}
      overlayStyle={{ minWidth: 220 }}
    >
      <Flex
        align="center"
        gap={10}
        style={{
          cursor: "pointer",
          padding: "6px 10px",
          borderRadius: token.borderRadiusLG,
          transition: "background-color 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDark
            ? token.colorBgTextHover
            : token.colorBgTextHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div style={{ textAlign: "right" }}>
          <Text
            strong
            style={{ display: "block", fontSize: 13, lineHeight: 1.3 }}
          >
            {user.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {user.role}
          </Text>
        </div>
        <Avatar
          size={38}
          src={user.avatar}
          style={{
            backgroundColor: isDark ? "#1e1b4b" : "#ede9fe",
            color: isDark ? "#818cf8" : "#4f46e5",
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {user.initials || <UserOutlined />}
        </Avatar>
      </Flex>
    </Dropdown>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────

export default function Navbar() {
  const { theme: appTheme, toggle: toggleTheme } = useTheme();
  const { collapsed, toggle: toggleSidebar, isMobile, mobileOpen } = useSidebar();
  const { menuItems } = useMenu();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";
  const activeKey = useMemo(() => getActiveKey(), []);

  // Ref for dropdown container (renders popups inside this element)
  const containerRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = () => containerRef.current || document.body;

  // Debug log (remove in production)
  useEffect(() => {
    console.log('[Navbar] isMobile:', isMobile, 'mobileOpen:', mobileOpen, 'collapsed:', collapsed);
  }, [isMobile, mobileOpen, collapsed]);

  const breadcrumbItems = useMemo(() => {
    const items: { title: React.ReactNode }[] = [
      {
        title: (
          <Space
            size={4}
            style={{ cursor: "pointer" }}
            onClick={navigateHome}
          >
            <HomeOutlined className="mr-1" style={{ fontSize: 16 }} />
            <Text type="secondary" className="hover:text-current">
              Home
            </Text>
          </Space>
        ),
      },
    ];

    if (!activeKey) return items;

    const topLevel = menuItems.find((m) => m.slug === activeKey);
    if (topLevel) {
      items.push({
        title: (
          <Text
            strong
            style={{ cursor: "pointer" }}
            onClick={() => navigate(topLevel.slug)}
          >
            {topLevel.label}
          </Text>
        ),
      });
      return items;
    }

    for (const parent of menuItems) {
      const child = parent.children?.find((c) => c.slug === activeKey);
      if (child) {
        items.push({
          title: (
            <Text
              type="secondary"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(parent.slug)}
            >
              {parent.label}
            </Text>
          ),
        });
        items.push({
          title: <Text strong>{child.label}</Text>,
        });
        return items;
      }
    }

    items.push({
      title: (
        <Text strong style={{ textTransform: "capitalize" }}>
          {activeKey.replace(/-/g, " ")}
        </Text>
      ),
    });

    return items;
  }, [activeKey, menuItems]);

  // Choose the right icon for the toggle button
  const getToggleIcon = () => {
    if (isMobile) {
      // On mobile: always show hamburger menu
      return <MenuOutlined />;
    }
    // On desktop: show fold/unfold based on collapsed state
    return collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />;
  };

  return (
    <header
      ref={containerRef}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 64,
        flexShrink: 0,
        backgroundColor: token.colorBgContainer,
        paddingRight: 24,
        paddingLeft: 0,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        transition: "background-color 300ms ease",
      }}
    >
      {/* ── Left: Burger + Breadcrumb ── */}
      <Space size={8} align="center">
        <Button
          type="text"
          icon={getToggleIcon()}
          onClick={toggleSidebar}
          title={isMobile ? "Open menu" : (collapsed ? "Expand sidebar" : "Collapse sidebar")}
          style={{
            width: 64,
            height: 64,
            borderRadius: 0,
            fontSize: 18,
          }}
        />
        {!isMobile && (
          <Breadcrumb items={breadcrumbItems} style={{ marginTop: "4px" }} />
        )}
      </Space>

      {/* ── Right actions ── */}
      <Space
        size={12}
        align="center"
        split={
          <Divider type="vertical" style={{ height: 28, margin: 0 }} />
        }
      >
        {/* Theme toggle */}
        <Button
          type="text"
          shape="circle"
          icon={
            isDark ? (
              <BulbFilled style={{ color: token.colorPrimary, fontSize: 18 }} />
            ) : (
              <BulbOutlined style={{ fontSize: 18 }} />
            )
          }
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{ width: 36, height: 36 }}
        />

        {/* User dropdown */}
        <UserDropdown isDark={isDark} getContainer={getPopupContainer} />
      </Space>
    </header>
  );
}
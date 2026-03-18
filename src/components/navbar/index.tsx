import {
  BulbOutlined,
  BulbFilled,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Divider,
  Space,
  Typography,
  theme,
} from "antd";
import { useTheme } from "../../context/ThemeContext";
import { useSidebar } from "../../context/SidebarContext";
import { useMenu } from "../../hooks/useMenu";
import { useMemo, useRef } from "react";
import "../../types/wp";
import { getActiveKey, navigate, navigateHome } from "../../utils/wp";
import UserDropdown from "./UserDropdown";

const { Text } = Typography;

// ── Main Navbar ───────────────────────────────────────────────────────────────

export default function Navbar() {
  const { theme: appTheme, toggle: toggleTheme } = useTheme();
  const { collapsed, toggle: toggleSidebar, isMobile } = useSidebar();
  const { menuItems } = useMenu();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";
  const activeKey = useMemo(() => getActiveKey(), []);

  // Ref for dropdown container (renders popups inside this element)
  const containerRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = () => containerRef.current || document.body;

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

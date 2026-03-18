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
import { useMemo, useRef, useState } from "react";
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
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const [isTogglePressed, setIsTogglePressed] = useState(false);
  const [isThemeHovered, setIsThemeHovered] = useState(false);
  const [isThemePressed, setIsThemePressed] = useState(false);

  // Ref for dropdown container (renders popups inside this element)
  const containerRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = () => containerRef.current || document.body;

  const headerBackground = isDark
    ? `linear-gradient(180deg, ${token.colorBgElevated} 0%, ${token.colorBgContainer} 100%)`
    : token.colorBgContainer;
  const headerBorderColor = isDark
    ? token.colorSplit
    : token.colorBorderSecondary;
  const breadcrumbShellStyle = {
    marginTop: 4,
    padding: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    border: "none",
    transition: "color 200ms ease",
    boxShadow: "none",
  };
  const toggleButtonBackground = isTogglePressed
    ? token.controlItemBgActive
    : isToggleHovered
      ? token.controlItemBgHover
      : isDark
        ? token.colorFillAlter
        : "transparent";
  const themeButtonBackground = isThemePressed
    ? token.controlItemBgActive
    : isThemeHovered
      ? token.controlItemBgHover
      : "transparent";

  const breadcrumbItems = useMemo(() => {
    const items: { title: React.ReactNode }[] = [
      {
        title: (
          <Space
            size={4}
            style={{ cursor: "pointer" }}
            onClick={navigateHome}
          >
            <HomeOutlined
              className="mr-1"
              style={{ fontSize: 16, color: token.colorTextTertiary }}
            />
            <Text style={{ color: token.colorTextSecondary }}>
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
            style={{ cursor: "pointer", color: token.colorTextHeading }}
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
              style={{ cursor: "pointer", color: token.colorTextSecondary }}
              onClick={() => navigate(parent.slug)}
            >
              {parent.label}
            </Text>
          ),
        });
        items.push({
          title: (
            <Text strong style={{ color: token.colorTextHeading }}>
              {child.label}
            </Text>
          ),
        });
        return items;
      }
    }

    items.push({
      title: (
        <Text
          strong
          style={{
            textTransform: "capitalize",
            color: token.colorTextHeading,
          }}
        >
          {activeKey.replace(/-/g, " ")}
        </Text>
      ),
    });

    return items;
  }, [
    activeKey,
    menuItems,
    token.colorTextHeading,
    token.colorTextSecondary,
    token.colorTextTertiary,
  ]);

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
        background: headerBackground,
        paddingRight: 24,
        paddingLeft: 0,
        borderBottom: `1px solid ${headerBorderColor}`,
        boxShadow: isDark ? token.boxShadowTertiary : "none",
        transition:
          "background 300ms ease, border-color 300ms ease, box-shadow 300ms ease",
      }}
    >
      {/* ── Left: Burger + Breadcrumb ── */}
      <Space size={12} align="center">
        <Button
          type="text"
          icon={getToggleIcon()}
          onClick={toggleSidebar}
          title={
            isMobile ? "Open menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          onMouseEnter={() => setIsToggleHovered(true)}
          onMouseLeave={() => {
            setIsToggleHovered(false);
            setIsTogglePressed(false);
          }}
          onMouseDown={() => setIsTogglePressed(true)}
          onMouseUp={() => setIsTogglePressed(false)}
          onBlur={() => setIsTogglePressed(false)}
          style={{
            width: 64,
            height: 64,
            borderRadius: 0,
            fontSize: 18,
            color:
              isToggleHovered || isTogglePressed
                ? token.colorText
                : token.colorTextSecondary,
            backgroundColor: toggleButtonBackground,
            borderInlineEnd: `1px solid ${headerBorderColor}`,
            boxShadow:
              isDark && (isToggleHovered || isTogglePressed)
                ? `inset 0 -1px 0 ${token.colorSplit}`
                : "none",
            transition:
              "background-color 180ms ease, color 180ms ease, box-shadow 180ms ease",
          }}
        />
        {!isMobile && (
          <div style={breadcrumbShellStyle}>
            <Breadcrumb
              items={breadcrumbItems}
              separator={
                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                  /
                </Text>
              }
            />
          </div>
        )}
      </Space>

      {/* ── Right actions ── */}
      <Space
        size={12}
        align="center"
        split={
          <Divider
            type="vertical"
            style={{
              height: 28,
              margin: 0,
              borderInlineStartColor: token.colorSplit,
            }}
          />
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
              <BulbOutlined
                style={{
                  color:
                    isThemeHovered || isThemePressed
                      ? token.colorText
                      : token.colorTextSecondary,
                  fontSize: 18,
                }}
              />
            )
          }
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onMouseEnter={() => setIsThemeHovered(true)}
          onMouseLeave={() => {
            setIsThemeHovered(false);
            setIsThemePressed(false);
          }}
          onMouseDown={() => setIsThemePressed(true)}
          onMouseUp={() => setIsThemePressed(false)}
          onBlur={() => setIsThemePressed(false)}
          style={{
            width: 38,
            height: 38,
            color:
              isThemeHovered || isThemePressed
                ? token.colorText
                : token.colorTextSecondary,
            backgroundColor: themeButtonBackground,
            boxShadow:
              isDark && (isThemeHovered || isThemePressed)
                ? `inset 0 0 0 1px ${token.colorSplit}`
                : "none",
            transition:
              "background-color 180ms ease, color 180ms ease, box-shadow 180ms ease",
          }}
        />

        {/* User dropdown */}
        <UserDropdown isDark={isDark} getContainer={getPopupContainer} />
      </Space>
    </header>
  );
}

import {
  BulbOutlined,
  BulbFilled,
  ExportOutlined,
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
import { useMemo, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useSidebar } from "../../context/SidebarContext";
import { useMenu } from "../../hooks/useMenu";
import "../../types/wp";
import { navigate, navigateHome } from "../../utils/wp";
import { useActiveKey } from "../../utils/spaNavigate";
import UserDropdown from "./UserDropdown";

const { Text } = Typography;

// ── Main Navbar ───────────────────────────────────────────────────────────────

export default function Navbar() {
  const { theme: appTheme, toggle: toggleTheme } = useTheme();
  const { collapsed, toggle: toggleSidebar, isMobile } = useSidebar();
  const { menuItems } = useMenu();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";
  const activeKey = useActiveKey();
  const publicUrl = window.wpReactUi?.publicUrl ?? "/";

  const containerRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = () => containerRef.current || document.body;

  const headerBackground = isDark
    ? `linear-gradient(180deg, ${token.colorBgElevated} 0%, ${token.colorBgContainer} 100%)`
    : token.colorBgContainer;
  const headerBorderColor = isDark
    ? token.colorSplit
    : token.colorBorderSecondary;

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
              style={{ fontSize: 16, color: token.colorTextTertiary, marginRight: 4 }}
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

  const getToggleIcon = () => {
    if (isMobile) return <MenuOutlined />;
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
          style={{
            width: 64,
            height: 64,
            borderRadius: 0,
            fontSize: 18,
            color: token.colorTextSecondary,
            borderInlineEnd: `1px solid ${headerBorderColor}`,
            transition:
              "background-color 180ms ease, color 180ms ease",
          }}
        />
        {!isMobile && (
          <div style={{
            marginTop: 4,
            padding: 0,
            borderRadius: 0,
            backgroundColor: "transparent",
            border: "none",
            transition: "color 200ms ease",
            boxShadow: "none",
          }}>
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
        <Button
          type="text"
          shape="circle"
          icon={
            <ExportOutlined
              style={{
                color: token.colorTextSecondary,
                fontSize: 18,
              }}
            />
          }
          onClick={(event) => {
            window.open(publicUrl, "_blank", "noopener,noreferrer");
            event.currentTarget.blur();
          }}
          title="Open frontend"
          aria-label="Open frontend"
          style={{
            width: 38,
            height: 38,
            color: token.colorTextSecondary,
            transition:
              "background-color 180ms ease, color 180ms ease",
          }}
        />

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
                  color: token.colorTextSecondary,
                  fontSize: 18,
                }}
              />
            )
          }
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: 38,
            height: 38,
            color: token.colorTextSecondary,
            transition:
              "background-color 180ms ease, color 180ms ease",
          }}
        />

        {/* User dropdown */}
        <UserDropdown isDark={isDark} getContainer={getPopupContainer} />
      </Space>
    </header>
  );
}

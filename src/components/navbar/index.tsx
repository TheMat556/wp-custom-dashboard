import {
  BulbFilled,
  BulbOutlined,
  ExportOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Button, Divider, Space, Typography, theme } from "antd";
import { lazy, Suspense, useMemo, useRef } from "react";
import { useShellConfig } from "../../context/ShellConfigContext";
import { useSidebar } from "../../context/SidebarContext";
import { useTheme } from "../../context/ThemeContext";
import { useMenu } from "../../hooks/useMenu";
import { useActiveKey } from "../../utils/spaNavigate";
import { navigate, navigateHome } from "../../utils/wp";
import { CommandPaletteTrigger } from "./CommandPalette";

const { Text } = Typography;
const UserDropdown = lazy(() => import("./UserDropdown"));

// ── Main Navbar ───────────────────────────────────────────────────────────────

export default function Navbar() {
  const { adminUrl, publicUrl } = useShellConfig();
  const { theme: appTheme, toggle: toggleTheme } = useTheme();
  const { collapsed, toggle: toggleSidebar, isMobile } = useSidebar();
  const { menuItems } = useMenu();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";
  const activeKey = useActiveKey();

  const containerRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = () => containerRef.current || document.body;

  const headerBackground = isDark
    ? `linear-gradient(180deg, ${token.colorBgElevated} 0%, ${token.colorBgContainer} 100%)`
    : token.colorBgContainer;
  const headerBorderColor = isDark ? token.colorSplit : token.colorBorderSecondary;

  const breadcrumbItems = useMemo(() => {
    const items: { title: React.ReactNode }[] = [
      {
        title: (
          <Space
            size={4}
            style={{ cursor: "pointer", minWidth: 0, maxWidth: 160 }}
            onClick={() => navigateHome(adminUrl)}
          >
            <HomeOutlined
              style={{ fontSize: 16, color: token.colorTextTertiary, marginRight: 4 }}
            />
            <Text
              style={{
                color: token.colorTextSecondary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
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
            style={{
              cursor: "pointer",
              color: token.colorTextHeading,
              display: "inline-block",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              verticalAlign: "middle",
            }}
            onClick={() => navigate(topLevel.slug, adminUrl)}
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
              style={{
                cursor: "pointer",
                color: token.colorTextSecondary,
                display: "inline-block",
                maxWidth: 140,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                verticalAlign: "middle",
              }}
              onClick={() => navigate(parent.slug, adminUrl)}
            >
              {parent.label}
            </Text>
          ),
        });
        items.push({
          title: (
            <Text
              strong
              style={{
                color: token.colorTextHeading,
                display: "inline-block",
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                verticalAlign: "middle",
              }}
            >
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
            display: "inline-block",
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            verticalAlign: "middle",
          }}
        >
          {activeKey.replace(/-/g, " ")}
        </Text>
      ),
    });

    return items;
  }, [
    activeKey,
    adminUrl,
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
      className="wp-react-ui-navbar"
      style={{
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 64,
        flexShrink: 0,
        background: headerBackground,
        paddingRight: isMobile ? 14 : 20,
        paddingLeft: 0,
        borderBottom: `1px solid ${headerBorderColor}`,
        boxShadow: isDark ? token.boxShadowTertiary : "none",
        transition: "background 300ms ease, border-color 300ms ease, box-shadow 300ms ease",
      }}
    >
      {/* ── Left: Burger + Breadcrumb ── */}
      <Space size={12} align="center">
        <Button
          className="wp-react-ui-navbar-toggle"
          type="text"
          icon={getToggleIcon()}
          onClick={toggleSidebar}
          title={isMobile ? "Open menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: 64,
            height: 64,
            borderRadius: 0,
            fontSize: 18,
            color: token.colorTextSecondary,
            borderInlineEnd: `1px solid ${headerBorderColor}`,
            transition: "background-color 180ms ease, color 180ms ease",
          }}
        />
        {!isMobile && (
          <div
            className="wp-react-ui-navbar-breadcrumb"
          >
            <Breadcrumb
              items={breadcrumbItems}
              separator={<Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>/</Text>}
            />
          </div>
        )}
      </Space>

      {/* ── Right actions ── */}
      <Space
        size={12}
        align="center"
        split={isMobile ? undefined : (
          <Divider
            type="vertical"
            style={{
              height: 28,
              margin: 0,
              borderInlineStartColor: token.colorSplit,
            }}
          />
        )}
      >
        <CommandPaletteTrigger />

        <Button
          className="wp-react-ui-navbar-icon-button"
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
            transition: "background-color 180ms ease, color 180ms ease",
          }}
        />

        {/* Theme toggle */}
        <Button
          className="wp-react-ui-navbar-icon-button"
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
            transition: "background-color 180ms ease, color 180ms ease",
          }}
        />

        {/* User dropdown */}
        <Suspense fallback={null}>
          <UserDropdown isDark={isDark} getContainer={getPopupContainer} compact={isMobile} />
        </Suspense>
      </Space>
    </header>
  );
}

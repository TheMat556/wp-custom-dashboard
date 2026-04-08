import {
  BulbFilled,
  BulbOutlined,
  EllipsisOutlined,
  ExportOutlined,
  HistoryOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Button, Dropdown, Tooltip, Typography, theme } from "antd";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useShellConfig } from "../../context/ShellConfigContext";
import { useSidebar } from "../../context/SidebarContext";
import { useTheme } from "../../context/ThemeContext";
import { useMenu } from "../../hooks/useMenu";
import { useActiveKey } from "../../utils/spaNavigate";
import { navigate, navigateHome } from "../../utils/wp";
import { CommandPaletteTrigger } from "./CommandPalette";

const { Text } = Typography;
const UserDropdown = lazy(() => import("./UserDropdown"));
const ActivityLogPanel = lazy(() => import("../ActivityLogPanel"));

// ── Main Navbar ───────────────────────────────────────────────────────────────

export default function Navbar() {
  const { adminUrl, publicUrl } = useShellConfig();
  const { theme: appTheme, toggle: toggleTheme } = useTheme();
  const { collapsed, toggle: toggleSidebar, isMobile } = useSidebar();
  const { menuItems } = useMenu();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";
  const activeKey = useActiveKey();
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityEverOpened, setActivityEverOpened] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);

  const containerRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = () => containerRef.current || document.body;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width != null) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const headerBackground = isDark
    ? `linear-gradient(180deg, ${token.colorBgElevated} 0%, ${token.colorBgContainer} 100%)`
    : token.colorBgContainer;
  const headerBorderColor = isDark ? token.colorSplit : token.colorBorderSecondary;

  const showExport = containerWidth >= 860;
  const showHistory = containerWidth >= 720;
  const showTheme = containerWidth >= 580;
  const showSearchFull = containerWidth >= 600;

  const overflowMenuItems: { key: string; label: React.ReactNode; icon: React.ReactNode; onClick: () => void }[] = [
    ...(!showExport ? [{ key: "export", label: "Open Frontend", icon: <ExportOutlined />, onClick: () => window.open(publicUrl, "_blank", "noopener,noreferrer") }] : []),
    ...(!showHistory ? [{ key: "history", label: "Activity Log", icon: <HistoryOutlined />, onClick: () => { setActivityEverOpened(true); setActivityOpen(true); } }] : []),
    ...(!showTheme ? [{ key: "theme", label: isDark ? "Light Mode" : "Dark Mode", icon: isDark ? <BulbFilled /> : <BulbOutlined />, onClick: toggleTheme }] : []),
  ];

  const breadcrumbItems = useMemo(() => {
    const items: { title: React.ReactNode }[] = [
      {
        title: (
          <span
            style={{ cursor: "pointer", minWidth: 0, maxWidth: 160, display: "inline-flex", alignItems: "center", gap: 4 }}
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
          </span>
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
      role="banner"
      className="wp-react-ui-navbar"
      style={{
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: "var(--shell-navbar-height, 64px)",
        flexShrink: 0,
        background: headerBackground,
        paddingLeft: 0,
        paddingRight: 0,
        borderBottom: `1px solid ${headerBorderColor}`,
        boxShadow: isDark ? token.boxShadowTertiary : "none",
        transition: "background 300ms ease, border-color 300ms ease, box-shadow 300ms ease",
      }}
    >
      {/* Left: burger + breadcrumb (shrinks to show burger at minimum) */}
      <div style={{ display: "flex", alignItems: "center", flexShrink: 1, minWidth: "var(--shell-navbar-height, 64px)", overflow: "hidden" }}>
        <Button
          className="wp-react-ui-navbar-toggle"
          type="text"
          icon={getToggleIcon()}
          onClick={toggleSidebar}
          title={isMobile ? "Open menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isMobile ? "Open menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: "var(--shell-navbar-height, 64px)",
            height: "var(--shell-navbar-height, 64px)",
            borderRadius: 0,
            fontSize: 18,
            color: token.colorTextSecondary,
            borderInlineEnd: `1px solid ${headerBorderColor}`,
            transition: "background-color 180ms ease, color 180ms ease",
            flexShrink: 0,
          }}
        />
        {!isMobile && (
          <div className="wp-react-ui-navbar-breadcrumb" style={{ maxWidth: 240, minWidth: 0, overflow: "hidden", marginLeft: 16 }}>
            <Breadcrumb
              items={breadcrumbItems}
              separator={<Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>/</Text>}
            />
          </div>
        )}
      </div>

      {/* Center: search bar – grows to fill available space */}
      <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 8px" }}>
        {!isMobile && <CommandPaletteTrigger compact={!showSearchFull} />}
      </div>

      {/* Right: action buttons + user (fixed, won't shrink) */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: isMobile ? 14 : 20, flexShrink: 0 }}>
        {isMobile && <CommandPaletteTrigger compact />}

        {showExport && (
          <Tooltip title="Open frontend">
            <Button
              className="wp-react-ui-navbar-icon-button"
              type="text"
              shape="circle"
              icon={<ExportOutlined style={{ color: token.colorTextSecondary, fontSize: 18 }} />}
              onClick={(event) => {
                window.open(publicUrl, "_blank", "noopener,noreferrer");
                event.currentTarget.blur();
              }}
              aria-label="Open frontend"
              style={{ width: 38, height: 38, transition: "background-color 180ms ease, color 180ms ease" }}
            />
          </Tooltip>
        )}

        {showHistory && (
          <Tooltip title="Activity log">
            <Button
              className="wp-react-ui-navbar-icon-button"
              type="text"
              shape="circle"
              icon={<HistoryOutlined style={{ color: activityOpen ? token.colorPrimary : token.colorTextSecondary, fontSize: 18 }} />}
              onClick={() => { setActivityEverOpened(true); setActivityOpen(true); }}
              aria-label="Open activity log"
              style={{ width: 38, height: 38, transition: "background-color 180ms ease, color 180ms ease" }}
            />
          </Tooltip>
        )}

        {showTheme && (
          <Button
            className="wp-react-ui-navbar-icon-button"
            type="text"
            shape="circle"
            icon={
              isDark ? (
                <BulbFilled style={{ color: token.colorPrimary, fontSize: 18 }} />
              ) : (
                <BulbOutlined style={{ color: token.colorTextSecondary, fontSize: 18 }} />
              )
            }
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ width: 38, height: 38, transition: "background-color 180ms ease, color 180ms ease" }}
          />
        )}

        {overflowMenuItems.length > 0 && (
          <Dropdown menu={{ items: overflowMenuItems }} trigger={["click"]} getPopupContainer={getPopupContainer}>
            <Button
              className="wp-react-ui-navbar-icon-button"
              type="text"
              shape="circle"
              icon={<EllipsisOutlined style={{ fontSize: 18, color: token.colorTextSecondary }} />}
              style={{ width: 38, height: 38 }}
              aria-label="More options"
            />
          </Dropdown>
        )}

        <Suspense fallback={null}>
          <UserDropdown isDark={isDark} getContainer={getPopupContainer} compact={isMobile} />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        {activityEverOpened && (
          <ActivityLogPanel open={activityOpen} onClose={() => setActivityOpen(false)} />
        )}
      </Suspense>
    </header>
  );
}

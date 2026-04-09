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
import { lazy, Suspense, useMemo } from "react";
import { useNavbarController } from "./useNavbarController";
import { CommandPaletteTrigger } from "./CommandPalette";

const { Text } = Typography;
const UserDropdown = lazy(() => import("./UserDropdown"));
const ActivityLogPanel = lazy(() => import("../../../activity/components/ActivityLogPanel"));

// ── Main Navbar ───────────────────────────────────────────────────────────────

export default function Navbar() {
  const ctrl = useNavbarController();
  const { token } = theme.useToken();

  const headerBackground =
    "linear-gradient(180deg, var(--shell-chrome-raised) 0%, var(--shell-chrome-bg) 100%)";
  const headerBorderColor = "var(--color-border-subtle)";

  const getPopupContainer = () => ctrl.containerRef.current || document.body;

  const overflowMenuItems = useMemo(() => {
    const items: { key: string; label: React.ReactNode; icon: React.ReactNode; onClick: () => void }[] = [];
    if (!ctrl.showExport) {
      items.push({
        key: "export",
        label: "Open Frontend",
        icon: <ExportOutlined />,
        onClick: () => window.open(ctrl.publicUrl, "_blank", "noopener,noreferrer"),
      });
    }
    if (!ctrl.showHistory) {
      items.push({
        key: "history",
        label: "Activity Log",
        icon: <HistoryOutlined />,
        onClick: ctrl.openActivity,
      });
    }
    if (!ctrl.showTheme) {
      items.push({
        key: "theme",
        label: ctrl.isDark ? "Light Mode" : "Dark Mode",
        icon: ctrl.isDark ? <BulbFilled /> : <BulbOutlined />,
        onClick: ctrl.toggleTheme,
      });
    }
    return items;
  }, [ctrl.showExport, ctrl.showHistory, ctrl.showTheme, ctrl.isDark, ctrl.publicUrl, ctrl.openActivity, ctrl.toggleTheme]);

  const breadcrumbItems = useMemo(() => {
    const items: { title: React.ReactNode }[] = [
      {
        title: (
          <button
            type="button"
            style={{
              appearance: "none",
              background: "transparent",
              border: 0,
              cursor: "pointer",
              padding: 0,
              minWidth: 0,
              maxWidth: 160,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: token.colorTextSecondary,
            }}
            onClick={() => ctrl.navigateHome(ctrl.adminUrl)}
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
          </button>
        ),
      },
    ];

    if (!ctrl.activeKey) return items;

    const topLevel = ctrl.menuItems.find((m) => m.slug === ctrl.activeKey);
    if (topLevel) {
      items.push({
        title: (
          <button
            type="button"
            style={{
              appearance: "none",
              background: "transparent",
              border: 0,
              cursor: "pointer",
              padding: 0,
              minWidth: 0,
              maxWidth: 180,
              display: "inline-block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: token.fontWeightStrong,
              color: token.colorTextHeading,
              verticalAlign: "middle",
            }}
            onClick={() => ctrl.navigate(topLevel.slug, ctrl.adminUrl)}
          >
            {topLevel.label}
          </button>
        ),
      });
      return items;
    }

    for (const parent of ctrl.menuItems) {
      const child = parent.children?.find((c) => c.slug === ctrl.activeKey);
      if (child) {
        items.push({
          title: (
            <button
              type="button"
              style={{
                appearance: "none",
                background: "transparent",
                border: 0,
                cursor: "pointer",
                padding: 0,
                minWidth: 0,
                maxWidth: 140,
                display: "inline-block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: token.colorTextSecondary,
                verticalAlign: "middle",
              }}
              onClick={() => ctrl.navigate(parent.slug, ctrl.adminUrl)}
            >
              {parent.label}
            </button>
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
          {ctrl.activeKey.replace(/-/g, " ")}
        </Text>
      ),
    });

    return items;
  }, [
    ctrl.activeKey,
    ctrl.adminUrl,
    ctrl.menuItems,
    ctrl.navigate,
    ctrl.navigateHome,
    token.colorTextHeading,
    token.colorTextSecondary,
    token.colorTextTertiary,
    token.fontWeightStrong,
  ]);

  const getToggleIcon = () => {
    if (ctrl.isMobile) return <MenuOutlined />;
    return ctrl.collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />;
  };

  return (
    <header
      ref={ctrl.containerRef}
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
        boxShadow: "none",
        transition: "background 300ms ease, border-color 300ms ease, box-shadow 300ms ease",
      }}
    >
      {/* Left: burger + breadcrumb (shrinks to show burger at minimum) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexShrink: 1,
          minWidth: "var(--shell-navbar-height, 64px)",
          overflow: "hidden",
        }}
      >
        <Button
          className="wp-react-ui-navbar-toggle"
          type="text"
          icon={getToggleIcon()}
          onClick={ctrl.toggleSidebar}
          title={
            ctrl.isMobile
              ? "Open menu"
              : ctrl.collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
          }
          aria-label={
            ctrl.isMobile
              ? "Open menu"
              : ctrl.collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
          }
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
        {!ctrl.isMobile && (
          <div
            className="wp-react-ui-navbar-breadcrumb"
            style={{ maxWidth: 240, minWidth: 0, overflow: "hidden", marginLeft: 16 }}
          >
            <Breadcrumb
              items={breadcrumbItems}
              separator={<Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>/</Text>}
            />
          </div>
        )}
      </div>

      {/* Center: search bar – grows to fill available space */}
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 8px",
        }}
      >
        {!ctrl.isMobile && <CommandPaletteTrigger compact={!ctrl.showSearchFull} />}
      </div>

      {/* Right: action buttons + user (fixed, won't shrink) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingRight: ctrl.isMobile ? 14 : 20,
          flexShrink: 0,
        }}
      >
        {ctrl.isMobile && <CommandPaletteTrigger compact />}

        {ctrl.mirroredAdminBarAction && (
          <Tooltip title={ctrl.mirroredAdminBarAction.title}>
            <Button
              className="wp-react-ui-navbar-icon-button"
              type="text"
              shape="circle"
              aria-label={ctrl.mirroredAdminBarAction.title}
              onClick={() => {
                const iframe = document.querySelector<HTMLIFrameElement>(
                  "#wp-react-ui-content iframe"
                );
                ctrl.triggerAdminBarAction(ctrl.mirroredAdminBarAction!.id) ||
                  ctrl.triggerAdminBarActionIn(
                    ctrl.mirroredAdminBarAction!.id,
                    iframe?.contentDocument ?? null
                  );
              }}
              style={{
                width: 38,
                height: 38,
                transition: "background-color 180ms ease, color 180ms ease",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              icon={
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                  dangerouslySetInnerHTML={{ __html: ctrl.mirroredAdminBarAction.html }}
                />
              }
            />
          </Tooltip>
        )}

        {ctrl.showExport && (
          <Tooltip title="Open frontend">
            <Button
              className="wp-react-ui-navbar-icon-button"
              type="text"
              shape="circle"
              icon={<ExportOutlined style={{ color: token.colorTextSecondary, fontSize: 18 }} />}
              onClick={(event) => {
                window.open(ctrl.publicUrl, "_blank", "noopener,noreferrer");
                event.currentTarget.blur();
              }}
              aria-label="Open frontend"
              style={{
                width: 38,
                height: 38,
                transition: "background-color 180ms ease, color 180ms ease",
              }}
            />
          </Tooltip>
        )}

        {ctrl.showHistory && (
          <Tooltip title="Activity log">
            <Button
              className="wp-react-ui-navbar-icon-button"
              type="text"
              shape="circle"
              icon={
                <HistoryOutlined
                  style={{
                    color: ctrl.activityOpen ? token.colorPrimary : token.colorTextSecondary,
                    fontSize: 18,
                  }}
                />
              }
              onClick={ctrl.openActivity}
              aria-label="Open activity log"
              style={{
                width: 38,
                height: 38,
                transition: "background-color 180ms ease, color 180ms ease",
              }}
            />
          </Tooltip>
        )}

        {ctrl.showTheme && (
          <Button
            className="wp-react-ui-navbar-icon-button"
            type="text"
            shape="circle"
            icon={
              ctrl.isDark ? (
                <BulbFilled style={{ color: token.colorPrimary, fontSize: 18 }} />
              ) : (
                <BulbOutlined style={{ color: token.colorTextSecondary, fontSize: 18 }} />
              )
            }
            onClick={ctrl.toggleTheme}
            title={ctrl.isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={ctrl.isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: 38,
              height: 38,
              transition: "background-color 180ms ease, color 180ms ease",
            }}
          />
        )}

        {overflowMenuItems.length > 0 && (
          <Dropdown
            menu={{ items: overflowMenuItems }}
            trigger={["click"]}
            getPopupContainer={getPopupContainer}
          >
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
          <UserDropdown isDark={ctrl.isDark} getContainer={getPopupContainer} compact={ctrl.isMobile} />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        {ctrl.activityEverOpened && (
          <ActivityLogPanel open={ctrl.activityOpen} onClose={ctrl.closeActivity} />
        )}
      </Suspense>
    </header>
  );
}

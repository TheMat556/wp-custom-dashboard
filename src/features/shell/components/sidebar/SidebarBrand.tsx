import { CloseOutlined } from "@ant-design/icons";
import { Button, Tooltip, Typography } from "antd";
import { useStore } from "zustand";
import { brandingStore } from "../../../branding/store/brandingStore";
import { useShellConfig } from "../../context/ShellConfigContext";
import { useTheme } from "../../context/ThemeContext";

const { Text } = Typography;

function getBrandClassNames(
  collapsed: boolean,
  showClose: boolean,
  hasClose: boolean,
  useLongLogo: boolean
) {
  return {
    outer: collapsed
      ? "wp-react-ui-sidebar-brand wp-react-ui-sidebar-brand--collapsed"
      : "wp-react-ui-sidebar-brand",
    inner:
      showClose && hasClose
        ? "wp-react-ui-sidebar-brand__inner wp-react-ui-sidebar-brand__inner--with-close"
        : "wp-react-ui-sidebar-brand__inner wp-react-ui-sidebar-brand__inner--centered",
    identity: collapsed
      ? "wp-react-ui-sidebar-brand__identity wp-react-ui-sidebar-brand__identity--collapsed"
      : "wp-react-ui-sidebar-brand__identity wp-react-ui-sidebar-brand__identity--centered",
    gap: collapsed || useLongLogo ? 0 : 12,
  };
}

export function SidebarBrand({
  collapsed,
  showClose,
  onClose,
}: {
  collapsed: boolean;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const { assetsUrl, branding, siteName } = useShellConfig();
  const brandingSettings = useStore(brandingStore, (state) => state.settings);
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === "dark";
  const fallbackLogoUrl = `${assetsUrl}logo.svg`;
  const lightLogoUrl = brandingSettings?.lightLogoUrl ?? branding?.logos.lightUrl ?? null;
  const darkLogoUrl = brandingSettings?.darkLogoUrl ?? branding?.logos.darkUrl ?? null;
  const useLongLogo =
    !collapsed && (brandingSettings?.useLongLogo ?? branding?.useLongLogo ?? false);
  const logoUrl = isDark
    ? (darkLogoUrl ?? lightLogoUrl ?? branding?.logos.defaultUrl ?? fallbackLogoUrl)
    : (lightLogoUrl ?? branding?.logos.defaultUrl ?? fallbackLogoUrl);

  const classNames = getBrandClassNames(collapsed, !!showClose, !!onClose, useLongLogo);

  const brandMark = (
    <div className="wp-react-ui-sidebar-brand__mark" aria-hidden="true">
      <img src={logoUrl} alt="" />
    </div>
  );

  return (
    <div className={classNames.outer}>
      <div className={classNames.inner}>
        <div className={classNames.identity} style={{ gap: classNames.gap }}>
          {collapsed ? (
            <Tooltip placement="right" title={`${siteName} · Operations Console`}>
              {brandMark}
            </Tooltip>
          ) : (
            brandMark
          )}

          {!collapsed && !useLongLogo ? (
            <div className="wp-react-ui-sidebar-brand__copy">
              <Text strong className="wp-react-ui-sidebar-brand__title">
                {siteName}
              </Text>
              <Text className="wp-react-ui-sidebar-brand__subtitle">Operations Console</Text>
            </div>
          ) : null}
        </div>

        {showClose && onClose ? (
          <Button
            type="text"
            className="wp-react-ui-shell-action wp-react-ui-shell-action--ghost"
            icon={<CloseOutlined />}
            onClick={onClose}
            aria-label="Close navigation menu"
          />
        ) : null}
      </div>
    </div>
  );
}

export default SidebarBrand;

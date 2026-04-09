import { CloseOutlined } from "@ant-design/icons";
import { Button, Flex, Typography } from "antd";
import { useStore } from "zustand";
import { brandingStore } from "../../../branding/store/brandingStore";
import { useShellConfig } from "../../context/ShellConfigContext";
import { useTheme } from "../../context/ThemeContext";

const { Text } = Typography;

export function Logo({
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

  return (
    <Flex
      align="center"
      style={{
        boxSizing: "border-box",
        height: "var(--shell-navbar-height, 64px)",
        padding: collapsed ? 0 : "0 16px 0 20px",
        justifyContent: collapsed ? "center" : "space-between",
        borderBottom: "1px solid var(--color-border-subtle)",
        flexShrink: 0,
      }}
    >
      <Flex
        align="center"
        justify={collapsed || useLongLogo ? "center" : "flex-start"}
        style={{ minWidth: 0, flex: collapsed ? "0 0 auto" : 1 }}
      >
        <img
          src={logoUrl}
          alt={`${siteName} logo`}
          style={{
            width: 36,
            height: 36,
            display: "block",
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
        {!collapsed && !useLongLogo && (
          <div style={{ marginLeft: 12, lineHeight: 1.2 }}>
            <Text
              strong
              style={{
                display: "block",
                fontSize: 17,
                letterSpacing: "-0.02em",
              }}
            >
              {siteName}
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
          aria-label="Close navigation menu"
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

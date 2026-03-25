import { CloseOutlined } from "@ant-design/icons";
import { Button, Flex, Typography, theme } from "antd";
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
  const { theme: appTheme } = useTheme();
  const { token } = theme.useToken();
  const isDark = appTheme === "dark";
  const fallbackLogoUrl = `${assetsUrl}logo.svg`;
  const logoUrl = isDark
    ? (branding?.logos.darkUrl ??
      branding?.logos.lightUrl ??
      branding?.logos.defaultUrl ??
      fallbackLogoUrl)
    : (branding?.logos.lightUrl ?? branding?.logos.defaultUrl ?? fallbackLogoUrl);

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

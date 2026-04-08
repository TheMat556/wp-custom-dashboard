import { EditOutlined, LogoutOutlined } from "@ant-design/icons";
import { Avatar, Dropdown, Flex, type MenuProps, Typography, theme } from "antd";
import { useMemo } from "react";
import { useShellConfig } from "../../context/ShellConfigContext";
import { getAdminBaseUrl, navigate } from "../../utils/wp";

const { Text } = Typography;

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AU"
  );
}

export default function UserDropdown({
  isDark,
  getContainer,
  compact = false,
}: {
  isDark: boolean;
  getContainer: () => HTMLElement;
  compact?: boolean;
}) {
  const { adminUrl, logoutUrl, user } = useShellConfig();
  const { token } = theme.useToken();

  const displayUser = useMemo(
    () => ({
      name: user.name.trim() || "Admin User",
      role: user.role || "Super Admin",
      initials: getInitials(user.name.trim() || "Admin User"),
    }),
    [user.name, user.role]
  );

  const avatarBackground = isDark ? token.colorPrimaryBgHover : token.colorPrimaryBg;
  const avatarColor = isDark ? token.colorPrimaryTextHover : token.colorPrimaryText;

  const menuItems: MenuProps["items"] = [
    {
      key: "user-header",
      type: "group",
      label: (
        <Flex gap={12} align="center" style={{ padding: "8px 4px" }}>
          <Avatar
            size={40}
            style={{
              backgroundColor: avatarBackground,
              color: avatarColor,
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {displayUser.initials}
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
              {displayUser.name}
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
              {displayUser.role}
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
      onClick: () => navigate("profile.php", adminUrl),
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Log Out",
      danger: true,
      onClick: () => {
        window.location.href =
          logoutUrl || `${getAdminBaseUrl(adminUrl)}/wp-login.php?action=logout`;
      },
    },
  ];

  return (
    <Dropdown
      menu={{
        items: menuItems,
        style: { minWidth: 220, borderRadius: token.borderRadiusLG },
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
          padding: compact ? 0 : "6px 10px",
          borderRadius: token.borderRadiusLG,
          color: token.colorText,
          transition: "background-color 180ms ease, color 180ms ease",
        }}
        className="wp-react-ui-user-trigger"
      >
        {!compact && (
          <div style={{ textAlign: "right", minWidth: 0, maxWidth: 110, overflow: "hidden" }}>
            <Text
              strong
              style={{
                display: "block",
                fontSize: 13,
                lineHeight: 1.3,
                color: token.colorText,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayUser.name}
            </Text>
            <Text style={{ fontSize: 11, color: token.colorTextSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              {displayUser.role}
            </Text>
          </div>
        )}
        <Avatar
          size={38}
          style={{
            backgroundColor: avatarBackground,
            color: avatarColor,
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
            boxShadow: `inset 0 0 0 1px ${token.colorBorderSecondary}`,
          }}
        >
          {displayUser.initials}
        </Avatar>
      </Flex>
    </Dropdown>
  );
}

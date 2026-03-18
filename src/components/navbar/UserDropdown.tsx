import {
  EditOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import {
  Dropdown,
  Avatar,
  Flex,
  Typography,
  theme,
  type MenuProps,
} from "antd";
import { useMemo } from "react";
import { getAdminBaseUrl } from "../../utils/wp";
import "../../types/wp";

const { Text } = Typography;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWpUser() {
  const wp = window.wpReactUi;
  const name = wp?.user?.name?.trim() || "Admin User";
  const role = wp?.user?.role ?? "Super Admin";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w: string) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AU";
  return { name, role, initials };
}

// ── User Dropdown ─────────────────────────────────────────────────────────────

export default function UserDropdown({
  isDark,
  getContainer,
}: {
  isDark: boolean;
  getContainer: () => HTMLElement;
}) {
  const user = useMemo(() => getWpUser(), []);
  const { token } = theme.useToken();

  const avatarBackground = isDark
    ? token.colorPrimaryBgHover
    : token.colorPrimaryBg;
  const avatarColor = isDark ? token.colorPrimaryTextHover : token.colorPrimaryText;

  const goEditProfile = () => {
    const base = getAdminBaseUrl();
    window.location.href = `${base}/profile.php`;
  };

  const goLogout = () => {
    const wp = window.wpReactUi;
    const url =
      wp?.logoutUrl ?? `${getAdminBaseUrl()}/wp-login.php?action=logout`;
    window.location.href = url;
  };

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
            {user.initials}
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
              {user.name}
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
              {user.role}
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
      onClick: goEditProfile,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Log Out",
      danger: true,
      onClick: goLogout,
    },
  ];

  return (
    <Dropdown
      menu={{
        items: menuItems,
        style: { minWidth: 200 },
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
          padding: "6px 10px",
          borderRadius: token.borderRadiusLG,
          color: token.colorText,
          transition: "background-color 180ms ease, color 180ms ease",
        }}
        className="wp-react-ui-user-trigger"
      >
        <div style={{ textAlign: "right" }}>
          <Text
            strong
            style={{
              display: "block",
              fontSize: 13,
              lineHeight: 1.3,
              color: token.colorText,
            }}
          >
            {user.name}
          </Text>
          <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
            {user.role}
          </Text>
        </div>
        <Avatar
          size={38}
          style={{
            backgroundColor: avatarBackground,
            color: avatarColor,
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {user.initials}
        </Avatar>
      </Flex>
    </Dropdown>
  );
}

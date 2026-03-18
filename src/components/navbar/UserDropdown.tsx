import {
  UserOutlined,
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
  const name = wp?.user?.name ?? "Admin User";
  const role = wp?.user?.role ?? "Super Admin";
  const avatar = wp?.user?.avatar ?? null;
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { name, role, initials, avatar };
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
            src={user.avatar}
            style={{
              backgroundColor: isDark ? "#1e1b4b" : "#ede9fe",
              color: isDark ? "#818cf8" : "#4f46e5",
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {user.initials || <UserOutlined />}
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
          transition: "background-color 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDark
            ? token.colorBgTextHover
            : token.colorBgTextHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div style={{ textAlign: "right" }}>
          <Text
            strong
            style={{ display: "block", fontSize: 13, lineHeight: 1.3 }}
          >
            {user.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {user.role}
          </Text>
        </div>
        <Avatar
          size={38}
          src={user.avatar}
          style={{
            backgroundColor: isDark ? "#1e1b4b" : "#ede9fe",
            color: isDark ? "#818cf8" : "#4f46e5",
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {user.initials || <UserOutlined />}
        </Avatar>
      </Flex>
    </Dropdown>
  );
}

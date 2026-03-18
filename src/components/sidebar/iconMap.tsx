import {
  AppstoreOutlined,
  SettingOutlined,
  UserOutlined,
  FileOutlined,
  DashboardOutlined,
  ShopOutlined,
  TagOutlined,
  TeamOutlined,
  BarChartOutlined,
  BellOutlined,
  LockOutlined,
  ToolOutlined,
  GlobalOutlined,
  InboxOutlined,
  PictureOutlined,
  CommentOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

export const dashiconMap: Record<string, ReactNode> = {
  "dashicons-dashboard": <DashboardOutlined />,
  "dashicons-admin-post": <FileOutlined />,
  "dashicons-admin-media": <PictureOutlined />,
  "dashicons-admin-links": <LinkOutlined />,
  "dashicons-admin-page": <FileOutlined />,
  "dashicons-admin-comments": <CommentOutlined />,
  "dashicons-admin-appearance": <AppstoreOutlined />,
  "dashicons-admin-plugins": <AppstoreOutlined />,
  "dashicons-admin-users": <TeamOutlined />,
  "dashicons-admin-tools": <ToolOutlined />,
  "dashicons-admin-settings": <SettingOutlined />,
  "dashicons-admin-network": <GlobalOutlined />,
  "dashicons-admin-generic": <SettingOutlined />,
  "dashicons-admin-home": <DashboardOutlined />,
  "dashicons-cart": <ShopOutlined />,
  "dashicons-tag": <TagOutlined />,
  "dashicons-groups": <TeamOutlined />,
  "dashicons-chart-bar": <BarChartOutlined />,
  "dashicons-bell": <BellOutlined />,
  "dashicons-lock": <LockOutlined />,
  "dashicons-inbox": <InboxOutlined />,
  "dashicons-businessman": <UserOutlined />,
};

export function resolveIcon(icon?: string): ReactNode {
  if (!icon) return <AppstoreOutlined />;

  if (icon.startsWith("data:image/svg+xml;base64,"))
    return (
      <img
        src={icon}
        alt=""
        aria-hidden
        style={{ width: 16, height: 16, display: "block", flexShrink: 0 }}
      />
    );

  if (icon.startsWith("dashicons-"))
    return dashiconMap[icon] ?? <AppstoreOutlined />;

  return (
    <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1 }}>
      {icon.slice(0, 2)}
    </span>
  );
}

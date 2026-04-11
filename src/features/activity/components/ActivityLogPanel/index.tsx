import {
  ClockCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Drawer, Empty, Flex, Select, Spin, Tag, Timeline, Typography, theme } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "zustand";
import type { ActivityEntry } from "../../services/activityApi";
import { loadActivity, setActivityFilters } from "../../store/activityActions";
import { activityStore } from "../../store/activityStore";

const { Text, Title } = Typography;

const ACTION_LABELS: Record<string, string> = {
  post_created: "Created",
  post_updated: "Updated",
  post_deleted: "Deleted",
  comment_created: "New comment",
  comment_status_changed: "Comment status",
  user_created: "User registered",
  user_deleted: "User deleted",
  user_login: "Logged in",
  plugin_activated: "Plugin activated",
  plugin_deactivated: "Plugin deactivated",
  theme_switched: "Theme switched",
  option_updated: "Setting updated",
};

const ACTION_COLORS: Record<string, string> = {
  post_created: "green",
  post_updated: "blue",
  post_deleted: "red",
  comment_created: "cyan",
  comment_status_changed: "orange",
  user_created: "green",
  user_deleted: "red",
  user_login: "geekblue",
  plugin_activated: "green",
  plugin_deactivated: "orange",
  theme_switched: "purple",
  option_updated: "gold",
};

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "post_created", label: "Post created" },
  { value: "post_updated", label: "Post updated" },
  { value: "post_deleted", label: "Post deleted" },
  { value: "comment_created", label: "Comment created" },
  { value: "comment_status_changed", label: "Comment status" },
  { value: "user_created", label: "User registered" },
  { value: "user_deleted", label: "User deleted" },
  { value: "user_login", label: "User login" },
  { value: "plugin_activated", label: "Plugin activated" },
  { value: "plugin_deactivated", label: "Plugin deactivated" },
  { value: "theme_switched", label: "Theme switched" },
  { value: "option_updated", label: "Setting updated" },
];

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(`${dateStr}Z`).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(date).toLocaleDateString();
}

function EntryItem({ entry }: { entry: ActivityEntry }) {
  const { token } = theme.useToken();

  return (
    <Flex vertical gap={2}>
      <Flex gap={8} align="center" wrap>
        <Tag color={ACTION_COLORS[entry.action] ?? "default"} style={{ margin: 0 }}>
          {ACTION_LABELS[entry.action] ?? entry.action}
        </Tag>
        <Text strong style={{ fontSize: 13 }}>
          {entry.object_title}
        </Text>
      </Flex>
      <Flex gap={12} align="center">
        <Text type="secondary" style={{ fontSize: 12 }}>
          <UserOutlined style={{ marginRight: 4 }} />
          {entry.user_name}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {getRelativeTime(entry.created_at)}
        </Text>
      </Flex>
      {entry.details && (
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            background: token.colorFillAlter,
            padding: "2px 8px",
            borderRadius: token.borderRadiusSM,
            display: "inline-block",
            maxWidth: "100%",
          }}
        >
          {entry.details}
        </Text>
      )}
    </Flex>
  );
}

export default function ActivityLogPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { token } = theme.useToken();
  const entries = useStore(activityStore, (s) => s.entries);
  const total = useStore(activityStore, (s) => s.total);
  const page = useStore(activityStore, (s) => s.page);
  const perPage = useStore(activityStore, (s) => s.perPage);
  const loading = useStore(activityStore, (s) => s.loading);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    if (!open) return;
    void loadActivity();
  }, [open]);

  const handleRefresh = useCallback(() => {
    void loadActivity();
  }, []);

  const handleActionFilter = useCallback((value: string) => {
    setActionFilter(value);
    setActivityFilters({ action: value || undefined, page: 1 });
  }, []);

  const handleLoadMore = useCallback(() => {
    void loadActivity({ page: page + 1 });
  }, [page]);

  const hasMore = page * perPage < total;

  return (
    <Drawer
      title={
        <Flex align="center" justify="space-between">
          <Title level={5} style={{ margin: 0 }}>
            Activity Log
          </Title>
          <Button
            type="text"
            icon={<ReloadOutlined spin={loading} />}
            onClick={handleRefresh}
            size="small"
            aria-label="Refresh activity log"
          />
        </Flex>
      }
      open={open}
      onClose={onClose}
      width={420}
      styles={{
        content: { background: "var(--shell-chrome-bg)" },
        header: {
          background: "var(--shell-chrome-raised)",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        },
        body: {
          padding: "12px 20px",
          background: "var(--shell-chrome-bg)",
        },
      }}
    >
      <Flex gap={8} style={{ marginBottom: 16 }}>
        <Select
          style={{ flex: 1 }}
          value={actionFilter}
          onChange={handleActionFilter}
          options={ACTION_FILTER_OPTIONS}
          prefix={<FilterOutlined />}
          size="small"
        />
      </Flex>

      {loading && entries.length === 0 ? (
        <Flex align="center" justify="center" style={{ padding: 40 }}>
          <Spin />
        </Flex>
      ) : entries.length === 0 ? (
        <Empty description="No activity recorded yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <Timeline
            items={entries.map((entry, i) => ({
              key: `${entry.created_at}-${i}`,
              dot: <ClockCircleOutlined style={{ color: token.colorTextTertiary }} />,
              children: <EntryItem entry={entry} />,
            }))}
          />
          {hasMore && (
            <Flex justify="center" style={{ marginTop: 8 }}>
              <Button onClick={handleLoadMore} loading={loading} size="small">
                Load more
              </Button>
            </Flex>
          )}
          <Text
            type="secondary"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: 11,
              marginTop: 12,
            }}
          >
            Showing {entries.length} of {total} entries
          </Text>
        </>
      )}
    </Drawer>
  );
}

import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Avatar, Button, Tag, Tooltip, Typography } from "antd";
import type { ChatBootstrapData } from "../../services/chatConversationApi";
import { getInitials, hashDomainColor } from "../../utils/chatFormatters";
import styles from "./ConversationHeader.module.css";

type ChatThread = ChatBootstrapData["threads"][number];

interface ConversationHeaderProps {
  thread: ChatThread | null;
  role: "owner" | "customer";
  chatEnabled: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  showRefresh: boolean;
}

export function ConversationHeader({
  thread,
  role,
  chatEnabled,
  onRefresh,
  isLoading,
  showRefresh,
}: ConversationHeaderProps) {
  const displayName = thread ? (thread.customerName ?? thread.domain) : "No conversation selected";
  const initials = thread ? getInitials(thread.customerName ?? thread.domain) : "?";
  const avatarColor = thread ? hashDomainColor(thread.domain) : "#9ca3af";

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <Avatar
          size={44}
          style={{ backgroundColor: avatarColor, fontSize: 15, fontWeight: 700, flexShrink: 0 }}
        >
          {initials}
        </Avatar>

        <div className={styles.titleGroup}>
          <Typography.Text strong className={styles.title}>
            {displayName}
          </Typography.Text>
          <Typography.Text className={styles.subtitle}>
            {thread
              ? thread.customerEmail ?? thread.domain
              : "Select a thread from the left rail to begin"}
          </Typography.Text>
          {thread && (
            <div className={styles.metaRow}>
              <Tag bordered={false} className={styles.tag}>
                {thread.status === "open" ? "Open thread" : "Closed thread"}
              </Tag>
              {chatEnabled && (
                <Tag bordered={false} className={styles.tag}>
                  Chat enabled
                </Tag>
              )}
              <Tag bordered={false} className={styles.tag}>
                {role}
              </Tag>
            </div>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <Tooltip title="Search">
          <Button type="text" size="large" icon={<SearchOutlined />} aria-label="Search conversation" />
        </Tooltip>
        {showRefresh && (
          <Button
            type="default"
            icon={<ReloadOutlined spin={isLoading} />}
            onClick={onRefresh}
            aria-label="Refresh conversation"
          >
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
}

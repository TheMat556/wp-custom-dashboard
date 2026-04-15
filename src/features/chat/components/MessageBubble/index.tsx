import { Avatar, Typography } from "antd";
import type { ChatBootstrapData } from "../../services/chatConversationApi";
import { formatDateTime, getInitials, hashDomainColor } from "../../utils/chatFormatters";
import styles from "./MessageBubble.module.css";

type ChatMessage = ChatBootstrapData["messages"][number];

interface MessageBubbleProps {
  message: ChatMessage;
  viewerRole: "owner" | "customer";
  authorName: string;
}

export function MessageBubble({ message, viewerRole, authorName }: MessageBubbleProps) {
  const isOwn = message.authorRole === viewerRole;
  const isSystem = message.authorRole === "system";

  if (isSystem) {
    return (
      <div className={styles.system} role="note">
        <Typography.Text className={styles.systemText}>{message.message}</Typography.Text>
      </div>
    );
  }

  const initials = getInitials(authorName);
  const avatarColor = hashDomainColor(authorName);
  const formattedTime = formatDateTime(message.createdAt);

  return (
    <div className={`${styles.row} ${isOwn ? styles.ownRow : styles.otherRow}`}>
      {!isOwn && (
        <Avatar
          size={28}
          style={{ backgroundColor: avatarColor, fontSize: 11, fontWeight: 600, flexShrink: 0 }}
          aria-hidden="true"
        >
          {initials}
        </Avatar>
      )}

      <div className={styles.bubbleGroup}>
        {!isOwn && <Typography.Text className={styles.author}>{authorName}</Typography.Text>}
        <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble}`}>
          <Typography.Text className={styles.messageText}>{message.message}</Typography.Text>
          <div className={styles.bubbleMeta}>
            <time dateTime={message.createdAt} className={styles.timestamp}>
              {formattedTime}
            </time>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Empty } from "antd";
import { useEffect, useRef } from "react";
import type { ChatBootstrapData } from "../../services/chatConversationApi";
import { MessageBubble } from "../MessageBubble";
import styles from "./MessageList.module.css";

type ChatMessage = ChatBootstrapData["messages"][number];
type ChatThread = ChatBootstrapData["threads"][number];

interface MessageListProps {
  messages: ChatMessage[];
  thread: ChatThread | null;
  viewerRole: "owner" | "customer";
}

export function MessageList({ messages, thread, viewerRole }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageCount = messages.length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  if (!thread) {
    return (
      <div className={styles.emptyConversation} role="status">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Select a conversation to start reading"
        />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={styles.emptyConversation} role="status">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No messages yet" />
      </div>
    );
  }

  return (
    <div
      className={styles.messageList}
      role="log"
      aria-label="Conversation messages"
      aria-live="polite"
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          viewerRole={viewerRole}
          authorName={msg.authorName}
        />
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}

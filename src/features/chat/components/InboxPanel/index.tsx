import { CustomerServiceOutlined, ReloadOutlined } from "@ant-design/icons";
import { type KeyboardEvent, useCallback, useRef, useState } from "react";
import type { ChatBootstrapData } from "../../services/chatConversationApi";
import { formatRelativeTime, getInitials, hashDomainColor } from "../../utils/chatFormatters";
import styles from "./InboxPanel.module.css";

type ChatThread = ChatBootstrapData["threads"][number];

interface InboxPanelProps {
  threads: ChatThread[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function InboxPanel({
  threads,
  selectedId,
  onSelect,
  onRefresh,
  isLoading,
}: InboxPanelProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(focusedIndex + 1, threads.length - 1);
        setFocusedIndex(next);
        rowRefs.current[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(focusedIndex - 1, 0);
        setFocusedIndex(prev);
        rowRefs.current[prev]?.focus();
      }
    },
    [focusedIndex, threads.length]
  );

  return (
    <div className={styles.inbox}>
      <div className={styles.inboxHeader}>
        <h2 className={styles.inboxTitle}>Inbox</h2>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh conversations"
        >
          <ReloadOutlined spin={isLoading} />
          Refresh
        </button>
      </div>

      <div
        className={styles.threadList}
        role="listbox"
        aria-label="Conversations"
        onKeyDown={handleListKeyDown}
      >
        {threads.length === 0 ? (
          <InboxEmptyState />
        ) : (
          threads.map((thread, index) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              isSelected={thread.id === selectedId}
              animationDelay={index * 40}
              onClick={() => onSelect(thread.id)}
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ── ThreadRow ────────────────────────────────────────────────────────────── */

interface ThreadRowProps {
  thread: ChatThread;
  isSelected: boolean;
  animationDelay: number;
  onClick: () => void;
  ref: (el: HTMLDivElement | null) => void;
}

function ThreadRow({ thread, isSelected, animationDelay, onClick, ref }: ThreadRowProps) {
  const initials = getInitials(thread.customerName ?? thread.domain, "C");
  const avatarBg = hashDomainColor(thread.domain);
  const preview = thread.lastMessagePreview ?? "No messages yet — start the conversation.";

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      ref={ref}
      className={`${styles.threadRow} ${isSelected ? styles.threadRowActive : ""}`}
      role="option"
      aria-selected={isSelected}
      aria-label={`Conversation with ${thread.domain}`}
      tabIndex={isSelected ? 0 : -1}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.avatar} style={{ background: avatarBg }} aria-hidden="true">
        {initials}
      </div>

      <div className={styles.threadMeta}>
        <div className={styles.threadTop}>
          <span className={styles.threadDomain}>{thread.domain}</span>
          <time className={styles.threadTime} dateTime={thread.lastMessageAt}>
            {formatRelativeTime(thread.lastMessageAt)}
          </time>
        </div>
        <p className={styles.threadPreview}>{preview}</p>
      </div>

      {thread.status === "open" && (
        <span className={styles.unreadDot} aria-label="Active conversation" role="img" />
      )}
    </div>
  );
}

/* ── InboxEmptyState ──────────────────────────────────────────────────────── */

function InboxEmptyState() {
  return (
    <div className={styles.emptyState} role="status">
      <span className={styles.emptyIcon}>
        <CustomerServiceOutlined style={{ fontSize: 56 }} />
      </span>
      <h3 className={styles.emptyTitle}>No conversations yet</h3>
      <p className={styles.emptySubtitle}>Customer conversations will appear here</p>
    </div>
  );
}

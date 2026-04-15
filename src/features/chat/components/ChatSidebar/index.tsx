import {
  MessageOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Empty, Input, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatBootstrapData } from "../../services/chatConversationApi";
import { formatRelativeTime, getInitials, hashDomainColor } from "../../utils/chatFormatters";
import styles from "./ChatSidebar.module.css";

type ChatThread = ChatBootstrapData["threads"][number];

interface ChatSidebarProps {
  threads: ChatThread[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNavigate: (view: "chat" | "settings") => void;
  role: "owner" | "customer";
  collapsed: boolean;
  canManage: boolean;
  serverConfigured: boolean;
  hasUnsavedSettings: boolean;
  settingsOpen: boolean;
}

export function ChatSidebar({
  threads,
  selectedId,
  onSelect,
  onNavigate,
  role,
  collapsed,
  canManage,
  hasUnsavedSettings,
  settingsOpen,
}: ChatSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return threads;
    return threads.filter(
      (thread) =>
        thread.domain.toLowerCase().includes(value) ||
        (thread.customerName?.toLowerCase().includes(value) ?? false) ||
        (thread.customerEmail?.toLowerCase().includes(value) ?? false)
    );
  }, [threads, query]);

  const selectedIndex = filtered.findIndex((thread) => thread.id === selectedId);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = selectedIndex < filtered.length - 1 ? selectedIndex + 1 : 0;
        onSelect(filtered[next].id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = selectedIndex > 0 ? selectedIndex - 1 : filtered.length - 1;
        onSelect(filtered[prev].id);
      }
    },
    [filtered, selectedIndex, onSelect]
  );

  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return;
    const rows = listRef.current.querySelectorAll("[data-thread-row]");
    rows[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.header}>
        <div className={styles.sLogo} aria-hidden="true">S</div>
        {!collapsed && (
          <div className={styles.headerCopy}>
            <Typography.Text strong className={styles.sidebarTitle}>
              Support Chat
            </Typography.Text>
            <Typography.Text className={styles.headerSubtitle}>
              {role === "owner" ? "All active chat threads" : "Your site support thread"}
            </Typography.Text>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className={styles.searchBar}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a conversation"
            aria-label="Search conversations"
          />
        </div>
      )}

      <div
        ref={listRef}
        className={styles.threadList}
        role="listbox"
        aria-label="Conversations"
        tabIndex={filtered.length > 0 ? 0 : -1}
        onKeyDown={handleKeyDown}
      >
        {filtered.length === 0 ? (
          <div className={styles.emptyState} role="status">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={query ? "No matching conversations" : "No conversations yet"}
            />
          </div>
        ) : (
          filtered.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              collapsed={collapsed}
              isSelected={thread.id === selectedId}
              onClick={() => onSelect(thread.id)}
            />
          ))
        )}
      </div>

      <div className={styles.footer}>
        <Tooltip title={collapsed ? "Chat" : undefined} placement="right">
          <Button
            block
            type={!settingsOpen ? "primary" : collapsed ? "text" : "default"}
            icon={<MessageOutlined />}
            onClick={() => onNavigate("chat")}
            className={`${styles.navButton} ${!settingsOpen ? styles.navButtonActive : ""}`}
            aria-label="View chat"
            aria-pressed={!settingsOpen}
          >
            {!collapsed ? "Chat" : null}
          </Button>
        </Tooltip>

        {canManage && (
          <div className={styles.settingsBtnWrap}>
            {hasUnsavedSettings && <span className={styles.badgeDot} />}
            <Tooltip title={collapsed ? "Settings" : undefined} placement="right">
              <Button
                block
                type={settingsOpen ? "primary" : collapsed ? "text" : "default"}
                icon={<SettingOutlined />}
                onClick={() => onNavigate("settings")}
                className={`${styles.navButton} ${settingsOpen ? styles.navButtonActive : ""}`}
                aria-label="Open chat settings"
                aria-pressed={settingsOpen}
              >
                {!collapsed ? "Settings" : null}
              </Button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}

interface ThreadRowProps {
  thread: ChatThread;
  collapsed: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function ThreadRow({ thread, collapsed, isSelected, onClick }: ThreadRowProps) {
  const initials = getInitials(thread.customerName ?? thread.domain);
  const avatarColor = hashDomainColor(thread.domain);
  const displayName = thread.customerName ?? thread.domain;
  const preview = thread.lastMessagePreview ?? "No messages yet";
  const relativeTime = formatRelativeTime(thread.lastMessageAt);
  const isOpen = thread.status === "open";

  const row = (
    <div
      data-thread-row
      className={`${styles.threadRow} ${isSelected ? styles.selected : ""} ${
        collapsed ? styles.threadRowCollapsed : ""
      }`}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.avatarWrap}>
        <Avatar
          size={32}
          style={{
            backgroundColor: avatarColor,
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {initials}
        </Avatar>
        {isOpen && <span className={styles.activityDot} aria-hidden />}
      </div>

      {!collapsed && (
        <div className={styles.threadMeta}>
          <div className={styles.threadTop}>
            <Typography.Text strong ellipsis className={styles.threadTitle}>
              {displayName}
            </Typography.Text>
            <Typography.Text className={styles.threadTime}>{relativeTime}</Typography.Text>
          </div>
          <div className={styles.threadBottom}>
            <Typography.Text ellipsis className={styles.threadPreview}>
              {preview}
            </Typography.Text>
            {isOpen && <span className={styles.threadStatus}>Live</span>}
          </div>
        </div>
      )}
    </div>
  );

  return collapsed ? <Tooltip title={displayName}>{row}</Tooltip> : row;
}

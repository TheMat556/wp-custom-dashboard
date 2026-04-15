import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Avatar, Button, ConfigProvider, Typography } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageCanvas from "../../../../shared/ui/PageCanvas";
import { createT } from "../../../../utils/i18n";
import { useFeature, useLicense, useLicenseServerSettings } from "../../../license";
import { useShellConfig } from "../../../shell/context/ShellConfigContext";
import { useTheme } from "../../../shell/context/ThemeContext";
import { createChatTheme } from "../../chatTheme";
import { useChatPolling, useChatProviderInit } from "../../hooks";
import type { ChatBootstrapData, ChatSendData } from "../../services/chatConversationApi";
import { getInitials, hashDomainColor } from "../../utils/chatFormatters";
import { ChatSettingsPanel } from "../ChatSettingsPanel";
import { ChatSidebar } from "../ChatSidebar";
import { ConversationPanel } from "../ConversationPanel";
import type { ChatBannerStatus } from "../StatusBanner";
import { StatusBanner } from "../StatusBanner";
import styles from "./ChatPage.module.css";

type ChatThread = ChatBootstrapData["threads"][number];
type ChatMessage = ChatBootstrapData["messages"][number];

function isGraceState(status: string, graceDaysRemaining: number) {
  return status === "grace" || (status === "expired" && graceDaysRemaining > 0);
}

function sortThreads(threads: ChatThread[]) {
  return [...threads].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

function upsertThread(threads: ChatThread[], thread: ChatThread) {
  return sortThreads([...threads.filter((item) => item.id !== thread.id), thread]);
}

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<number, ChatMessage>();
  for (const msg of existing) byId.set(msg.id, msg);
  for (const msg of incoming) byId.set(msg.id, msg);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function errorToBannerStatus(
  error: string,
  sending: boolean,
  onRetry: () => void
): ChatBannerStatus {
  const lower = error.toLowerCase();
  if (lower.includes("session") || lower.includes("expired")) {
    return { type: "session_expired", message: error };
  }
  if (sending) return { type: "send_failed", message: error, onRetry };
  return { type: "chat_unavailable", message: error };
}

function applyMessageSent(
  current: ChatBootstrapData | null,
  threadId: number,
  result: ChatSendData
): ChatBootstrapData | null {
  if (!current) return current;
  const threads = upsertThread(current.threads, result.thread);
  if (current.selectedThreadId !== threadId) {
    return { ...current, role: result.role, threads };
  }
  return {
    ...current,
    role: result.role,
    threads,
    messages: mergeMessages(current.messages, [result.message]),
  };
}

export default function ChatPage() {
  const sidebarId = "wp-react-ui-chat-sidebar";
  const config = useShellConfig();
  const license = useLicense();
  const chatEnabled = useFeature("chat");
  const service = useChatProviderInit({ restUrl: config.restUrl, nonce: config.nonce });
  const canManage = config.user.canManageOptions;

  const { theme: currentTheme } = useTheme();
  const isDark = currentTheme === "dark";
  const chatThemeConfig = useMemo(() => createChatTheme(isDark), [isDark]);
  const t = useMemo(() => createT(config.locale ?? "en_US"), [config.locale]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const update = (matches: boolean) => {
      setIsMobile(matches);
      if (!matches) setSidebarCollapsed(false);
    };
    const handler = (e: MediaQueryListEvent) => update(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const [conversation, setConversation] = useState<ChatBootstrapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pollBackoffSeconds, setPollBackoffSeconds] = useState(0);
  const pollBackoffRef = useRef(0);

  const bootstrapRequestRef = useRef(0);
  const pollRequestRef = useRef(0);
  const sendRequestRef = useRef(0);

  // Stable ref so handlePoll never captures stale conversation
  const conversationRef = useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  const inGrace = isGraceState(license.status, license.graceDaysRemaining);
  const currentRole = conversation?.role ?? (license.role === "owner" ? "owner" : "customer");

  const selectedThread = useMemo(
    () =>
      conversation?.selectedThreadId
        ? (conversation.threads.find((item) => item.id === conversation.selectedThreadId) ?? null)
        : null,
    [conversation]
  );

  // ── Banner status derivation ───────────────────────────────────────────────

  const bannerStatus = useMemo<ChatBannerStatus>(() => {
    if (bannerDismissed) return { type: "idle" };
    if (!chatEnabled) return { type: "locked" };
    if (inGrace) return { type: "grace", daysRemaining: license.graceDaysRemaining };
    if (error) return errorToBannerStatus(error, sending, () => setError(null));
    if (loading && !conversation) return { type: "connecting" };
    return { type: "idle" };
  }, [
    bannerDismissed,
    chatEnabled,
    inGrace,
    error,
    loading,
    conversation,
    sending,
    license.graceDaysRemaining,
  ]);

  useEffect(() => {
    if (error || !chatEnabled || inGrace) setBannerDismissed(false);
  }, [error, chatEnabled, inGrace]);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  const loadConversation = useCallback(
    async (selectedThreadId?: number | null) => {
      if (!chatEnabled) return;
      setLoading(true);
      setError(null);
      const requestId = ++bootstrapRequestRef.current;
      const args = selectedThreadId ? { selectedThreadId } : {};
      try {
        const data = await service.fetchBootstrap(args);
        if (requestId === bootstrapRequestRef.current) setConversation(data);
      } catch (err) {
        if (requestId === bootstrapRequestRef.current) {
          setError(toErrorMessage(err, "Failed to load chat."));
        }
      } finally {
        if (requestId === bootstrapRequestRef.current) setLoading(false);
      }
    },
    [chatEnabled, service]
  );

  useEffect(() => {
    if (!chatEnabled) {
      bootstrapRequestRef.current++;
      sendRequestRef.current++;
      setLoading(false);
      setError(null);
      setConversation(null);
      return;
    }
    void loadConversation();
  }, [chatEnabled, loadConversation]);

  // ── Polling ────────────────────────────────────────────────────────────────
  // handlePoll only depends on `service` — conversation is read via ref so the
  // polling interval is never reset on state updates (fixes the reset loop).

  const handlePoll = useCallback(async () => {
    const conv = conversationRef.current;
    if (!conv?.selectedThreadId) return;
    const threadId = conv.selectedThreadId;
    const afterMessageId = conv.messages.at(-1)?.id ?? 0;
    const requestId = ++pollRequestRef.current;
    try {
      const update = await service.fetchPoll({ selectedThreadId: threadId, afterMessageId });
      if (requestId !== pollRequestRef.current) return;
      if (pollBackoffRef.current > 0) {
        pollBackoffRef.current = 0;
        setPollBackoffSeconds(0);
      }
      setError(null);
      setConversation((current) => {
        if (!current || current.selectedThreadId !== threadId) return current;
        return {
          ...current,
          role: update.role,
          threads: sortThreads(update.threads),
          messages: mergeMessages(current.messages, update.messages),
          pollIntervalSeconds: update.pollIntervalSeconds,
        };
      });
    } catch (pollError) {
      if (requestId !== pollRequestRef.current) return;
      const msg = pollError instanceof Error ? pollError.message : "Failed to refresh chat.";
      const isRateLimit =
        msg.toLowerCase().includes("too many") || msg.toLowerCase().includes("rate limit");
      if (isRateLimit) {
        const match = msg.match(/(\d+)\s*second/i);
        const backoffSecs = match ? parseInt(match[1], 10) : 60;
        pollBackoffRef.current = backoffSecs;
        setPollBackoffSeconds(backoffSecs);
        // Don't show banner for transient rate limits
      } else {
        setError(msg);
      }
    }
  }, [service]);

  useChatPolling({
    pollIntervalSeconds: Math.max(pollBackoffSeconds, conversation?.pollIntervalSeconds || 30),
    onPoll: handlePoll,
    enabled: chatEnabled && !!conversation?.selectedThreadId,
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectThread = useCallback(
    async (threadId: number) => {
      await loadConversation(threadId);
    },
    [loadConversation]
  );

  const handleSend = useCallback(
    async (message: string): Promise<void> => {
      if (!conversation?.selectedThreadId || !message) return;
      setSending(true);
      setError(null);
      const threadId = conversation.selectedThreadId;
      const requestId = ++sendRequestRef.current;
      try {
        const result: ChatSendData = await service.sendMessage({
          selectedThreadId: threadId,
          message,
        });
        if (requestId === sendRequestRef.current) {
          setConversation((current) => applyMessageSent(current, threadId, result));
        }
      } catch (err) {
        if (requestId === sendRequestRef.current) {
          setError(toErrorMessage(err, "Failed to send the message."));
          throw err;
        }
      } finally {
        if (requestId === sendRequestRef.current) setSending(false);
      }
    },
    [conversation, service]
  );

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => !current);
  }, []);

  const handleNavigate = useCallback((view: "chat" | "settings") => {
    setShowSettings(view === "settings");
  }, []);

  // ── License server settings ────────────────────────────────────────────────

  const {
    serverUrl,
    savedServerUrl,
    settingsLoading,
    settingsSaving,
    serverDirty,
    setServerUrl,
    persistServerUrl,
  } = useLicenseServerSettings({ enabled: canManage });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageCanvas innerClassName={styles.pageCanvasInner}>
      <ConfigProvider theme={chatThemeConfig}>
        <div className={styles.chatShell}>
          <StatusBanner
            status={bannerStatus}
            onDismiss={() => {
              setBannerDismissed(true);
              setError(null);
            }}
          />

          <div className={styles.workspace}>
            {/* Mobile overlay backdrop */}
            <div
              className={`${styles.sidebarBackdrop} ${sidebarCollapsed ? styles.sidebarBackdropHidden : ""}`}
              onClick={handleToggleSidebar}
              aria-hidden="true"
            />

            <aside
              id={sidebarId}
              className={`wp-react-ui-shell-sidebar-frame ${styles.sidebar} ${
                sidebarCollapsed ? styles.sidebarCollapsed : ""
              }`}
            >
              <div className={styles.sidebarBody}>
                <ChatSidebar
                  threads={conversation?.threads ?? []}
                  selectedId={conversation?.selectedThreadId ?? null}
                  onSelect={(id) => {
                    void handleSelectThread(id);
                    if (isMobile) setSidebarCollapsed(true);
                  }}
                  onNavigate={(view) => {
                    handleNavigate(view);
                    if (isMobile) setSidebarCollapsed(true);
                  }}
                  role={currentRole}
                  collapsed={!isMobile && sidebarCollapsed}
                  canManage={Boolean(canManage)}
                  serverConfigured={Boolean(savedServerUrl)}
                  hasUnsavedSettings={serverDirty}
                  settingsOpen={showSettings}
                  t={t}
                />
              </div>
            </aside>

            <section className={styles.stage}>
              <header className={styles.navbar}>
                <Button
                  type="default"
                  size="large"
                  className={styles.collapseButton}
                  icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={handleToggleSidebar}
                  aria-label={
                    sidebarCollapsed ? t("Open conversation list") : t("Close conversation list")
                  }
                  aria-controls={sidebarId}
                  aria-expanded={!sidebarCollapsed}
                />

                {selectedThread ? (
                  <div className={styles.navbarThread}>
                    <Avatar
                      size={36}
                      style={{
                        backgroundColor: hashDomainColor(selectedThread.domain),
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    >
                      {getInitials(selectedThread.customerName ?? selectedThread.domain)}
                    </Avatar>
                    <div className={styles.navbarThreadMeta}>
                      <Typography.Text strong className={styles.navbarThreadName}>
                        {selectedThread.customerName ?? selectedThread.domain}
                      </Typography.Text>
                      <Typography.Text className={styles.navbarThreadSub}>
                        {selectedThread.customerEmail ?? selectedThread.domain}
                      </Typography.Text>
                    </div>
                  </div>
                ) : (
                  <Typography.Text strong className={styles.navbarPlaceholder}>
                    {t("Support Chat")}
                  </Typography.Text>
                )}
              </header>

              <div className={styles.chatMain}>
                {showSettings && canManage ? (
                  <div className={styles.settingsView}>
                    <ChatSettingsPanel
                      locale={config.locale ?? "en_US"}
                      serverUrl={serverUrl}
                      savedServerUrl={savedServerUrl}
                      settingsLoading={settingsLoading}
                      settingsSaving={settingsSaving}
                      serverDirty={serverDirty}
                      onServerUrlChange={setServerUrl}
                      onServerUrlSave={async () => {
                        await persistServerUrl();
                      }}
                    />
                  </div>
                ) : (
                  <ConversationPanel
                    thread={selectedThread}
                    messages={conversation?.messages ?? []}
                    role={currentRole}
                    onSend={handleSend}
                    isSending={sending}
                    chatEnabled={chatEnabled}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </ConfigProvider>
    </PageCanvas>
  );
}

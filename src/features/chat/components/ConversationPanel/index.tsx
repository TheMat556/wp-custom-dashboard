import type { ChatBootstrapData } from "../../services/chatConversationApi";
import { MessageComposer } from "../MessageComposer";
import { MessageList } from "../MessageList";
import styles from "./ConversationPanel.module.css";

type ChatThread = ChatBootstrapData["threads"][number];
type ChatMessage = ChatBootstrapData["messages"][number];

interface ConversationPanelProps {
  thread: ChatThread | null;
  messages: ChatMessage[];
  role: "owner" | "customer";
  onSend: (message: string) => Promise<void>;
  isSending: boolean;
  chatEnabled: boolean;
  composerDisabled?: boolean;
  composerPlaceholder?: string;
}

export function ConversationPanel({
  thread,
  messages,
  role,
  onSend,
  isSending,
  chatEnabled,
  composerDisabled = false,
  composerPlaceholder,
}: ConversationPanelProps) {
  return (
    <div className={styles.conversationPanel}>
      <MessageList messages={messages} thread={thread} viewerRole={role} />
      <MessageComposer
        onSend={onSend}
        isSending={isSending}
        disabled={!thread || !chatEnabled || composerDisabled || thread.status === "closed"}
        placeholder={composerPlaceholder}
      />
    </div>
  );
}

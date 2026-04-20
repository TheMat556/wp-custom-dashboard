import { SendOutlined } from "@ant-design/icons";
import { Button, Input, Typography } from "antd";
import { useCallback, useState } from "react";
import { CHAT_MAX_MESSAGE_LENGTH } from "../../constants";
import styles from "./MessageComposer.module.css";

interface MessageComposerProps {
  onSend: (message: string) => void | Promise<void>;
  isSending: boolean;
  disabled: boolean;
  placeholder?: string;
}

export function MessageComposer({
  onSend,
  isSending,
  disabled,
  placeholder,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const isInputDisabled = disabled || isSending;

  const canSend = !isInputDisabled && value.trim().length > 0;
  const charCount = value.length;
  const overLimit = charCount > CHAT_MAX_MESSAGE_LENGTH;

  const handleSend = useCallback(async () => {
    if (!canSend || overLimit) return;
    try {
      await onSend(value.trim());
      setValue("");
    } catch {
      // The parent surface already renders the error state; keep the draft intact here.
    }
  }, [canSend, overLimit, value, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className={`${styles.composer} ${isInputDisabled ? styles.composerDisabled : ""}`}>
      <div className={styles.inputWrap}>
        <div className={styles.textareaWrap}>
          <Input.TextArea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              placeholder ??
              (isInputDisabled ? "Select a conversation to send a message" : "Write a message")
            }
            disabled={isInputDisabled}
            maxLength={CHAT_MAX_MESSAGE_LENGTH}
            className={styles.textarea}
            aria-label="Message input"
          />
          <Typography.Text
            className={styles.charCounter}
            style={{ color: overLimit ? "#ef4444" : undefined }}
          >
            {charCount}/{CHAT_MAX_MESSAGE_LENGTH}
          </Typography.Text>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          type="primary"
          icon={<SendOutlined />}
          size="large"
          onClick={() => void handleSend()}
          disabled={!canSend || overLimit}
          loading={isSending}
          className={styles.sendBtn}
          aria-label="Send message"
        >
          <span className={styles.sendLabel}>Send</span>
        </Button>
      </div>
    </div>
  );
}

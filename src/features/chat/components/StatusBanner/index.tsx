import { Alert, Button } from "antd";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export type ChatBannerStatus =
  | { type: "idle" }
  | { type: "session_expired"; message: string }
  | { type: "chat_unavailable"; message: string }
  | { type: "send_failed"; message: string; onRetry: () => void }
  | { type: "connecting" }
  | { type: "grace"; daysRemaining: number }
  | { type: "locked" };

interface StatusBannerProps {
  status: ChatBannerStatus;
  onDismiss: () => void;
}

export function StatusBanner({ status, onDismiss }: StatusBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (status.type === "grace" || status.type === "connecting") {
      timerRef.current = setTimeout(onDismiss, 8000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, onDismiss]);

  if (status.type === "idle") return null;

  const config = getBannerConfig(status, onDismiss);

  return (
    <Alert
      type={config.alertType}
      message={config.message}
      showIcon
      closable
      onClose={onDismiss}
      action={config.action}
      style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}
    />
  );
}

type AlertType = "error" | "warning" | "info";

type BannerConfig = {
  alertType: AlertType;
  message: string;
  action?: ReactNode;
};

function getBannerConfig(
  status: Exclude<ChatBannerStatus, { type: "idle" }>,
  onDismiss: () => void
): BannerConfig {
  switch (status.type) {
    case "session_expired":
      return {
        alertType: "error",
        message: status.message || "Your session has expired — refreshing...",
      };
    case "chat_unavailable":
      return {
        alertType: "error",
        message: status.message || "Chat is currently unavailable.",
      };
    case "send_failed":
      return {
        alertType: "error",
        message: status.message || "Message failed to send.",
        action: (
          <Button
            size="small"
            onClick={() => {
              status.onRetry();
              onDismiss();
            }}
          >
            Retry
          </Button>
        ),
      };
    case "connecting":
      return { alertType: "info", message: "Reconnecting..." };
    case "grace":
      return {
        alertType: "warning",
        message: `Chat remains available for ${status.daysRemaining} more day(s). License in grace period.`,
      };
    case "locked":
      return { alertType: "warning", message: "Chat is not available for this license." };
  }
}

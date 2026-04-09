import { message } from "antd";
import { useEffect, useRef } from "react";
import { notificationStore } from "../../../store/notificationStore";

/**
 * Subscribes to the notification store and surfaces notifications
 * via Ant Design's message API. Renders nothing visible.
 */
export function NotificationRenderer() {
  const [messageApi, contextHolder] = message.useMessage();
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe((state) => {
      for (const notification of state.notifications) {
        if (shownRef.current.has(notification.id)) continue;
        shownRef.current.add(notification.id);

        const content = notification.description
          ? `${notification.message} — ${notification.description}`
          : notification.message;

        const antType = notification.type === "info" ? "success" : notification.type;
        messageApi.open({
          type: antType,
          content,
          duration: 6,
          onClose: () => notificationStore.getState().dismiss(notification.id),
        });
      }
    });

    return unsubscribe;
  }, [messageApi]);

  return contextHolder;
}

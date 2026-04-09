/**
 * Lightweight notification store for surfacing REST API errors.
 *
 * Uses a Zustand vanilla store so it can be called from services
 * and stores without requiring React context.
 */

import { createStore } from "zustand/vanilla";

export type NotificationType = "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  description?: string;
}

export interface NotificationStoreState {
  notifications: Notification[];
  push(notification: Omit<Notification, "id">): void;
  dismiss(id: string): void;
  clear(): void;
}

let nextId = 1;

export const notificationStore = createStore<NotificationStoreState>((set, get) => ({
  notifications: [],

  push(notification) {
    const id = `notification-${nextId++}`;
    set({ notifications: [...get().notifications, { ...notification, id }] });
  },

  dismiss(id) {
    set({ notifications: get().notifications.filter((n) => n.id !== id) });
  },

  clear() {
    set({ notifications: [] });
  },
}));

/**
 * Inspects a failed fetch Response and pushes a user-facing notification.
 * Returns the error message for callers that also want to log it.
 */
export function notifyApiError(response: Response, context: string): string {
  const isNonceExpired = response.status === 401 || response.status === 403;
  const message = isNonceExpired
    ? "Your session has expired"
    : `${context} failed (${response.status})`;
  const description = isNonceExpired ? "Please reload the page to continue." : undefined;

  notificationStore.getState().push({
    type: "error",
    message,
    description,
  });

  return message;
}

export function resetNotificationStore() {
  nextId = 1;
  notificationStore.setState({ notifications: [] });
}

import { createStore } from "zustand/vanilla";
import type { WpReactUiConfig } from "../types/wp";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface SessionState {
  expired: boolean;
  checking: boolean;
  markExpired: () => void;
  dismiss: () => void;
  checkSession: () => Promise<void>;
}

export const sessionStore = createStore<SessionState>((set, get) => ({
  expired: false,
  checking: false,

  markExpired() {
    if (!get().expired) {
      set({ expired: true });
    }
  },

  dismiss() {
    set({ expired: false });
  },

  async checkSession() {
    if (get().checking || get().expired) return;
    set({ checking: true });

    try {
      const response = await fetch("/wp-json/wp/v2/users/me", {
        headers: { "X-WP-Nonce": sessionConfig?.nonce ?? "" },
      });

      if (response.status === 401 || response.status === 403) {
        set({ expired: true });
      }
    } catch {
      // Network errors don't mean session expired.
    } finally {
      set({ checking: false });
    }
  },
}));

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let sessionConfig: Pick<WpReactUiConfig, "nonce"> | null = null;

function onVisibilityChange() {
  if (document.hidden) {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  } else {
    startHeartbeat();
  }
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    sessionStore.getState().checkSession();
  }, HEARTBEAT_INTERVAL_MS);
}

export function bootstrapSessionStore(config: Pick<WpReactUiConfig, "nonce">) {
  sessionConfig = config;
  sessionStore.setState({ expired: false, checking: false });

  startHeartbeat();
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    document.removeEventListener("visibilitychange", onVisibilityChange);
    sessionConfig = null;
  };
}

export function resetSessionStore() {
  sessionStore.setState({ expired: false, checking: false });
}

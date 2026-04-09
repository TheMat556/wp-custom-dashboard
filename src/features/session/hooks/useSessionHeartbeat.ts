import { useEffect, useEffectEvent } from "react";
import { useShellConfig } from "../../shell/context/ShellConfigContext";
import { createSessionHeartbeatService } from "../services/sessionHeartbeatService";
import { resetSessionStore, sessionStore } from "../store/sessionStore";

export const SESSION_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

export function useSessionHeartbeat() {
  const { nonce } = useShellConfig();

  const runHeartbeatCheck = useEffectEvent(async () => {
    const state = sessionStore.getState();

    if (state.checking || state.expired) {
      return;
    }

    state.setChecking(true);

    try {
      const result = await createSessionHeartbeatService({ nonce }).checkSession();

      if (result === "expired") {
        sessionStore.getState().markExpired();
      }
    } finally {
      sessionStore.getState().setChecking(false);
    }
  });

  useEffect(() => {
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    resetSessionStore();

    function stopHeartbeat() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }

    function startHeartbeat() {
      if (heartbeatTimer) {
        return;
      }

      heartbeatTimer = setInterval(() => {
        void runHeartbeatCheck();
      }, SESSION_HEARTBEAT_INTERVAL_MS);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopHeartbeat();
      } else {
        startHeartbeat();
      }
    }

    startHeartbeat();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}

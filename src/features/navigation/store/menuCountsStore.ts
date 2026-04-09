import { createStore } from "zustand/vanilla";
import type { WpReactUiConfig } from "../../../types/wp";
import { createMenuCountsService, type MenuCountsService } from "../services/menuCountsApi";

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export interface MenuCountsState {
  counts: Record<string, number>;
  previousCounts: Record<string, number>;
}

export const menuCountsStore = createStore<MenuCountsState>(() => ({
  counts: {},
  previousCounts: {},
}));

let pollTimer: ReturnType<typeof setInterval> | null = null;
let menuCountsService: MenuCountsService | null = null;

function onVisibilityChange() {
  if (document.hidden) {
    stopPolling();
  } else {
    startPolling();
  }
}

async function fetchOnce() {
  if (!menuCountsService) return;

  try {
    const newCounts = await menuCountsService.fetchCounts();
    const current = menuCountsStore.getState().counts;
    menuCountsStore.setState({
      previousCounts: current,
      counts: newCounts,
    });
  } catch {
    // Silent fail — badge counts are non-critical.
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(fetchOnce, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function bootstrapMenuCountsStore(config: Pick<WpReactUiConfig, "restUrl" | "nonce">) {
  menuCountsService = createMenuCountsService(config);
  menuCountsStore.setState({ counts: {}, previousCounts: {} });

  // Initial fetch.
  fetchOnce();

  // Start polling.
  startPolling();
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    stopPolling();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export function resetMenuCountsStore() {
  stopPolling();
  menuCountsService = null;
  menuCountsStore.setState({ counts: {}, previousCounts: {} });
}

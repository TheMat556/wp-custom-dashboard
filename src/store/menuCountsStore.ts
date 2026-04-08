import { createStore } from "zustand/vanilla";
import {
  type MenuCountsService,
  createMenuCountsService,
} from "../services/menuCountsApi";
import type { WpReactUiConfig } from "../types/wp";

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export interface MenuCountsState {
  counts: Record<string, number>;
  previousCounts: Record<string, number>;
  service: MenuCountsService | null;
}

export const menuCountsStore = createStore<MenuCountsState>(() => ({
  counts: {},
  previousCounts: {},
  service: null,
}));

let pollTimer: ReturnType<typeof setInterval> | null = null;

function onVisibilityChange() {
  if (document.hidden) {
    stopPolling();
  } else {
    startPolling();
  }
}

async function fetchOnce() {
  const { service } = menuCountsStore.getState();
  if (!service) return;

  try {
    const newCounts = await service.fetchCounts();
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

export function bootstrapMenuCountsStore(
  config: Pick<WpReactUiConfig, "restUrl" | "nonce">
) {
  const service = createMenuCountsService(config);
  menuCountsStore.setState({ counts: {}, previousCounts: {}, service });

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
  menuCountsStore.setState({ counts: {}, previousCounts: {}, service: null });
}

/**
 * Browser history management extracted from navigationStore.
 *
 * Centralises pushState / replaceState / popstate handling so that
 * the navigation store only deals with intent, not history mechanics.
 */

export interface HistoryEntry {
  iframeUrl: string;
  pageUrl: string;
}

export type PopstateHandler = (entry: HistoryEntry) => void;

/**
 * Push a new history entry.
 */
export function pushHistory(entry: HistoryEntry, title: string): void {
  history.pushState(entry, title, entry.pageUrl);
}

/**
 * Replace the current history entry.
 */
export function replaceHistory(entry: HistoryEntry, title: string): void {
  history.replaceState(entry, title, entry.pageUrl);
}

/**
 * Listen for browser back/forward navigations.
 * Returns a teardown function.
 */
export function listenPopstate(handler: PopstateHandler): () => void {
  const onPopstate = (e: PopStateEvent) => {
    const state = e.state as HistoryEntry | null;
    if (state?.iframeUrl && state?.pageUrl) {
      handler(state);
    }
  };

  window.addEventListener("popstate", onPopstate);
  return () => window.removeEventListener("popstate", onPopstate);
}

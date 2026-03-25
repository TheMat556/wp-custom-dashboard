/**
 * Navigation helpers for the iframe shell architecture.
 *
 * The previous SPA fetch-and-swap implementation has been replaced by an
 * iframe-based approach (see src/store/navigationStore.ts and
 * src/components/ContentFrame). This file now provides:
 *
 *  - useActiveKey()    — reactive sidebar menu key (backed by navigationStore)
 *  - isAdminUrl()      — re-exported from embedUrl for call-site compat
 */

import { useSyncExternalStore } from "react";
import { activeKeyStore } from "../store/navigationStore";

export { isAdminUrl } from "./embedUrl";

/** React hook — returns the currently active sidebar menu key. Reactive. */
export function useActiveKey(): string | undefined {
  return useSyncExternalStore(
    activeKeyStore.subscribe,
    activeKeyStore.getSnapshot,
    activeKeyStore.getSnapshot
  );
}

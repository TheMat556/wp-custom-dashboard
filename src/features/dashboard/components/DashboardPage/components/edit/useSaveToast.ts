import { message } from "antd";
import { useEffect, useRef } from "react";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";
import type { TFunc } from "../../types";

// Note: SAVE_DEBOUNCE_MS (600ms) differs from shellPreferencesStore SYNC_DEBOUNCE_MS (500ms).
// This is intentional — the toast debounce is for UI feedback only and should be slightly
// longer than the sync debounce to avoid showing "Saved" before the server sync completes.
const SAVE_DEBOUNCE_MS = 600;

/**
 * Shows a debounced "Saved" toast when the user commits draft changes
 * via exitEditing. Subscribes to dashboardEditModeStore and compares
 * `isEditing` transitions (true → false) to detect a commit.
 */
export function useSaveToast({ enabled, t }: { enabled: boolean; t: TFunc }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      return;
    }

    const unsubscribe = dashboardEditModeStore.subscribe((state, prevState) => {
      if (
        prevState.isEditing === true &&
        state.isEditing === false &&
        state.lastTransitionWasCommit
      ) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          message.success({ content: t("Saved"), duration: 1.5, key: "dashboard-edit-save" });
          timer.current = null;
        }, SAVE_DEBOUNCE_MS);
      }
    });

    return () => {
      unsubscribe();
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [enabled, t]);
}

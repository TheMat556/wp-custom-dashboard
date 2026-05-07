import { message } from "antd";
import { useEffect, useRef } from "react";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";
import type { TFunc } from "../../types";

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

    let prevEditing = dashboardEditModeStore.getState().isEditing;

    const unsubscribe = dashboardEditModeStore.subscribe((state) => {
      const nextEditing = state.isEditing;
      // Detect transition from editing (true) → committed (false)
      if (prevEditing === true && nextEditing === false) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          message.success({ content: t("Saved"), duration: 1.5, key: "dashboard-edit-save" });
          timer.current = null;
        }, SAVE_DEBOUNCE_MS);
      }
      prevEditing = nextEditing;
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

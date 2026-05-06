import { message } from "antd";
import { useEffect, useRef } from "react";
import { shellPreferencesStore } from "../../../../../shell/store/shellPreferencesStore";

const SAVE_DEBOUNCE_MS = 600;

const TRACKED_FIELDS = ["dashboardWidgetOrder", "hiddenWidgets", "dashboardWidgetSizes"] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

function snapshotTracked(state: Record<TrackedField, unknown>): string {
  return JSON.stringify({
    dashboardWidgetOrder: state.dashboardWidgetOrder,
    hiddenWidgets: state.hiddenWidgets,
    dashboardWidgetSizes: state.dashboardWidgetSizes,
  });
}

/**
 * Shows a debounced "Saved" toast when dashboard layout preferences change
 * while the user is actively editing.
 */
export function useSaveToast(enabled: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      return;
    }

    let prev = snapshotTracked(shellPreferencesStore.getState() as Record<TrackedField, unknown>);

    const unsubscribe = shellPreferencesStore.subscribe((state) => {
      const next = snapshotTracked(state as unknown as Record<TrackedField, unknown>);
      if (next === prev) return;
      prev = next;

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        message.success({ content: "Saved", duration: 1.5, key: "dashboard-edit-save" });
        timer.current = null;
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [enabled]);
}

import { useEffect } from "react";

interface Options {
  enabled: boolean;
  onEscape: () => void;
}

const SKIP_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function shouldSkip(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (SKIP_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  if (target.closest(".ant-modal, .ant-popover, .ant-select-dropdown")) return true;
  return false;
}

/**
 * Wires keyboard shortcuts for edit mode:
 *   - Escape exits edit mode unless focus is inside an input/modal/popover.
 */
export function useEditKeyboardShortcuts({ enabled, onEscape }: Options) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (shouldSkip(event.target)) return;
      event.preventDefault();
      onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [enabled, onEscape]);
}

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEditKeyboardShortcuts } from "./useEditKeyboardShortcuts";

function dispatchEsc(target?: EventTarget) {
  const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
  if (target) {
    Object.defineProperty(event, "target", { value: target, writable: false });
  }
  window.dispatchEvent(event);
  return event;
}

describe("useEditKeyboardShortcuts", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("calls onEscape when Escape is pressed and enabled", () => {
    const onEscape = vi.fn();
    renderHook(() => useEditKeyboardShortcuts({ enabled: true, onEscape }));
    dispatchEsc();
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("does not call onEscape when disabled", () => {
    const onEscape = vi.fn();
    renderHook(() => useEditKeyboardShortcuts({ enabled: false, onEscape }));
    dispatchEsc();
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("skips when the target is an input element", () => {
    const onEscape = vi.fn();
    renderHook(() => useEditKeyboardShortcuts({ enabled: true, onEscape }));
    const input = document.createElement("input");
    document.body.appendChild(input);
    dispatchEsc(input);
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("skips when the target is inside an antd modal", () => {
    const onEscape = vi.fn();
    renderHook(() => useEditKeyboardShortcuts({ enabled: true, onEscape }));
    const modal = document.createElement("div");
    modal.className = "ant-modal";
    const button = document.createElement("button");
    modal.appendChild(button);
    document.body.appendChild(modal);
    dispatchEsc(button);
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEditKeyboardShortcuts({ enabled: true, onEscape }));
    unmount();
    dispatchEsc();
    expect(onEscape).not.toHaveBeenCalled();
  });
});

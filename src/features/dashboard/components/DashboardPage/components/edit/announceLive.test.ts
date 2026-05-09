import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { announceLive } from "./announceLive";

describe("announceLive", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when no live region exists", () => {
    expect(() => announceLive("hello")).not.toThrow();
  });

  it("clears immediately and writes the message after a tick", () => {
    const node = document.createElement("div");
    node.setAttribute("data-edit-live-region", "");
    node.textContent = "previous";
    document.body.appendChild(node);

    announceLive("Widget moved.");
    expect(node.textContent).toBe("");

    vi.advanceTimersByTime(50);
    expect(node.textContent).toBe("Widget moved.");
  });
});

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatPolling } from "./useChatPolling";

describe("useChatPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should set up an interval when enabled is true", async () => {
    const onPoll = vi.fn().mockResolvedValue(undefined);
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    renderHook(() =>
      useChatPolling({
        pollIntervalSeconds: 15,
        onPoll,
        enabled: true,
      })
    );

    expect(setIntervalSpy).toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it("should not set up an interval when enabled is false", async () => {
    const onPoll = vi.fn().mockResolvedValue(undefined);
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    renderHook(() =>
      useChatPolling({
        pollIntervalSeconds: 15,
        onPoll,
        enabled: false,
      })
    );

    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it("should clear the interval on unmount", async () => {
    const onPoll = vi.fn().mockResolvedValue(undefined);
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { unmount } = renderHook(() =>
      useChatPolling({
        pollIntervalSeconds: 15,
        onPoll,
        enabled: true,
      })
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("should use the specified pollIntervalSeconds in the interval", () => {
    const onPoll = vi.fn().mockResolvedValue(undefined);
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    renderHook(() =>
      useChatPolling({
        pollIntervalSeconds: 5,
        onPoll,
        enabled: true,
      })
    );

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    setIntervalSpy.mockRestore();
  });

  it("should default to 15 seconds when pollIntervalSeconds is 0 or falsy", () => {
    const onPoll = vi.fn().mockResolvedValue(undefined);
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    renderHook(() =>
      useChatPolling({
        pollIntervalSeconds: 0,
        onPoll,
        enabled: true,
      })
    );

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15 * 1000);
    setIntervalSpy.mockRestore();
  });

  it("should stop polling when enabled changes from true to false", async () => {
    const onPoll = vi.fn().mockResolvedValue(undefined);
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useChatPolling({
          pollIntervalSeconds: 10,
          onPoll,
          enabled,
        }),
      { initialProps: { enabled: true } }
    );

    // Disable polling
    rerender({ enabled: false });

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("should handle errors from onPoll gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onPoll = vi.fn().mockRejectedValue(new Error("Poll failed"));

    const { unmount } = renderHook(() =>
      useChatPolling({
        pollIntervalSeconds: 15,
        onPoll,
        enabled: true,
      })
    );

    // Simulate interval callback
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    vi.advanceTimersByTime(15000);

    unmount();

    consoleErrorSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });
});

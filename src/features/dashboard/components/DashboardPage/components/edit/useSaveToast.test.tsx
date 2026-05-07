import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const successMock = vi.fn();

vi.mock("antd", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    message: {
      success: (...args: unknown[]) => successMock(...args),
    },
  };
});

import {
  resetShellPreferencesStore,
  shellPreferencesStore,
} from "../../../../../shell/store/shellPreferencesStore";
import { useSaveToast } from "./useSaveToast";

const identityT = (key: string) => key;

describe("useSaveToast", () => {
  beforeEach(() => {
    successMock.mockClear();
    resetShellPreferencesStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not toast when disabled", () => {
    renderHook(() => useSaveToast({ enabled: false, t: identityT }));
    shellPreferencesStore.setState({ dashboardWidgetOrder: ["a"] });
    vi.advanceTimersByTime(2000);
    expect(successMock).not.toHaveBeenCalled();
  });

  it("emits a debounced toast after a tracked field changes", () => {
    renderHook(() => useSaveToast({ enabled: true, t: identityT }));
    shellPreferencesStore.setState({ dashboardWidgetOrder: ["a"] });
    vi.advanceTimersByTime(599);
    expect(successMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(successMock).toHaveBeenCalledTimes(1);
    expect(successMock).toHaveBeenCalledWith(expect.objectContaining({ content: "Saved" }));
  });

  it("coalesces rapid changes into a single toast", () => {
    renderHook(() => useSaveToast({ enabled: true, t: identityT }));
    shellPreferencesStore.setState({ dashboardWidgetOrder: ["a"] });
    vi.advanceTimersByTime(200);
    shellPreferencesStore.setState({ dashboardWidgetOrder: ["a", "b"] });
    vi.advanceTimersByTime(200);
    shellPreferencesStore.setState({ hiddenWidgets: ["c"] });
    vi.advanceTimersByTime(601);
    expect(successMock).toHaveBeenCalledTimes(1);
  });

  it("ignores untracked field changes", () => {
    renderHook(() => useSaveToast({ enabled: true, t: identityT }));
    shellPreferencesStore.setState({ density: "compact" });
    vi.advanceTimersByTime(2000);
    expect(successMock).not.toHaveBeenCalled();
  });
});

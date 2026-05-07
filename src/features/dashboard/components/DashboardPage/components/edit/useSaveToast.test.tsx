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

import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";
import { useSaveToast } from "./useSaveToast";

const identityT = (key: string) => key;

function resetStore() {
  dashboardEditModeStore.setState({
    isEditing: false,
    savedDraft: null,
    draft: {
      order: [],
      hidden: [],
      kpiContainers: { __default__: { order: [], columns: 3 } },
      widgetSizes: {},
    },
  });
}

describe("useSaveToast", () => {
  beforeEach(() => {
    successMock.mockClear();
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not toast when disabled", () => {
    renderHook(() => useSaveToast({ enabled: false, t: identityT }));
    // Transition isEditing → false while disabled should not trigger
    dashboardEditModeStore.setState({ isEditing: true });
    dashboardEditModeStore.setState({ isEditing: false });
    vi.advanceTimersByTime(2000);
    expect(successMock).not.toHaveBeenCalled();
  });

  it("emits a debounced toast after exiting edit mode", () => {
    // Start with editing active
    dashboardEditModeStore.setState({ isEditing: true });
    renderHook(() => useSaveToast({ enabled: true, t: identityT }));
    // Exit edit mode — triggers the toast
    dashboardEditModeStore.setState({ isEditing: false });
    vi.advanceTimersByTime(599);
    expect(successMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(successMock).toHaveBeenCalledTimes(1);
    expect(successMock).toHaveBeenCalledWith(expect.objectContaining({ content: "Saved" }));
  });

  it("coalesces rapid transitions into a single toast", () => {
    dashboardEditModeStore.setState({ isEditing: true });
    renderHook(() => useSaveToast({ enabled: true, t: identityT }));

    // Rapidly toggle isEditing
    dashboardEditModeStore.setState({ isEditing: false });
    vi.advanceTimersByTime(200);
    dashboardEditModeStore.setState({ isEditing: true });
    dashboardEditModeStore.setState({ isEditing: false });
    vi.advanceTimersByTime(200);
    dashboardEditModeStore.setState({ isEditing: false });
    vi.advanceTimersByTime(601);
    // Only one toast should fire (the last transition)
    expect(successMock).toHaveBeenCalledTimes(1);
  });

  it("ignores transitions when editing state stays the same", () => {
    dashboardEditModeStore.setState({ isEditing: true });
    renderHook(() => useSaveToast({ enabled: true, t: identityT }));
    // Set same value — no transition
    dashboardEditModeStore.setState({ isEditing: true });
    vi.advanceTimersByTime(2000);
    expect(successMock).not.toHaveBeenCalled();
  });
});

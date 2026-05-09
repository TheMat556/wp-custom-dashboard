import { beforeEach, describe, expect, it } from "vitest";
import { shellPreferencesStore } from "../../../features/shell/store/shellPreferencesStore";
import { dashboardEditModeStore } from "./dashboardEditModeStore";

describe("dashboardEditModeStore", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
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
    shellPreferencesStore.setState({
      dashboardWidgetOrder: [],
      hiddenWidgets: [],
      dashboardWidgetSizes: {},
      kpiContainerInstances: { __default__: { order: ["kpi-website"], columns: 3 } },
      favorites: [],
      recentPages: [],
      density: "comfortable",
      themePreset: "default",
      customPresetColor: "",
      highContrast: false,
      sidebarCollapsed: false,
    });
  });

  it("enterEditing snapshots current persisted layout", () => {
    dashboardEditModeStore.getState().enterEditing();
    const state = dashboardEditModeStore.getState();
    expect(state.isEditing).toBe(true);
    expect(state.savedDraft).not.toBeNull();
    expect(state.savedDraft?.kpiContainers.__default__).toBeDefined();
    expect(state.savedDraft?.kpiContainers.__default__.order).toContain("kpi-website");
  });

  it("enterEditing guarantees __default__ container even when persisted is empty", () => {
    shellPreferencesStore.setState({ kpiContainerInstances: {} });
    dashboardEditModeStore.getState().enterEditing();
    const state = dashboardEditModeStore.getState();
    expect(state.draft.kpiContainers.__default__).toBeDefined();
    expect(state.draft.kpiContainers.__default__.order.length).toBeGreaterThan(0);
  });

  it("exitEditing commits draft to persisted store", () => {
    dashboardEditModeStore.getState().enterEditing();
    // Modify the draft
    dashboardEditModeStore.getState().setDraftOrder(["hero", "traffic"]);
    dashboardEditModeStore.getState().exitEditing();

    const shellState = shellPreferencesStore.getState();
    expect(shellState.dashboardWidgetOrder).toEqual(["hero", "traffic"]);
    expect(dashboardEditModeStore.getState().isEditing).toBe(false);
  });

  it("discardEditing does NOT modify persisted store", () => {
    // Set up initial persisted state
    shellPreferencesStore.setState({ dashboardWidgetOrder: ["original"] });
    dashboardEditModeStore.getState().enterEditing();
    // Modify draft
    dashboardEditModeStore.getState().setDraftOrder(["modified"]);
    // Discard
    dashboardEditModeStore.getState().discardEditing();

    // Persisted should remain unchanged
    const shellState = shellPreferencesStore.getState();
    expect(shellState.dashboardWidgetOrder).toEqual(["original"]);
    expect(dashboardEditModeStore.getState().isEditing).toBe(false);
  });

  it("toggleEditing cycles correctly", () => {
    expect(dashboardEditModeStore.getState().isEditing).toBe(false);
    dashboardEditModeStore.getState().toggleEditing();
    expect(dashboardEditModeStore.getState().isEditing).toBe(true);
    dashboardEditModeStore.getState().toggleEditing();
    expect(dashboardEditModeStore.getState().isEditing).toBe(false);
  });

  it("discardEditing resets draft to empty", () => {
    dashboardEditModeStore.getState().enterEditing();
    dashboardEditModeStore.getState().setDraftOrder(["something"]);
    dashboardEditModeStore.getState().discardEditing();
    const state = dashboardEditModeStore.getState();
    expect(state.draft.order).toEqual([]);
    expect(state.savedDraft).toBeNull();
  });
});

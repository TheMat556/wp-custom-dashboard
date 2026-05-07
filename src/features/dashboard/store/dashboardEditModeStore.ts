import { createStore } from "zustand/vanilla";
import type { KpiContainerColumns, WidgetSize } from "../../../types/shellPreferences";
import { shellPreferencesStore } from "../../shell/store/shellPreferencesStore";

interface DashboardEditDraft {
  order: string[];
  hidden: string[];
  kpiContainers: Record<string, { order: string[]; columns: KpiContainerColumns }>;
  widgetSizes: Record<string, WidgetSize>;
}

const DEFAULT_KPI_CONTAINER_ORDER = [
  "kpi-website",
  "kpi-visitors",
  "kpi-updates",
  "kpi-speed",
  "kpi-conversions",
];

function createEmptyDraft(): DashboardEditDraft {
  return {
    order: [],
    hidden: [],
    kpiContainers: {
      __default__: {
        order: [...DEFAULT_KPI_CONTAINER_ORDER],
        columns: 3,
      },
    },
    widgetSizes: {},
  };
}

function snapshotPersistedLayout(): DashboardEditDraft {
  const prefs = shellPreferencesStore.getState();
  return {
    order: [...prefs.dashboardWidgetOrder],
    hidden: [...prefs.hiddenWidgets],
    kpiContainers: structuredClone(prefs.kpiContainerInstances),
    widgetSizes: { ...prefs.dashboardWidgetSizes },
  };
}

/** Commit the full draft to the persisted store in a single state update. */
function commitDraftToPreferences(draft: DashboardEditDraft) {
  shellPreferencesStore.setState({
    dashboardWidgetOrder: draft.order,
    hiddenWidgets: draft.hidden,
    kpiContainerInstances: draft.kpiContainers,
    dashboardWidgetSizes: draft.widgetSizes,
  });
}

let containerInstanceCounter = 0;

function generateDraftContainerInstanceId(): string {
  containerInstanceCounter++;
  return `draft-instance-${containerInstanceCounter}-${Date.now()}`;
}

export interface DashboardEditModeState {
  isEditing: boolean;

  /** Snapshot of layout state taken when entering edit mode. Used for discard. */
  savedDraft: DashboardEditDraft | null;

  /** Active working draft — mutated during editing. */
  draft: DashboardEditDraft;

  /** Enter edit mode: snapshot current layout into the draft. */
  enterEditing: () => void;

  /** Exit edit mode and commit the draft to the persisted store. */
  exitEditing: () => void;

  /** Exit edit mode and discard the draft (restore snapshot). */
  discardEditing: () => void;

  /** Toggle edit mode (commit on toggle-out). */
  toggleEditing: () => void;

  /** Set the full draft order. */
  setDraftOrder: (order: string[]) => void;

  /** Toggle a widget's visibility in the draft. */
  toggleDraftVisibility: (key: string) => void;

  /** Update a KPI container config in the draft. */
  setDraftKpiContainerConfig: (
    instanceId: string,
    config: Partial<{ order: string[]; columns: KpiContainerColumns }>
  ) => void;

  /** Add a new KPI container instance to the draft. */
  addDraftKpiContainerInstance: () => string;

  /** Remove a KPI container instance from the draft. */
  removeDraftKpiContainerInstance: (instanceId: string) => void;

  /** Set a widget's size in the draft. */
  setDraftWidgetSize: (key: string, size: WidgetSize) => void;

  /** Reset the draft to default layout (does not touch persisted state). */
  resetDraftLayout: () => void;
}

export const dashboardEditModeStore = createStore<DashboardEditModeState>((set, get) => ({
  isEditing: false,
  savedDraft: null,
  draft: createEmptyDraft(),

  enterEditing() {
    const snapshot = snapshotPersistedLayout();
    set({
      isEditing: true,
      savedDraft: snapshot,
      draft: structuredClone(snapshot),
    });
  },

  exitEditing() {
    const { draft, isEditing } = get();
    if (!isEditing) return;

    commitDraftToPreferences(draft);

    set({
      isEditing: false,
      savedDraft: null,
      draft: createEmptyDraft(),
    });
  },

  discardEditing() {
    const { savedDraft, isEditing } = get();
    if (!isEditing || !savedDraft) return;

    // Only commit if the saved draft differs from what's currently persisted
    const persisted = shellPreferencesStore.getState();
    if (
      savedDraft.order.join(",") !== persisted.dashboardWidgetOrder.join(",") ||
      savedDraft.hidden.join(",") !== persisted.hiddenWidgets.join(",") ||
      JSON.stringify(savedDraft.widgetSizes) !== JSON.stringify(persisted.dashboardWidgetSizes) ||
      JSON.stringify(savedDraft.kpiContainers) !== JSON.stringify(persisted.kpiContainerInstances)
    ) {
      commitDraftToPreferences(savedDraft);
    }

    set({
      isEditing: false,
      savedDraft: null,
      draft: createEmptyDraft(),
    });
  },

  toggleEditing() {
    const { isEditing } = get();
    if (isEditing) {
      get().exitEditing();
    } else {
      get().enterEditing();
    }
  },

  setDraftOrder(order: string[]) {
    set((state) => ({ draft: { ...state.draft, order } }));
  },

  toggleDraftVisibility(key: string) {
    set((state) => {
      const hidden = state.draft.hidden.includes(key)
        ? state.draft.hidden.filter((k) => k !== key)
        : [...state.draft.hidden, key];
      return { draft: { ...state.draft, hidden } };
    });
  },

  setDraftKpiContainerConfig(
    instanceId: string,
    config: Partial<{ order: string[]; columns: KpiContainerColumns }>
  ) {
    set((state) => {
      const containers = { ...state.draft.kpiContainers };
      const existing = containers[instanceId];
      if (!existing) return state;
      containers[instanceId] = {
        order: config.order ?? existing.order,
        columns: config.columns ?? existing.columns,
      };
      return { draft: { ...state.draft, kpiContainers: containers } };
    });
  },

  addDraftKpiContainerInstance() {
    const instanceId = generateDraftContainerInstanceId();
    set((state) => ({
      draft: {
        ...state.draft,
        kpiContainers: {
          ...state.draft.kpiContainers,
          [instanceId]: { order: [], columns: 3 },
        },
      },
    }));
    return instanceId;
  },

  removeDraftKpiContainerInstance(instanceId: string) {
    set((state) => {
      const containers = { ...state.draft.kpiContainers };
      delete containers[instanceId];
      return { draft: { ...state.draft, kpiContainers: containers } };
    });
  },

  setDraftWidgetSize(key: string, size: WidgetSize) {
    set((state) => ({
      draft: {
        ...state.draft,
        widgetSizes: { ...state.draft.widgetSizes, [key]: size },
      },
    }));
  },

  resetDraftLayout() {
    set({ draft: createEmptyDraft() });
  },
}));

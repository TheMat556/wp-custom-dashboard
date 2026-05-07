import { HolderOutlined } from "@ant-design/icons";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useState } from "react";
import { useStore } from "zustand";
import type { DashboardViewModel } from "../../../../dashboardViewModel";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";
import {
  isContainerInstanceKey,
  isKpiWidgetKey,
  mergeWidgetOrder,
  parseContainerInstanceKey,
  resolveWidgetKey,
} from "../../../../widgets/widgetRegistry";
import type { TFunc } from "../../../types";
import { DASHBOARD_GRID_DROPPABLE_ID } from "../DashboardGrid";
import { announceLive } from "./announceLive";
import { CATALOGUE_DROPZONE_ID, CatalogueDrawer } from "./CatalogueDrawer";
import { EditModeBar } from "./EditModeBar";
import { useEditKeyboardShortcuts } from "./useEditKeyboardShortcuts";
import { useSaveToast } from "./useSaveToast";

interface EditModeChromeProps {
  viewModel: DashboardViewModel;
  children: React.ReactNode;
  t: TFunc;
}

function widgetLabel(key: string): string {
  return resolveWidgetKey(key)?.label ?? key;
}

function insertKey(keys: string[], key: string, beforeKey: string | null): string[] {
  const filtered = keys.filter((k) => k !== key);
  if (!beforeKey) return [...filtered, key];
  const idx = filtered.indexOf(beforeKey);
  if (idx === -1) return [...filtered, key];
  filtered.splice(idx, 0, key);
  return filtered;
}

function EditModeChrome({ viewModel, children, t }: EditModeChromeProps) {
  const isEditing = useStore(dashboardEditModeStore, (s) => s.isEditing);
  const discardEditing = useStore(dashboardEditModeStore, (s) => s.discardEditing);

  // Read draft state from the edit mode store instead of shellPreferencesStore.
  // This keeps all layout mutations isolated until "Done" commits them.
  const draftOrder = useStore(dashboardEditModeStore, (s) => s.draft.order);
  const draftHidden = useStore(dashboardEditModeStore, (s) => s.draft.hidden);
  const draftKpiContainers = useStore(dashboardEditModeStore, (s) => s.draft.kpiContainers);
  const setDraftOrder = useStore(dashboardEditModeStore, (s) => s.setDraftOrder);
  const toggleDraftVisibility = useStore(dashboardEditModeStore, (s) => s.toggleDraftVisibility);
  const setDraftKpiContainerConfig = useStore(
    dashboardEditModeStore,
    (s) => s.setDraftKpiContainerConfig
  );
  const addDraftKpiContainerInstance = useStore(
    dashboardEditModeStore,
    (s) => s.addDraftKpiContainerInstance
  );
  const removeDraftKpiContainerInstance = useStore(
    dashboardEditModeStore,
    (s) => s.removeDraftKpiContainerInstance
  );

  const [catalogueOpen, setCatalogueOpen] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeDragRect, setActiveDragRect] = useState<{ width: number; height: number } | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeWidget = activeKey ? (resolveWidgetKey(activeKey) ?? null) : null;

  const handleAddFromCatalogue = useCallback(
    (key: string, overKey: string | null) => {
      // kpi-container is a multi-instance widget — create a new instance on every add
      if (key === "kpi-container") {
        // Clean up any orphaned container instance state left before the fix
        const keysToRemove = Object.keys(draftKpiContainers).filter(
          (id) => id !== "__default__" && !draftOrder.includes(`kpi-container::${id}`)
        );
        for (const id of keysToRemove) {
          removeDraftKpiContainerInstance(id);
        }

        const instanceId = addDraftKpiContainerInstance();
        const instanceKey = `kpi-container::${instanceId}`;
        const target =
          overKey && overKey !== CATALOGUE_DROPZONE_ID && overKey !== DASHBOARD_GRID_DROPPABLE_ID
            ? overKey
            : null;
        setDraftOrder(insertKey(draftOrder, instanceKey, target));
        announceLive("KPI Container added.");
        return;
      }
      if (draftHidden.includes(key)) {
        toggleDraftVisibility(key);
      }
      const target =
        overKey && overKey !== CATALOGUE_DROPZONE_ID && overKey !== DASHBOARD_GRID_DROPPABLE_ID
          ? overKey
          : null;
      setDraftOrder(insertKey(draftOrder, key, target));
      announceLive(`${widgetLabel(key)} added.`);
    },
    [
      draftHidden,
      toggleDraftVisibility,
      setDraftOrder,
      draftOrder,
      addDraftKpiContainerInstance,
      removeDraftKpiContainerInstance,
      draftKpiContainers,
    ]
  );

  const handleHideToCatalogue = useCallback(
    (key: string) => {
      if (isContainerInstanceKey(key)) {
        // Fully remove container instance state instead of leaving orphaned state
        const instanceId = parseContainerInstanceKey(key);
        if (instanceId) {
          const nextOrder = draftOrder.filter((k) => k !== key);
          setDraftOrder(nextOrder);
          removeDraftKpiContainerInstance(instanceId);
        }
      } else if (!draftHidden.includes(key)) {
        toggleDraftVisibility(key);
      }
      announceLive(`${widgetLabel(key)} hidden.`);
    },
    [draftHidden, toggleDraftVisibility, setDraftOrder, draftOrder, removeDraftKpiContainerInstance]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (!id.startsWith("catalogue:")) {
      setActiveKey(id);
      const rect = event.active.rect.current.initial;
      if (rect) {
        setActiveDragRect({ width: rect.width, height: rect.height });
      }
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveKey(null);
    setActiveDragRect(null);
  }, []);

  /** Moves a grid KPI widget into a container instance. */
  const moveKpiIntoContainer = useCallback(
    (kpiKey: string, containerKey: string) => {
      const containerId = parseContainerInstanceKey(containerKey);
      if (!containerId) return;
      const cfg = draftKpiContainers[containerId];
      if (!cfg) return;

      // Add KPI to the container's order
      const nextOrder = cfg.order.includes(kpiKey) ? cfg.order : [...cfg.order, kpiKey];
      setDraftKpiContainerConfig(containerId, { order: nextOrder });

      // Remove KPI from the grid order
      const next = draftOrder.filter((k) => k !== kpiKey);
      setDraftOrder(next);

      // Unhide it if it was hidden (it's now visible inside the container)
      if (draftHidden.includes(kpiKey)) {
        toggleDraftVisibility(kpiKey);
      }

      announceLive(`${widgetLabel(kpiKey)} moved into container.`);
    },
    [
      draftKpiContainers,
      setDraftKpiContainerConfig,
      draftOrder,
      setDraftOrder,
      draftHidden,
      toggleDraftVisibility,
    ]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveKey(null);
      setActiveDragRect(null);
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      if (!overId) return;

      // Catalogue → grid
      if (activeId.startsWith("catalogue:")) {
        const key = activeId.slice("catalogue:".length);
        handleAddFromCatalogue(key, overId);
        return;
      }
      // Grid → catalogue (hide)
      if (overId === CATALOGUE_DROPZONE_ID) {
        handleHideToCatalogue(activeId);
        return;
      }
      // Grid KPI → Container drop
      if (isKpiWidgetKey(activeId) && isContainerInstanceKey(overId)) {
        moveKpiIntoContainer(activeId, overId);
        return;
      }
      // Reorder within grid
      if (activeId !== overId) {
        // Merge with defaults so indices work even on first load
        const current = mergeWidgetOrder(draftOrder);
        const oldIndex = current.indexOf(activeId);
        const newIndex = current.indexOf(overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const next = [...current];
          next.splice(oldIndex, 1);
          next.splice(newIndex, 0, activeId);
          setDraftOrder(next);
          announceLive(`${widgetLabel(activeId)} moved to position ${next.indexOf(activeId) + 1}.`);
        }
      }
    },
    [handleAddFromCatalogue, handleHideToCatalogue, moveKpiIntoContainer, setDraftOrder, draftOrder]
  );

  useEditKeyboardShortcuts({ enabled: isEditing, onEscape: discardEditing });
  useSaveToast({ enabled: isEditing, t });

  const handleAddClick = useCallback(
    (key: string) => handleAddFromCatalogue(key, null),
    [handleAddFromCatalogue]
  );

  return (
    <>
      <EditModeBar onToggleCatalogue={() => setCatalogueOpen((prev) => !prev)} t={t} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeWidget && (
            <div
              className="wp-react-ui-drag-overlay"
              style={
                activeDragRect
                  ? { width: activeDragRect.width, height: activeDragRect.height }
                  : undefined
              }
              aria-hidden="true"
            >
              <div className="wp-react-ui-sortable-widget widget--full">
                <span className="wp-react-ui-drag-handle" aria-hidden="true">
                  <HolderOutlined style={{ fontSize: 16 }} />
                </span>
                <div style={{ padding: 16 }}>{widgetLabel(activeWidget.key)}</div>
              </div>
            </div>
          )}
        </DragOverlay>
        <CatalogueDrawer
          open={catalogueOpen}
          onClose={() => setCatalogueOpen(false)}
          viewModel={viewModel}
          onAdd={handleAddClick}
          order={draftOrder}
          hiddenKeys={draftHidden}
          t={t}
        />
        <div data-edit-live-region aria-live="polite" className="wp-react-ui-sr-only" />
      </DndContext>
    </>
  );
}

export default EditModeChrome;

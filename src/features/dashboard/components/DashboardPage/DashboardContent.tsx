import { HolderOutlined } from "@ant-design/icons";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import { useStore } from "zustand";
import type { WpReactUiConfig } from "../../../../types/wp";
import { shellPreferencesStore } from "../../../shell/store/shellPreferencesStore";
import type { DashboardViewModel } from "../../dashboardViewModel";
import { dashboardEditModeStore } from "../../store/dashboardEditModeStore";
import { getVisibleWidgets, resolveWidgetKey } from "../../widgets/widgetRegistry";
import { DASHBOARD_GRID_DROPPABLE_ID } from "./components/DashboardGrid";
import { announceLive } from "./components/edit/announceLive";
import { SortableWidgetCard } from "./components/edit/SortableWidgetCard";
import type { TFunc } from "./types";

interface DashboardContentProps {
  config: WpReactUiConfig;
  t: TFunc;
  intlLocale: string;
  greetingKey: string;
  viewModel: DashboardViewModel;
  isMd: boolean;
  isLg: boolean;
  closeChecklist: () => void;
  isEditing?: boolean;
}

export function DashboardContent({
  config,
  t,
  intlLocale,
  greetingKey,
  viewModel,
  isMd,
  isLg,
  closeChecklist,
  isEditing = false,
}: DashboardContentProps) {
  // During editing, read widget order and visibility from the draft store
  // so that reordering/hiding only affects the draft until "Done" is pressed.
  const persistedOrder = useStore(shellPreferencesStore, (s) => s.dashboardWidgetOrder);
  const persistedHidden = useStore(shellPreferencesStore, (s) => s.hiddenWidgets);
  const setPersistedOrder = useStore(shellPreferencesStore, (s) => s.setDashboardWidgetOrder);

  const draftOrder = useStore(dashboardEditModeStore, (s) => s.draft.order);
  const draftHidden = useStore(dashboardEditModeStore, (s) => s.draft.hidden);
  const setDraftOrder = useStore(dashboardEditModeStore, (s) => s.setDraftOrder);

  const order = isEditing ? draftOrder : persistedOrder;
  const hiddenKeys = isEditing ? draftHidden : persistedHidden;
  const setOrder = isEditing ? setDraftOrder : setPersistedOrder;

  const visibleWidgets = useMemo(
    () => getVisibleWidgets(viewModel, hiddenKeys, order),
    [viewModel, hiddenKeys, order]
  );

  // Separate hero widget from the rest — hero renders full-width without card styling
  const heroWidget = useMemo(() => visibleWidgets.find((w) => w.key === "hero"), [visibleWidgets]);
  const cardWidgets = useMemo(
    () => visibleWidgets.filter((w) => w.key !== "hero"),
    [visibleWidgets]
  );

  const [activeDragKey, setActiveDragKey] = useState<string | null>(null);

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: DASHBOARD_GRID_DROPPABLE_ID,
    disabled: !isEditing,
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragKey(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragKey(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeKey = String(active.id);
    const overKey = String(over.id);

    const reordered = [...order];
    const sourceIndex = reordered.indexOf(activeKey);
    const targetIndex = reordered.indexOf(overKey);
    if (sourceIndex === -1 || targetIndex === -1) return;

    reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, activeKey);

    setOrder(reordered);
    const movedLabel = resolveWidgetKey(activeKey)?.label ?? activeKey;
    announceLive(`${movedLabel} moved`);
  };

  const handleDragCancel = () => {
    setActiveDragKey(null);
  };

  const activeWidgetMeta = activeDragKey ? (resolveWidgetKey(activeDragKey) ?? null) : null;

  const renderWidgetContent = (widget: (typeof visibleWidgets)[number]) =>
    widget.render({
      config,
      viewModel,
      t,
      intlLocale,
      isMd,
      isLg,
      greetingKey,
      closeChecklist,
      isEditing,
      widgetKey: widget.key,
    });

  const gridContent = (
    <div
      ref={isEditing ? setDroppableRef : undefined}
      className={
        isEditing
          ? "wp-react-ui-dashboard-grid wp-react-ui-edit-mode"
          : "wp-react-ui-dashboard-grid"
      }
    >
      {cardWidgets.map((widget) => (
        <SortableWidgetCard key={widget.key} widget={widget} t={t}>
          {renderWidgetContent(widget)}
        </SortableWidgetCard>
      ))}
    </div>
  );

  // When editing, don't wrap in DndContext — EditModeChrome provides it.
  const dndGrid = isEditing ? (
    gridContent
  ) : (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={cardWidgets.map((w) => w.key)} strategy={verticalListSortingStrategy}>
        {gridContent}
      </SortableContext>
      <DragOverlay dropAnimation={null} modifiers={[restrictToVerticalAxis]}>
        {activeWidgetMeta && (
          <div className="wp-react-ui-drag-overlay" aria-hidden="true">
            <div className="wp-react-ui-sortable-widget widget--full">
              <span className="wp-react-ui-drag-handle" aria-hidden="true">
                <HolderOutlined style={{ fontSize: 16 }} />
              </span>
              {activeWidgetMeta.render({
                config,
                viewModel,
                t,
                intlLocale,
                isMd,
                isLg,
                greetingKey,
                closeChecklist,
                isEditing: false,
                widgetKey: activeWidgetMeta.key,
              })}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );

  return (
    <div className="wp-react-ui-dashboard">
      {heroWidget && (
        <div className="wp-react-ui-dashboard__hero">
          {heroWidget.render({
            config,
            viewModel,
            t,
            intlLocale,
            isMd,
            isLg,
            greetingKey,
            closeChecklist,
            isEditing,
            widgetKey: "hero",
          })}
        </div>
      )}
      {dndGrid}
    </div>
  );
}

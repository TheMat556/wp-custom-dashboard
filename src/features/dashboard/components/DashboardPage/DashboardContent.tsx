import { useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";
import { useStore } from "zustand";
import type { WpReactUiConfig } from "../../../../types/wp";
import { shellPreferencesStore } from "../../../shell/store/shellPreferencesStore";
import type { DashboardViewModel } from "../../dashboardViewModel";
import { dashboardEditModeStore } from "../../store/dashboardEditModeStore";
import { getVisibleWidgets } from "../../widgets/widgetRegistry";
import { DASHBOARD_GRID_DROPPABLE_ID } from "./components/DashboardGrid";
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

  const draftOrder = useStore(dashboardEditModeStore, (s) => s.draft.order);
  const draftHidden = useStore(dashboardEditModeStore, (s) => s.draft.hidden);

  const order = isEditing ? draftOrder : persistedOrder;
  const hiddenKeys = isEditing ? draftHidden : persistedHidden;

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

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: DASHBOARD_GRID_DROPPABLE_ID,
    disabled: !isEditing,
  });

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
      {gridContent}
    </div>
  );
}

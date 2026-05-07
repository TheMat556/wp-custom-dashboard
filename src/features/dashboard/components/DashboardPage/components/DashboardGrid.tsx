import { useDroppable } from "@dnd-kit/core";
import { useStore } from "zustand";
import { shellPreferencesStore } from "../../../../shell/store/shellPreferencesStore";
import { dashboardEditModeStore } from "../../../store/dashboardEditModeStore";
import type { DashboardWidgetMeta, WidgetRenderProps } from "../../../widgets/widgetRegistry";
import { SortableWidgetCard } from "./edit/SortableWidgetCard";

export const DASHBOARD_GRID_DROPPABLE_ID = "grid";

interface DashboardGridProps extends WidgetRenderProps {
  widgets: DashboardWidgetMeta[];
  isEditing?: boolean;
}

function GridDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: DASHBOARD_GRID_DROPPABLE_ID });
  return (
    <div ref={setNodeRef} className="wp-react-ui-dashboard-grid wp-react-ui-edit-mode">
      {children}
    </div>
  );
}

export function DashboardGrid({ widgets, isEditing, ...renderProps }: DashboardGridProps) {
  const persistedSizes = useStore(shellPreferencesStore, (s) => s.dashboardWidgetSizes);
  const draftSizes = useStore(dashboardEditModeStore, (s) => s.draft.widgetSizes);

  const sizes = isEditing ? draftSizes : persistedSizes;

  const renderWidget = (widget: DashboardWidgetMeta) => {
    const size = sizes[widget.key] ?? widget.defaultSize;
    // Pass the actual widget key (which may be a container instance key) together
    // with the edit mode flag so widgets can adapt their rendering.
    const widgetContent = widget.render({
      ...renderProps,
      widgetKey: widget.key,
      isEditing,
    });

    if (isEditing) {
      return (
        <SortableWidgetCard key={widget.key} widget={widget} t={renderProps.t}>
          {widgetContent}
        </SortableWidgetCard>
      );
    }

    return (
      <div key={widget.key} className={`widget--${size}`} data-widget-key={widget.key}>
        {widgetContent}
      </div>
    );
  };

  if (isEditing) {
    return <GridDropZone>{widgets.map(renderWidget)}</GridDropZone>;
  }

  return <div className="wp-react-ui-dashboard-grid">{widgets.map(renderWidget)}</div>;
}

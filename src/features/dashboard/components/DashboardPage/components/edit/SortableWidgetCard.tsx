import { DeleteOutlined, HolderOutlined } from "@ant-design/icons";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Segmented, Tooltip } from "antd";
import { useCallback } from "react";
import { useStore } from "zustand";
import { shellPreferencesStore } from "../../../../../shell/store/shellPreferencesStore";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";
import type { DashboardWidgetMeta, WidgetSize } from "../../../../widgets/widgetRegistry";

const SIZE_LABELS: Record<WidgetSize, string> = {
  "1x": "1×",
  "2x": "2×",
  half: "Half",
  full: "Full",
};

interface SortableWidgetCardProps {
  widget: DashboardWidgetMeta;
  children: React.ReactNode;
}

export function SortableWidgetCard({ widget, children }: SortableWidgetCardProps) {
  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
    transform,
    active,
  } = useDraggable({
    id: widget.key,
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: widget.key,
  });

  // Merge both refs onto the same element (draggable + droppable in one).
  const mergedRef = useCallback(
    (node: HTMLElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef]
  );

  const setDashboardWidgetSize = useStore(shellPreferencesStore, (s) => s.setDashboardWidgetSize);
  const widgetOrder = useStore(shellPreferencesStore, (s) => s.dashboardWidgetOrder);
  const setOrder = useStore(shellPreferencesStore, (s) => s.setDashboardWidgetOrder);
  const toggleWidgetVisibility = useStore(shellPreferencesStore, (s) => s.toggleWidgetVisibility);
  const currentSize = useStore(shellPreferencesStore, (s) => s.dashboardWidgetSizes[widget.key]);
  const hiddenWidgets = useStore(shellPreferencesStore, (s) => s.hiddenWidgets);
  const isEditing = useStore(dashboardEditModeStore, (s) => s.isEditing);

  const isDragging = active?.id === widget.key;

  // When this card is being dragged, keep it stationary in the grid (no
  // transform movement) so the grid layout stays stable. The DragOverlay
  // follows the cursor instead. Only show a faded placeholder in-place.
  const style = isDragging
    ? {
        opacity: 0.4,
      }
    : {
        transform: CSS.Transform.toString(transform),
      };

  const size = currentSize ?? widget.defaultSize;
  const canResize = widget.allowedSizes.length > 1;

  // Hide size control on mobile (≤ 767px)
  const showSizeControl = canResize && typeof window !== "undefined" && window.innerWidth > 767;

  const stopDragPointer = (event: React.PointerEvent) => {
    event.stopPropagation();
  };

  /** Removes the widget from the dashboard entirely (bin icon). */
  const handleDelete = useCallback(() => {
    // Remove from widget order
    const next = widgetOrder.filter((k) => k !== widget.key);
    setOrder(next);
    // Mark as hidden so mergeWidgetOrder filters it out. Order matters:
    // mergeWidgetOrder appends registry keys not in order, so removing from
    // order alone isn't enough — it would just reappear. Adding to
    // hiddenWidgets ensures getVisibleWidgets filters it out.
    if (widgetOrder.includes(widget.key) && !hiddenWidgets.includes(widget.key)) {
      toggleWidgetVisibility(widget.key);
    }
  }, [widget.key, widgetOrder, setOrder, toggleWidgetVisibility, hiddenWidgets]);

  const overClass = isOver ? " wp-react-ui-sortable--over" : "";
  const draggingClass = isDragging ? " wp-react-ui-sortable--dragging" : "";

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: role="button" is provided by {...attributes} from useDraggable
    <div
      ref={mergedRef}
      style={style}
      className={`widget--${size} wp-react-ui-sortable-widget${overClass}${draggingClass}${isEditing ? " wp-react-ui-sortable-widget--editing" : ""}`}
      aria-label="Drag to reorder"
      {...attributes}
      {...(isEditing ? listeners : {})}
    >
      {children}

      {/* Edit-mode overlays — drag handle + controls float above the widget so
          they don't displace its layout. */}
      {isEditing && (
        <>
          <span className="wp-react-ui-drag-handle" aria-hidden="true" title="Drag to reorder">
            <HolderOutlined style={{ fontSize: 14 }} />
          </span>

          <div
            className="wp-react-ui-widget-controls"
            onPointerDown={stopDragPointer}
            onPointerMove={stopDragPointer}
            onPointerUp={stopDragPointer}
          >
            {showSizeControl && (
              <Segmented
                size="small"
                options={widget.allowedSizes.map((s) => ({ value: s, label: SIZE_LABELS[s] }))}
                value={size}
                onChange={(val) => setDashboardWidgetSize(widget.key, val as WidgetSize)}
                aria-label="Size"
              />
            )}
            {widget.hidableByUser && (
              <Tooltip title="Remove from dashboard">
                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label="Remove from dashboard"
                  className="wp-react-ui-delete-btn"
                >
                  <DeleteOutlined />
                </button>
              </Tooltip>
            )}
          </div>
        </>
      )}
    </div>
  );
}

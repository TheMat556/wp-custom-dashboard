import { DeleteOutlined, HolderOutlined } from "@ant-design/icons";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Segmented, Tooltip } from "antd";
import { useCallback } from "react";
import { useStore } from "zustand";
import { shellPreferencesStore } from "../../../../../shell/store/shellPreferencesStore";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";
import type { DashboardWidgetMeta, WidgetSize } from "../../../../widgets/widgetRegistry";
import type { TFunc } from "../../types";

interface SortableWidgetCardProps {
  widget: DashboardWidgetMeta;
  children: React.ReactNode;
  t: TFunc;
}

export function SortableWidgetCard({ widget, children, t }: SortableWidgetCardProps) {
  const SIZE_LABELS: Record<WidgetSize, string> = {
    "1x": t("1×"),
    "2x": t("2×"),
    half: t("Half"),
    full: t("Full"),
  };
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

  const setDraftWidgetSize = useStore(dashboardEditModeStore, (s) => s.setDraftWidgetSize);
  const draftOrder = useStore(dashboardEditModeStore, (s) => s.draft.order);
  const setDraftOrder = useStore(dashboardEditModeStore, (s) => s.setDraftOrder);
  const toggleDraftVisibility = useStore(dashboardEditModeStore, (s) => s.toggleDraftVisibility);
  const draftSize = useStore(dashboardEditModeStore, (s) => s.draft.widgetSizes[widget.key]);
  const persistedSize = useStore(shellPreferencesStore, (s) => s.dashboardWidgetSizes[widget.key]);
  const hiddenWidgets = useStore(dashboardEditModeStore, (s) => s.draft.hidden);
  const isEditing = useStore(dashboardEditModeStore, (s) => s.isEditing);

  const currentSize = isEditing ? draftSize : persistedSize;

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

  const stopDragPointer = (event: React.PointerEvent) => {
    event.stopPropagation();
  };

  /** Removes the widget from the dashboard draft (bin icon). */
  const handleDelete = useCallback(() => {
    // Remove from order AND mark as hidden so "Undo" / catalogue restore works.
    // Both state changes are needed: removing from order hides it from the grid,
    // and marking it hidden lets the catalogue show it as "addable".
    const next = draftOrder.filter((k) => k !== widget.key);
    setDraftOrder(next);
    if (draftOrder.includes(widget.key) && !hiddenWidgets.includes(widget.key)) {
      toggleDraftVisibility(widget.key);
    }
  }, [widget.key, draftOrder, setDraftOrder, toggleDraftVisibility, hiddenWidgets]);

  const overClass = isOver ? " wp-react-ui-sortable--over" : "";
  const draggingClass = isDragging ? " wp-react-ui-sortable--dragging" : "";

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: role="button" is provided by {...attributes} from useDraggable
    <div
      ref={mergedRef}
      style={style}
      className={`widget--${size} wp-react-ui-sortable-widget${overClass}${draggingClass}${isEditing ? " wp-react-ui-sortable-widget--editing" : ""}`}
      aria-label={t("Drag to reorder")}
      {...attributes}
      {...(isEditing ? listeners : {})}
    >
      {children}

      {/* Edit-mode overlays — drag handle + controls float above the widget so
          they don't displace its layout. */}
      {isEditing && (
        <>
          <span className="wp-react-ui-drag-handle" aria-hidden="true" title={t("Drag to reorder")}>
            <HolderOutlined style={{ fontSize: 14 }} />
          </span>

          <div
            className="wp-react-ui-widget-controls"
            onPointerDown={stopDragPointer}
            onPointerMove={stopDragPointer}
            onPointerUp={stopDragPointer}
          >
            {canResize && (
              <Segmented
                size="small"
                options={widget.allowedSizes.map((s) => ({ value: s, label: SIZE_LABELS[s] }))}
                value={size}
                onChange={(val) => setDraftWidgetSize(widget.key, val as WidgetSize)}
                aria-label={t("Size")}
              />
            )}
            {widget.hidableByUser && (
              <Tooltip title={t("Remove from dashboard")}>
                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label={t("Remove from dashboard")}
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

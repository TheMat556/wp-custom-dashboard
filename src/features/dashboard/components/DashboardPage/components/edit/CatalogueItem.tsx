import { AppstoreOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import { useDraggable } from "@dnd-kit/core";
import { Button, Tooltip } from "antd";
import type { DashboardWidgetMeta } from "../../../../widgets/widgetRegistry";

export type CatalogueItemStatus = "visible" | "hidden" | "ineligible";

export interface CatalogueItemProps {
  widget: DashboardWidgetMeta;
  status: CatalogueItemStatus;
  ineligibleReason?: string;
  onAdd: (key: string) => void;
}

const STATUS_LABEL: Record<CatalogueItemStatus, string> = {
  visible: "On grid",
  hidden: "Hidden",
  ineligible: "Unavailable",
};

const STATUS_DOT_CLASS: Record<CatalogueItemStatus, string> = {
  visible: "wp-react-ui-catalogue-item__dot--on",
  hidden: "wp-react-ui-catalogue-item__dot--off",
  ineligible: "wp-react-ui-catalogue-item__dot--ineligible",
};

export function CatalogueItem({ widget, status, ineligibleReason, onAdd }: CatalogueItemProps) {
  const draggable = useDraggable({
    id: `catalogue:${widget.key}`,
    disabled: status === "ineligible" || status === "visible",
    data: { source: "catalogue", widgetKey: widget.key },
  });

  const isDisabled = status === "ineligible";
  const canAdd = status === "hidden";

  const item = (
    <div
      ref={draggable.setNodeRef}
      className={`wp-react-ui-catalogue-item${isDisabled ? " wp-react-ui-catalogue-item--disabled" : ""}`}
      data-status={status}
      style={{ opacity: draggable.isDragging ? 0.4 : 1 }}
    >
      <span className="wp-react-ui-catalogue-item__icon" aria-hidden="true">
        <AppstoreOutlined />
      </span>
      <div className="wp-react-ui-catalogue-item__body">
        <span className="wp-react-ui-catalogue-item__label">{widget.label}</span>
        <span className="wp-react-ui-catalogue-item__status">
          <span className={`wp-react-ui-catalogue-item__dot ${STATUS_DOT_CLASS[status]}`} />
          {STATUS_LABEL[status]}
        </span>
      </div>
      <div className="wp-react-ui-catalogue-item__actions">
        {canAdd && (
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => onAdd(widget.key)}
            aria-label={`Add ${widget.label}`}
          >
            Add
          </Button>
        )}
        {!isDisabled && status !== "visible" && (
          <button
            type="button"
            className="wp-react-ui-catalogue-item__handle"
            aria-label={`Drag ${widget.label} to grid`}
            {...draggable.listeners}
            {...draggable.attributes}
          >
            <HolderOutlined />
          </button>
        )}
      </div>
    </div>
  );

  if (isDisabled && ineligibleReason) {
    return <Tooltip title={ineligibleReason}>{item}</Tooltip>;
  }
  return item;
}

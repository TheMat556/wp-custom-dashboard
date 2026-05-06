import {
  AppstoreAddOutlined,
  CheckOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { Button, Modal, Tooltip } from "antd";
import { useStore } from "zustand";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";

interface EditModeBarProps {
  onToggleCatalogue?: () => void;
}

export function EditModeBar({ onToggleCatalogue }: EditModeBarProps = {}) {
  const isEditing = useStore(dashboardEditModeStore, (s) => s.isEditing);
  const exitEditing = useStore(dashboardEditModeStore, (s) => s.exitEditing);
  const discardEditing = useStore(dashboardEditModeStore, (s) => s.discardEditing);
  const resetDraftLayout = useStore(dashboardEditModeStore, (s) => s.resetDraftLayout);

  if (!isEditing) return null;

  const handleReset = () => {
    Modal.confirm({
      title: "Reset dashboard?",
      content:
        "This restores the default order, sizes, and visibility. Favorites and recent pages stay untouched.",
      okText: "Reset",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => {
        resetDraftLayout();
      },
    });
  };

  return (
    <div className="wp-react-ui-edit-bar">
      <span className="wp-react-ui-edit-bar__label">Customize</span>
      <Tooltip title="Drag widgets to reorder. Use the controls to show/hide or resize widgets.">
        <QuestionCircleOutlined className="wp-react-ui-edit-bar__help" />
      </Tooltip>
      <span className="wp-react-ui-edit-bar__divider" />
      {onToggleCatalogue && (
        <Button size="small" icon={<AppstoreAddOutlined />} onClick={onToggleCatalogue}>
          Browse
        </Button>
      )}
      <Button size="small" icon={<UndoOutlined />} onClick={handleReset}>
        Reset
      </Button>
      <Button size="small" icon={<CloseOutlined />} onClick={discardEditing}>
        Cancel
      </Button>
      <Button size="small" type="primary" icon={<CheckOutlined />} onClick={exitEditing}>
        Done
      </Button>
    </div>
  );
}

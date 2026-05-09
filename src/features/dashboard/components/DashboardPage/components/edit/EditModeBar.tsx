import {
  AppstoreAddOutlined,
  CheckOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { App, Button, Tooltip } from "antd";
import { useStore } from "zustand";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";
import type { TFunc } from "../../types";

interface EditModeBarProps {
  onToggleCatalogue?: () => void;
  t: TFunc;
}

export function EditModeBar({ onToggleCatalogue, t }: EditModeBarProps) {
  const isEditing = useStore(dashboardEditModeStore, (s) => s.isEditing);
  const exitEditing = useStore(dashboardEditModeStore, (s) => s.exitEditing);
  const discardEditing = useStore(dashboardEditModeStore, (s) => s.discardEditing);
  const resetDraftLayout = useStore(dashboardEditModeStore, (s) => s.resetDraftLayout);
  const { modal } = App.useApp();

  if (!isEditing) return null;

  const handleReset = () => {
    modal.confirm({
      title: t("Reset dashboard?"),
      content: t(
        "This restores the default order, sizes, and visibility. Favorites and recent pages stay untouched."
      ),
      okText: t("Reset"),
      cancelText: t("Cancel"),
      okButtonProps: { danger: true },
      onOk: () => {
        resetDraftLayout();
      },
    });
  };

  return (
    <div className="wp-react-ui-edit-bar">
      <span className="wp-react-ui-edit-bar__label">{t("Customize")}</span>
      <Tooltip
        title={t("Drag widgets to reorder. Use the controls to show/hide or resize widgets.")}
      >
        <QuestionCircleOutlined className="wp-react-ui-edit-bar__help" />
      </Tooltip>
      <span className="wp-react-ui-edit-bar__divider" />
      {onToggleCatalogue && (
        <Button size="small" icon={<AppstoreAddOutlined />} onClick={onToggleCatalogue}>
          {t("Browse")}
        </Button>
      )}
      <Button size="small" icon={<UndoOutlined />} onClick={handleReset}>
        {t("Reset")}
      </Button>
      <Button size="small" icon={<CloseOutlined />} onClick={discardEditing}>
        {t("Cancel")}
      </Button>
      <Button size="small" type="primary" icon={<CheckOutlined />} onClick={exitEditing}>
        {t("Done")}
      </Button>
    </div>
  );
}

import { EditOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useStore } from "zustand";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";
import type { TFunc } from "../../../types";

interface EditModeToggleProps {
  t: TFunc;
}

export function EditModeToggle({ t }: EditModeToggleProps) {
  const isEditing = useStore(dashboardEditModeStore, (s) => s.isEditing);
  const toggleEditing = useStore(dashboardEditModeStore, (s) => s.toggleEditing);

  if (isEditing) return null;

  return (
    <Button icon={<EditOutlined />} onClick={toggleEditing} aria-label={t("Edit dashboard")}>
      {t("Edit dashboard")}
    </Button>
  );
}

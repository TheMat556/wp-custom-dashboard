import { EditOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useStore } from "zustand";
import { dashboardEditModeStore } from "../../../../store/dashboardEditModeStore";

export function EditModeToggle() {
  const isEditing = useStore(dashboardEditModeStore, (s) => s.isEditing);
  const toggleEditing = useStore(dashboardEditModeStore, (s) => s.toggleEditing);

  if (isEditing) return null;

  return (
    <Button icon={<EditOutlined />} onClick={toggleEditing} aria-label="Edit dashboard">
      Edit dashboard
    </Button>
  );
}

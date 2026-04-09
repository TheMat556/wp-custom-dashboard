import { memo, useCallback } from "react";
import { useStore } from "zustand";
import type { MenuItem } from "../../../../types/menu";
import { menuCountsStore } from "../../../navigation/store/menuCountsStore";
import BottomActions from "./BottomActions";
import { Logo } from "./Logo";
import { NavTree } from "./NavTree";
import { useNavModel } from "./useNavModel";

export const SidebarContent = memo(function SidebarContent({
  collapsed,
  menuItems,
  activeKey,
  openKeys,
  onOpenChange,
  onMenuClick,
  onParentClick,
  loading,
  onRefresh,
  showClose,
  onClose,
  adminUrl,
}: {
  collapsed: boolean;
  menuItems: MenuItem[];
  activeKey?: string;
  openKeys: string[];
  onOpenChange: (keys: string[]) => void;
  onMenuClick: (key: string) => void;
  onParentClick?: (key: string) => void;
  loading: boolean;
  onRefresh: () => void;
  showClose?: boolean;
  onClose?: () => void;
  adminUrl?: string;
}) {
  const counts = useStore(menuCountsStore, (state) => state.counts);
  const previousCounts = useStore(menuCountsStore, (state) => state.previousCounts);
  const sections = useNavModel(menuItems, activeKey, counts, collapsed, previousCounts);

  const handleToggle = useCallback(
    (slug: string) => {
      if (collapsed && onParentClick) {
        onParentClick(slug);
        return;
      }
      const isOpen = openKeys.includes(slug);
      onOpenChange(isOpen ? openKeys.filter((k) => k !== slug) : [slug]);
    },
    [collapsed, onParentClick, openKeys, onOpenChange],
  );

  return (
    <div
      className="wp-react-ui-sidebar-shell"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--shell-chrome-bg)",
      }}
    >
      <Logo collapsed={collapsed} showClose={showClose} onClose={onClose} />

      <div
        className="wp-react-ui-sidebar-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <NavTree
          sections={sections}
          collapsed={collapsed}
          openKeys={openKeys}
          adminUrl={adminUrl}
          onNavigate={onMenuClick}
          onToggle={handleToggle}
        />
      </div>

      <BottomActions collapsed={collapsed} loading={loading} onRefresh={onRefresh} />
    </div>
  );
});

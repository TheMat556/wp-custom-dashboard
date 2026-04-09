import { memo } from "react";
import NavSection from "./NavSection";
import type { NavModelSection } from "./useNavModel";

interface NavTreeProps {
  sections: NavModelSection[];
  collapsed: boolean;
  openKeys: string[];
  adminUrl?: string;
  onNavigate: (slug: string) => void;
  onToggle: (slug: string) => void;
}

export const NavTree = memo(function NavTree({
  sections,
  collapsed,
  openKeys,
  adminUrl,
  onNavigate,
  onToggle,
}: NavTreeProps) {
  return (
    <nav className="wp-react-ui-nav-tree" aria-label="Admin menu">
      {sections.map((section) => (
        <NavSection
          key={section.id}
          section={section}
          collapsed={collapsed}
          openKeys={openKeys}
          adminUrl={adminUrl}
          onNavigate={onNavigate}
          onToggle={onToggle}
        />
      ))}
    </nav>
  );
});

export default NavTree;

import { memo } from "react";
import NavItem from "./NavItem";
import type { NavModelSection } from "./useNavModel";

interface NavSectionProps {
  section: NavModelSection;
  collapsed: boolean;
  openKeys: string[];
  adminUrl?: string;
  onNavigate: (slug: string) => void;
  onToggle: (slug: string) => void;
}

export const NavSection = memo(function NavSection({
  section,
  collapsed,
  openKeys,
  adminUrl,
  onNavigate,
  onToggle,
}: NavSectionProps) {
  return (
    <section className="wp-react-ui-nav-section" aria-label={section.label}>
      {!collapsed ? (
        <div className="wp-react-ui-nav-section__label" aria-hidden="true">
          {section.label}
        </div>
      ) : (
        <div className="wp-react-ui-nav-section__divider" aria-hidden="true" />
      )}

      <ul className="wp-react-ui-nav-list">
        {section.items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            expanded={openKeys.includes(item.slug) || item.isActiveBranch}
            adminUrl={adminUrl}
            onNavigate={onNavigate}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </section>
  );
});

export default NavSection;

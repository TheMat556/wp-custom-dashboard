import type { MenuProps } from "antd";
import type { MenuItem, SubMenuItem } from "../../types/menu";
import { resolveIcon } from "./iconMap";
import { type BadgeType, getBadgeTypeForItem, IconWithBadge, MenuLabel } from "./MenuLabel";

function buildIconElement(
  item: MenuItem,
  collapsed: boolean,
  parentCount: number | null,
  badgeType: BadgeType
) {
  if (!collapsed) return resolveIcon(item.icon);
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <IconWithBadge icon={resolveIcon(item.icon)} count={parentCount} badgeType={badgeType} />
    </span>
  );
}

function buildParentLabel(
  item: MenuItem,
  collapsed: boolean,
  parentCount: number | null,
  badgeType: BadgeType
) {
  if (collapsed) return null;
  return <MenuLabel label={item.label} count={parentCount} badgeType={badgeType} />;
}

function buildChildItems(children: SubMenuItem[]) {
  return children.map((child) => ({
    key: child.slug,
    label: (
      <MenuLabel
        label={child.label}
        count={child.count}
        badgeType={getBadgeTypeForItem(child.slug)}
        isSubmenu
      />
    ),
  }));
}

function buildTitleClick(collapsed: boolean, slug: string, onParentClick?: (key: string) => void) {
  if (!collapsed || !onParentClick) return undefined;
  return ({ domEvent }: { domEvent: React.MouseEvent }) => {
    domEvent.preventDefault();
    domEvent.stopPropagation();
    onParentClick(slug);
  };
}

export function transformMenuItems(
  menuItems: MenuItem[],
  collapsed: boolean,
  onParentClick?: (key: string) => void
): MenuProps["items"] {
  return menuItems.map((item) => {
    const hasChildren = (item.children ?? []).length > 0;
    const totalChildCount = hasChildren
      ? (item.children ?? []).reduce((acc, c) => acc + (c.count ?? 0), 0)
      : 0;
    const parentCount = item.count ?? (totalChildCount > 0 ? totalChildCount : null);
    const badgeType = getBadgeTypeForItem(item.slug);

    const base = {
      key: item.slug,
      icon: buildIconElement(item, collapsed, parentCount, badgeType),
      title: item.label,
      label: buildParentLabel(item, collapsed, parentCount, badgeType),
    };

    if (!hasChildren) return base;

    return {
      ...base,
      onTitleClick: buildTitleClick(collapsed, item.slug, onParentClick),
      children: buildChildItems(item.children ?? []),
    };
  });
}

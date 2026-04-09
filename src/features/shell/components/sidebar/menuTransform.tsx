import type { MenuProps } from "antd";
import type { MenuItem, SubMenuItem } from "../../../../types/menu";
import { menuCountsStore } from "../../../navigation/store/menuCountsStore";
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
  badgeType: BadgeType,
  animate = false
) {
  if (collapsed) return null;
  return <MenuLabel label={item.label} count={parentCount} badgeType={badgeType} animate={animate} />;
}

function buildChildItems(children: SubMenuItem[], liveCounts: Record<string, number>) {
  return children.map((child) => ({
    key: child.slug,
    label: (
      <MenuLabel
        label={child.label}
        count={liveCounts[child.slug] ?? child.count}
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
  const { counts: liveCounts, previousCounts } = menuCountsStore.getState();

  return menuItems.map((item) => {
    const hasChildren = (item.children ?? []).length > 0;
    // Use live count if available, falling back to static count.
    const liveCount = liveCounts[item.slug];
    const totalChildCount = hasChildren
      ? (item.children ?? []).reduce((acc, c) => acc + (liveCounts[c.slug] ?? c.count ?? 0), 0)
      : 0;
    const parentCount = liveCount ?? item.count ?? (totalChildCount > 0 ? totalChildCount : null);
    const badgeType = getBadgeTypeForItem(item.slug);

    // Detect if count changed for animation.
    const prevCount = previousCounts[item.slug] ?? null;
    const countChanged = parentCount !== null && prevCount !== null && parentCount !== prevCount;

    const base = {
      key: item.slug,
      icon: buildIconElement(item, collapsed, parentCount, badgeType),
      title: item.label,
      label: buildParentLabel(item, collapsed, parentCount, badgeType, countChanged),
    };

    if (!hasChildren) return base;

    return {
      ...base,
      onTitleClick: buildTitleClick(collapsed, item.slug, onParentClick),
      children: buildChildItems(item.children ?? [], liveCounts),
    };
  });
}

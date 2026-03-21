import type { MenuProps } from "antd";
import type { MenuItem, SubMenuItem } from "../../hooks/useMenu";
import { MenuLabel, IconWithBadge, getBadgeTypeForItem } from "./MenuLabel";
import { resolveIcon } from "./iconMap";

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

    const parentCount =
      item.count ?? (totalChildCount > 0 ? totalChildCount : null);

    const badgeType = getBadgeTypeForItem(item.slug);

    const iconElement = collapsed ? (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <IconWithBadge
          icon={resolveIcon(item.icon)}
          count={parentCount}
          badgeType={badgeType}
        />
      </span>
    ) : (
      resolveIcon(item.icon)
    );

    const parentLabel = collapsed ? null : (
      <MenuLabel label={item.label} count={parentCount} badgeType={badgeType} />
    );

    if (hasChildren) {
      return {
        key: item.slug,
        icon: iconElement,
        title: item.label,
        label: parentLabel,
        onTitleClick:
          collapsed && onParentClick
            ? ({ domEvent }) => {
                domEvent.preventDefault();
                domEvent.stopPropagation();
                onParentClick(item.slug);
              }
            : undefined,
        children: item.children?.map((child: SubMenuItem) => {
          const childBadgeType = getBadgeTypeForItem(child.slug);
          return {
            key: child.slug,
            label: (
              <MenuLabel
                label={child.label}
                count={child.count}
                badgeType={childBadgeType}
                isSubmenu
              />
            ),
          };
        }),
      };
    }

    return {
      key: item.slug,
      icon: iconElement,
      title: item.label,
      label: parentLabel,
    };
  });
}

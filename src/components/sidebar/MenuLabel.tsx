import { Badge, Flex, theme } from "antd";
import type { ReactNode } from "react";

export type BadgeType = "default" | "primary" | "warning" | "danger";

export function getBadgeColor(
  type: BadgeType,
  token: ReturnType<typeof theme.useToken>["token"]
): string {
  switch (type) {
    case "primary":
      return token.colorPrimary;
    case "warning":
      return token.colorWarning;
    case "danger":
      return token.colorError;
    default:
      return token.colorPrimary;
  }
}

export interface MenuLabelProps {
  label: string;
  count?: number | null;
  badgeType?: BadgeType;
  isSubmenu?: boolean;
}

export function MenuLabel({
  label,
  count,
  badgeType = "primary",
  isSubmenu = false,
}: MenuLabelProps) {
  const { token } = theme.useToken();
  const hasCount = count != null && count > 0;

  return (
    <Flex justify="space-between" align="center" gap={8} style={{ width: "100%", minWidth: 0 }}>
      <span
        className={isSubmenu ? "wp-react-ui-sidebar-submenu-label" : "wp-react-ui-sidebar-menu-label"}
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {label}
      </span>
      {hasCount && (
        <Badge
          count={count}
          overflowCount={99}
          size="small"
          color={isSubmenu ? token.colorPrimaryBg : getBadgeColor(badgeType, token)}
          aria-label={`${count} pending`}
          style={{
            color: isSubmenu ? token.colorPrimary : "#fff",
            fontWeight: 600,
            fontSize: 11,
          }}
        />
      )}
    </Flex>
  );
}

export interface IconWithBadgeProps {
  icon: ReactNode;
  count?: number | null;
  badgeType?: BadgeType;
}

export function IconWithBadge({ icon, count, badgeType = "primary" }: IconWithBadgeProps) {
  const { token } = theme.useToken();
  const hasCount = count != null && count > 0;

  if (!hasCount) return <>{icon}</>;

  return (
    <Badge
      dot
      offset={[-2, 4]}
      aria-label="Has notifications"
      style={{
        backgroundColor: getBadgeColor(badgeType, token),
        boxShadow: `0 0 0 2px ${token.colorBgContainer}`,
      }}
    >
      {icon}
    </Badge>
  );
}

export function getBadgeTypeForItem(slug: string): BadgeType {
  if (slug.includes("update") || slug.includes("plugin")) return "warning";
  if (slug.includes("comment") || slug.includes("spam")) return "danger";
  return "primary";
}

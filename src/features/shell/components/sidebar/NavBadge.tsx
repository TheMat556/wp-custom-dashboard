import { Badge } from "antd";
import { memo } from "react";
import type { NavBadgeTone } from "./useNavModel";

const BADGE_CLASS_BY_TONE: Record<NavBadgeTone, string> = {
  primary: "wp-react-ui-nav-badge--primary",
  warning: "wp-react-ui-nav-badge--warning",
  danger: "wp-react-ui-nav-badge--danger",
};

interface NavBadgeProps {
  count: number;
  tone: NavBadgeTone;
  pulse?: boolean;
}

export const NavBadge = memo(function NavBadge({ count, tone, pulse = false }: NavBadgeProps) {
  return (
    <span
      className={[
        "wp-react-ui-nav-badge",
        BADGE_CLASS_BY_TONE[tone],
        pulse ? "wp-react-ui-nav-badge--pulse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Badge count={count} overflowCount={99} size="small" />
    </span>
  );
});

export default NavBadge;

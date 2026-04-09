import { DownOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { memo } from "react";
import { cancelPrefetch, startPrefetch } from "../../../../utils/prefetch";
import { resolveIcon } from "./iconMap";
import NavBadge from "./NavBadge";
import type { NavModelItem } from "./useNavModel";

interface NavItemProps {
  item: NavModelItem;
  collapsed: boolean;
  expanded: boolean;
  adminUrl?: string;
  onNavigate: (slug: string) => void;
  onToggle: (slug: string) => void;
}

function handlePrefetchStart(item: NavModelItem, adminUrl?: string) {
  if (!adminUrl || item.children.length > 0) {
    return;
  }

  startPrefetch(item.slug, adminUrl);
}

export const NavItem = memo(function NavItem({
  item,
  collapsed,
  expanded,
  adminUrl,
  onNavigate,
  onToggle,
}: NavItemProps) {
  const hasChildren = item.children.length > 0;
  const childListId = hasChildren ? `${item.slug}-children` : undefined;

  const button = (
    <button
      type="button"
      className={[
        "wp-react-ui-nav-item__button",
        item.isActive ? "wp-react-ui-nav-item__button--active" : "",
        !item.isActive && item.isActiveBranch ? "wp-react-ui-nav-item__button--active-branch" : "",
        collapsed ? "wp-react-ui-nav-item__button--collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        if (hasChildren) {
          onToggle(item.slug);
          return;
        }

        onNavigate(item.slug);
      }}
      onMouseEnter={() => handlePrefetchStart(item, adminUrl)}
      onMouseLeave={() => cancelPrefetch()}
      onFocus={() => handlePrefetchStart(item, adminUrl)}
      onBlur={() => cancelPrefetch()}
      aria-current={item.isActive ? "page" : undefined}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-controls={hasChildren && expanded ? childListId : undefined}
      title={collapsed ? item.label : undefined}
    >
      <span className="wp-react-ui-nav-item__rail" aria-hidden="true" />
      <span className="wp-react-ui-nav-item__icon" aria-hidden="true">
        {resolveIcon(item.icon)}
        {collapsed && item.showCollapsedBadge ? (
          <span className="wp-react-ui-nav-item__icon-badge" aria-hidden="true" />
        ) : null}
      </span>
      {!collapsed && (
        <>
          <span className="wp-react-ui-nav-item__label">{item.label}</span>
          <span className="wp-react-ui-nav-item__meta">
            {item.count !== null && item.count > 0 ? (
              <NavBadge count={item.count} tone={item.badgeTone} pulse={item.countChanged} />
            ) : null}
            {hasChildren ? (
              <span
                className={[
                  "wp-react-ui-nav-item__chevron",
                  expanded ? "wp-react-ui-nav-item__chevron--open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              >
                <DownOutlined />
              </span>
            ) : null}
          </span>
        </>
      )}
    </button>
  );

  return (
    <li
      className={
        item.children.length > 0
          ? "wp-react-ui-nav-item wp-react-ui-nav-item--group"
          : "wp-react-ui-nav-item"
      }
    >
      {collapsed ? (
        <Tooltip placement="right" title={item.label}>
          {button}
        </Tooltip>
      ) : (
        button
      )}

      {hasChildren && !collapsed && expanded ? (
        <div className="wp-react-ui-nav-item__children wp-react-ui-nav-item__children--open">
          <div className="wp-react-ui-nav-item__children-inner">
            <ul id={childListId} className="wp-react-ui-nav-sublist">
              {item.children.map((child) => (
                <li key={child.id} className="wp-react-ui-nav-subitem">
                  <button
                    type="button"
                    className={[
                      "wp-react-ui-nav-subitem__button",
                      child.isActive ? "wp-react-ui-nav-subitem__button--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onNavigate(child.slug)}
                    onMouseEnter={() => handlePrefetchStart(child, adminUrl)}
                    onMouseLeave={() => cancelPrefetch()}
                    onFocus={() => handlePrefetchStart(child, adminUrl)}
                    onBlur={() => cancelPrefetch()}
                    aria-current={child.isActive ? "page" : undefined}
                  >
                    <span className="wp-react-ui-nav-subitem__label">{child.label}</span>
                    {child.count !== null && child.count > 0 ? (
                      <NavBadge
                        count={child.count}
                        tone={child.badgeTone}
                        pulse={child.countChanged}
                      />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </li>
  );
});

export default NavItem;

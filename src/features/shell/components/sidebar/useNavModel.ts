import { useMemo } from "react";
import type { MenuItem, SubMenuItem } from "../../../../types/menu";

export type NavBadgeTone = "primary" | "warning" | "danger";

export interface NavModelItem {
  id: string;
  slug: string;
  label: string;
  icon?: string;
  count: number | null;
  badgeTone: NavBadgeTone;
  countChanged: boolean;
  isActive: boolean;
  isActiveBranch: boolean;
  showCollapsedBadge: boolean;
  children: NavModelItem[];
}

export interface NavModelSection {
  id: string;
  label: string;
  items: NavModelItem[];
}

const SECTION_ORDER = ["overview", "publishing", "operations", "system"] as const;
type NavSectionId = (typeof SECTION_ORDER)[number];

const SECTION_LABELS: Record<NavSectionId, string> = {
  overview: "Overview",
  publishing: "Publishing",
  operations: "Operations",
  system: "System",
};

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function resolveSectionId(item: MenuItem, index: number): NavSectionId {
  const value = `${item.slug} ${item.label}`.toLowerCase();

  if (index === 0 || includesAny(value, ["index.php", "dashboard", "home"])) {
    return "overview";
  }

  if (
    includesAny(value, [
      "plugins",
      "themes",
      "appearance",
      "users",
      "tools",
      "settings",
      "options",
      "site-health",
      "update",
      "profile",
      "privacy",
    ])
  ) {
    return "system";
  }

  if (
    includesAny(value, [
      "woocommerce",
      "shop",
      "orders",
      "book",
      "calendar",
      "seo",
      "analytics",
      "marketing",
      "commerce",
      "crm",
      "leads",
      "forms",
      "contact",
      "newsletter",
    ])
  ) {
    return "operations";
  }

  return "publishing";
}

function getItemCount(
  slug: string,
  fallbackCount: number | null | undefined,
  counts: Record<string, number>
) {
  return counts[slug] ?? fallbackCount ?? null;
}

export function getBadgeTypeForItem(slug: string): NavBadgeTone {
  const value = slug.toLowerCase();

  if (value.includes("update")) return "danger";
  if (value.includes("plugin") || value.includes("theme")) return "warning";
  return "primary";
}

function buildChildNavItem(
  child: SubMenuItem,
  activeKey: string | undefined,
  counts: Record<string, number>,
  previousCounts: Record<string, number>,
  collapsed: boolean
): NavModelItem {
  const count = getItemCount(child.slug, child.count, counts);
  const previousCount = previousCounts[child.slug] ?? child.count ?? null;
  const isActive = child.slug === activeKey;

  return {
    id: child.slug,
    slug: child.slug,
    label: child.label,
    count,
    badgeTone: getBadgeTypeForItem(child.slug),
    countChanged: count !== null && previousCount !== null && count !== previousCount,
    isActive,
    isActiveBranch: isActive,
    showCollapsedBadge: collapsed && count !== null && count > 0,
    children: [],
  };
}

export function buildNavModel(
  menuItems: MenuItem[],
  activeKey: string | undefined,
  counts: Record<string, number>,
  collapsed: boolean,
  previousCounts: Record<string, number> = {}
): NavModelSection[] {
  const sectionMap = new Map<NavSectionId, NavModelItem[]>();

  for (const sectionId of SECTION_ORDER) {
    sectionMap.set(sectionId, []);
  }

  menuItems.forEach((item, index) => {
    const children = (item.children ?? []).map((child) =>
      buildChildNavItem(child, activeKey, counts, previousCounts, collapsed)
    );
    const summedChildCount =
      children.length > 0 ? children.reduce((total, child) => total + (child.count ?? 0), 0) : null;
    const count = getItemCount(item.slug, item.count ?? summedChildCount, counts);
    const previousCount = previousCounts[item.slug] ?? item.count ?? summedChildCount ?? null;
    const isActive = item.slug === activeKey;
    const isActiveBranch = isActive || children.some((child) => child.isActiveBranch);

    const navItem: NavModelItem = {
      id: item.slug,
      slug: item.slug,
      label: item.label,
      icon: item.icon,
      count,
      badgeTone: getBadgeTypeForItem(item.slug),
      countChanged: count !== null && previousCount !== null && count !== previousCount,
      isActive,
      isActiveBranch,
      showCollapsedBadge: collapsed && count !== null && count > 0,
      children,
    };

    const sectionId = resolveSectionId(item, index);
    sectionMap.get(sectionId)?.push(navItem);
  });

  return SECTION_ORDER.map((sectionId) => ({
    id: sectionId,
    label: SECTION_LABELS[sectionId],
    items: sectionMap.get(sectionId) ?? [],
  })).filter((section) => section.items.length > 0);
}

export function useNavModel(
  menuItems: MenuItem[],
  activeKey: string | undefined,
  counts: Record<string, number>,
  collapsed: boolean,
  previousCounts: Record<string, number> = {}
) {
  return useMemo(
    () => buildNavModel(menuItems, activeKey, counts, collapsed, previousCounts),
    [menuItems, activeKey, counts, collapsed, previousCounts]
  );
}

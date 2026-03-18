import { useMemo } from "react";
import type { MenuItem } from "./useMenu";
import "../types/wp";
import { getAdminBaseUrl, getActiveKey } from "../utils/wp";

export interface BreadcrumbItem {
  label: string;
  slug:  string;
  url:   string;
}

function slugToUrl(slug: string): string {
  const base            = getAdminBaseUrl();
  const normalizedSlug  = slug.replace(/^\/+/, "");
  return normalizedSlug.includes("?") || normalizedSlug.includes(".php")
    ? `${base}/${normalizedSlug}`
    : `${base}/admin.php?page=${normalizedSlug}`;
}

/**
 * Derives breadcrumb items from the current URL + the WP menu tree.
 *
 * Always starts with "Dashboard".
 * If the active page is a child, inserts the parent in between.
 *
 * Dashboard  /  Comments  /  Pending
 * Dashboard  /  Settings
 */
export function useBreadcrumbs(menuItems: MenuItem[]): BreadcrumbItem[] {
  return useMemo(() => {
    const activeKey = getActiveKey();
    const base      = getAdminBaseUrl();

    const crumbs: BreadcrumbItem[] = [
      {
        label: "Dashboard",
        slug:  "index.php",
        url:   `${base}/index.php`,
      },
    ];

    if (!activeKey || activeKey === "index.php") return crumbs;

    // Find which top-level item owns the active key
    for (const item of menuItems) {
      // Exact match on a top-level item
      if (item.slug === activeKey) {
        crumbs.push({ label: item.label, slug: item.slug, url: slugToUrl(item.slug) });
        return crumbs;
      }

      // Match inside children → push parent + child
      const child = item.children?.find((c) => c.slug === activeKey);
      if (child) {
        crumbs.push({ label: item.label,  slug: item.slug,  url: slugToUrl(item.slug)  });
        crumbs.push({ label: child.label, slug: child.slug, url: slugToUrl(child.slug) });
        return crumbs;
      }
    }

    return crumbs;
  }, [menuItems]);
}
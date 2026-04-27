import type { MenuItem } from "../types/menu";
import { normalizeToMenuKey } from "./embedUrl";
import { isString } from "./typePredicates";
import { buildAdminUrl } from "./wp";

export interface RecentPageRecord {
  pageUrl: string;
  title: string;
  visitedAt: number;
}

export interface PaletteItem {
  id: string;
  label: string;
  subtitle: string;
  url: string;
  slug?: string;
  source: "menu" | "recent";
}

export interface NativeShellCommandDescriptor {
  name: string;
  label: string;
  searchLabel: string;
  keywords: string[];
  action: "navigate" | "toggle-theme";
  url?: string;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function createSearchBlob(item: PaletteItem): string {
  return normalizeText([item.label, item.subtitle, item.slug, item.url].filter(isString).join(" "));
}

function rankPaletteItem(item: PaletteItem, query: string): number {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return 0;
  }

  const label = normalizeText(item.label);
  const subtitle = normalizeText(item.subtitle);
  const slug = normalizeText(item.slug ?? "");
  const url = normalizeText(item.url);
  const searchBlob = createSearchBlob(item);

  if (!searchBlob.includes(normalizedQuery)) {
    return -1;
  }

  let score = 0;

  if (label.startsWith(normalizedQuery)) {
    score += 120;
  } else if (label.includes(normalizedQuery)) {
    score += 80;
  }

  if (subtitle.includes(normalizedQuery)) {
    score += 20;
  }

  if (slug.startsWith(normalizedQuery)) {
    score += 40;
  } else if (slug.includes(normalizedQuery)) {
    score += 24;
  }

  if (url.includes(normalizedQuery)) {
    score += 8;
  }

  if (item.source === "recent") {
    score += 4;
  }

  return score;
}

export function dedupePaletteItems(items: PaletteItem[]): PaletteItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.url)) {
      return false;
    }

    seen.add(item.url);
    return true;
  });
}

export function buildMenuPaletteItems(menuItems: MenuItem[], adminUrl: string): PaletteItem[] {
  return menuItems.flatMap((item) => {
    const topLevelItem: PaletteItem = {
      id: `menu:${item.slug}`,
      label: item.label,
      subtitle: "Menu item",
      url: buildAdminUrl(item.slug, adminUrl),
      slug: item.slug,
      source: "menu",
    };

    const childItems =
      item.children?.map((child) => ({
        id: `menu:${item.slug}:${child.slug}`,
        label: child.label,
        subtitle: item.label,
        url: buildAdminUrl(child.slug, adminUrl),
        slug: child.slug,
        source: "menu" as const,
      })) ?? [];

    return [topLevelItem, ...childItems];
  });
}

export function buildRecentPaletteItems(
  recentPages: RecentPageRecord[],
  menuPaletteItems: PaletteItem[]
): PaletteItem[] {
  const bySlug = new Map(
    menuPaletteItems.filter((item) => item.slug).map((item) => [item.slug as string, item])
  );

  return recentPages.map((page) => {
    const slug = normalizeToMenuKey(page.pageUrl);
    const matchedMenuItem = slug ? bySlug.get(slug) : undefined;

    return {
      id: `recent:${page.pageUrl}`,
      label: matchedMenuItem?.label ?? page.title,
      subtitle: matchedMenuItem ? `Recent / ${matchedMenuItem.subtitle}` : `Recent page`,
      url: page.pageUrl,
      slug: matchedMenuItem?.slug,
      source: "recent",
    };
  });
}

export function searchPaletteItems(items: PaletteItem[], query: string): PaletteItem[] {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return dedupePaletteItems(items);
  }

  return dedupePaletteItems(items)
    .map((item) => ({
      item,
      score: rankPaletteItem(item, normalizedQuery),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.item.label.localeCompare(right.item.label);
    })
    .map((entry) => entry.item);
}

export function buildNativeShellCommandDescriptors(options: {
  menuItems: MenuItem[];
  adminUrl: string;
  favorites: string[];
  recentPages: RecentPageRecord[];
  currentTheme: "light" | "dark";
}): NativeShellCommandDescriptor[] {
  const menuPaletteItems = buildMenuPaletteItems(options.menuItems, options.adminUrl);
  const favoriteItems = menuPaletteItems
    .filter((item) => item.slug && options.favorites.includes(item.slug))
    .sort(
      (left, right) =>
        options.favorites.indexOf(left.slug as string) -
        options.favorites.indexOf(right.slug as string)
    )
    .slice(0, 6);
  const recentItems = buildRecentPaletteItems(options.recentPages, menuPaletteItems).slice(0, 6);

  const favoriteCommands = favoriteItems.map((item) => ({
    name: `wp-react-ui/favorite/${item.slug}`,
    label: `Favorite: ${item.label}`,
    searchLabel: `${item.label} favorite pinned`,
    keywords: ["favorite", "pinned", item.subtitle, item.slug ?? ""].filter(isString),
    action: "navigate" as const,
    url: item.url,
  }));

  const recentCommands = recentItems.map((item, index) => ({
    name: `wp-react-ui/recent/${index}`,
    label: `Recent: ${item.label}`,
    searchLabel: `${item.label} recent ${item.subtitle}`,
    keywords: ["recent", "history", item.subtitle, item.slug ?? ""].filter(isString),
    action: "navigate" as const,
    url: item.url,
  }));

  const themeCommand: NativeShellCommandDescriptor = {
    name: "wp-react-ui/toggle-theme",
    label: options.currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
    searchLabel:
      options.currentTheme === "dark"
        ? "Switch to light mode theme appearance"
        : "Switch to dark mode theme appearance",
    keywords: ["theme", "appearance", options.currentTheme === "dark" ? "light" : "dark"],
    action: "toggle-theme",
  };

  return [...favoriteCommands, ...recentCommands, themeCommand];
}

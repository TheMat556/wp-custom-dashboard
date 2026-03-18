import { useState, useCallback, useEffect, useRef } from "react";

export interface SubMenuItem {
  label: string;
  slug: string;
  count?: number | null;
  cap?: string;
}

export interface MenuItem {
  label: string;
  slug: string;
  icon?: string;
  count?: number | null;
  cap?: string;
  children?: SubMenuItem[];
}

// ─── Native WP adminmenu DOM helpers ──────────────────────────────────────────

/**
 * WordPress renders the native admin menu into #adminmenu (which our plugin
 * hides via CSS but never removes from the DOM). Each top-level <li> gets a
 * predictable ID we can query to determine whether WordPress / any plugin has
 * hidden that item.
 *
 * IMPORTANT: If no matching <li> is found we return TRUE (show the item).
 * We only hide when we have a positive match that is display:none/visibility:hidden.
 */
function isNativeMenuItemVisible(slug: string, adminMenu: HTMLElement): boolean {
  // 1. Well-known slug → ID mappings
  const knownIds: Record<string, string> = {
    "index.php":                  "menu-dashboard",
    "edit.php":                   "menu-posts",
    "upload.php":                 "menu-media",
    "link-manager.php":           "menu-links",
    "edit-comments.php":          "menu-comments",
    "edit.php?post_type=page":    "menu-pages",
    "themes.php":                 "menu-appearance",
    "plugins.php":                "menu-plugins",
    "users.php":                  "menu-users",
    "profile.php":                "menu-users",
    "tools.php":                  "menu-tools",
    "options-general.php":        "menu-settings",
  };

  const candidateIds: string[] = [];

  if (knownIds[slug]) {
    candidateIds.push(knownIds[slug]);
  }

  // 2. Generic toplevel_page_{slug} pattern used by plugins/CPTs
  const genericId = "toplevel_page_" + slug.replace(/[./?=&]/g, "-");
  candidateIds.push(genericId);

  for (const id of candidateIds) {
    const li = adminMenu.querySelector<HTMLElement>(`#${id}`);
    if (!li) continue;

    // Found a matching <li> — now check if it's hidden
    const style = window.getComputedStyle(li);
    if (style.display === "none" || style.visibility === "hidden") {
      return false; // Positive match AND hidden → filter it out
    }

    return true; // Positive match AND visible → keep it
  }

  // ── No matching <li> found → SHOW the item (safe default) ──
  // We only hide items we can positively confirm are hidden in the native menu.
  return true;
}

/**
 * Filters a menu item list to only hide items whose native WP <li>
 * is confirmed hidden in #adminmenu. Items with no matching <li> are kept.
 */
function filterByDomVisibility(items: MenuItem[]): MenuItem[] {
  const adminMenu = document.getElementById("adminmenu");

  // If #adminmenu isn't in the DOM at all, skip filtering entirely
  if (!adminMenu) return items;

  return items.filter((item) => isNativeMenuItemVisible(item.slug, adminMenu));
}

// ─── Data fetching ────────────────────────────────────────────────────────────

function getInitialData(): MenuItem[] {
  return (window as any).wpReactUi?.menu ?? [];
}

async function fetchMenu(): Promise<MenuItem[]> {
  const wp      = (window as any).wpReactUi ?? {};
  const restUrl = wp.restUrl ?? "/wp-json/wp-react-ui/v1";
  const nonce   = wp.nonce ?? "";

  const res = await fetch(`${restUrl}/menu`, {
    headers: { "X-WP-Nonce": nonce },
  });

  if (!res.ok) throw new Error(`Menu fetch failed: ${res.status}`);

  const data = await res.json();
  return data.menu ?? [];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMenu() {
  const [allItems, setAllItems] = useState<MenuItem[]>(() => getInitialData());
  const [loading, setLoading]   = useState(false);
  const mountedRef               = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await fetchMenu();
      if (mountedRef.current) setAllItems(fresh);
    } catch (err) {
      console.error("[WP React UI] Menu refresh failed:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // DOM-filtered view — only hides items we can positively confirm are hidden.
  const menuItems = filterByDomVisibility(allItems);

  return { menuItems, loading, refresh };
}
/**
 * Lightweight page prefetch on hover.
 *
 * Injects `<link rel="prefetch">` tags when the user hovers over menu items
 * for more than PREFETCH_DELAY_MS milliseconds, so the browser can start
 * fetching the target page before the user actually clicks.
 */

import { toEmbedUrl } from "./embedUrl";

const PREFETCH_DELAY_MS = 150;
const MAX_PREFETCH_LINKS = 8;

const prefetchedUrls = new Set<string>();
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

function injectPrefetchLink(url: string): void {
  if (prefetchedUrls.has(url)) return;
  if (prefetchedUrls.size >= MAX_PREFETCH_LINKS) return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  link.as = "document";
  document.head.appendChild(link);
  prefetchedUrls.add(url);
}

/**
 * Call on `mouseenter` for a menu item. Starts a delayed prefetch.
 */
export function startPrefetch(slug: string, adminUrl: string): void {
  cancelPrefetch();
  hoverTimer = setTimeout(() => {
    const fullUrl = slug.startsWith("http")
      ? slug
      : `${adminUrl.replace(/\/$/, "")}/${slug}`;
    const embedUrl = toEmbedUrl(fullUrl);
    injectPrefetchLink(embedUrl);
  }, PREFETCH_DELAY_MS);
}

/**
 * Call on `mouseleave` to cancel a pending prefetch.
 */
export function cancelPrefetch(): void {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
}

/**
 * Clears all injected prefetch links (e.g. on teardown).
 */
export function clearPrefetchCache(): void {
  for (const url of prefetchedUrls) {
    const link = document.head.querySelector(`link[rel="prefetch"][href="${CSS.escape(url)}"]`);
    link?.remove();
  }
  prefetchedUrls.clear();
  cancelPrefetch();
}

/**
 * Shared WordPress admin helpers.
 * Used across Navbar, Sidebar, and breadcrumbs.
 */

import "../types/wp";

export function getWpConfig() {
  return window.wpReactUi ?? {};
}

export function getAdminBaseUrl(): string {
  const adminUrl = getWpConfig().adminUrl ?? "/wp-admin/";
  return adminUrl.replace(/\/$/, "");
}

export function getActiveKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const page = new URLSearchParams(window.location.search).get("page");
  if (page) return page;
  return window.location.pathname.split("/").filter(Boolean).pop();
}

export function navigate(slug: string): void {
  const base = getAdminBaseUrl();
  const normalizedSlug = slug.replace(/^\/+/, "");
  const target =
    normalizedSlug.includes("?") || normalizedSlug.includes(".php")
      ? `${base}/${normalizedSlug}`
      : `${base}/admin.php?page=${normalizedSlug}`;
  window.location.assign(target);
}

export function navigateHome(): void {
  window.location.assign(`${getAdminBaseUrl()}/index.php`);
}

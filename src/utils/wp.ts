/**
 * Shared WordPress admin helpers.
 */

import { navigationStore } from "../features/navigation/store/navigationStore";

export function getAdminBaseUrl(adminUrl: string): string {
  return adminUrl.replace(/\/+$/, "");
}

export function buildAdminUrl(slug: string, adminUrl: string): string {
  const base = getAdminBaseUrl(adminUrl);
  const normalizedSlug = slug.replace(/^\/+/, "");

  if (normalizedSlug.includes("?")) {
    return `${base}/${normalizedSlug}`;
  }

  if (normalizedSlug.endsWith(".php") && !normalizedSlug.includes("/")) {
    return `${base}/${normalizedSlug}`;
  }

  return `${base}/admin.php?page=${normalizedSlug}`;
}

export function navigate(slug: string, adminUrl: string): void {
  navigationStore.getState().navigate(buildAdminUrl(slug, adminUrl));
}

export function navigateHome(adminUrl: string): void {
  navigate("index.php", adminUrl);
}

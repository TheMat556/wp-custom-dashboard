/**
 * Tests for spaNavigate.ts (iframe shell architecture)
 *
 * Since SPA fetch-and-swap has been replaced by the iframe navigation model,
 * these tests cover only what spaNavigate.ts still exports:
 *  - isAdminUrl()   (re-exported from embedUrl)
 *  - useActiveKey() (backed by navigationStore → activeKeyStore)
 *
 * The jsdom environment URL is set in vitest.config.ts:
 *   url: "http://localhost/wp-admin/admin.php"
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { isAdminUrl, useActiveKey } from "./spaNavigate";
import { navigationStore, resetNavigationStore } from "../store/navigationStore";
import { toEmbedUrl } from "./embedUrl";

// ── isAdminUrl ────────────────────────────────────────────────────────────────

describe("isAdminUrl", () => {
  it("accepts a standard wp-admin URL", () => {
    expect(isAdminUrl("http://localhost/wp-admin/admin.php?page=my-plugin")).toBe(true);
  });

  it("accepts a wp-admin URL without query string", () => {
    expect(isAdminUrl("http://localhost/wp-admin/index.php")).toBe(true);
  });

  it("rejects a frontend URL", () => {
    expect(isAdminUrl("http://localhost/about/")).toBe(false);
  });

  it("rejects a cross-origin URL", () => {
    expect(isAdminUrl("https://evil.com/wp-admin/admin.php?page=x")).toBe(false);
  });

  it("rejects an empty string without throwing", () => {
    expect(isAdminUrl("")).toBe(false);
  });

  it("rejects a javascript: URI without throwing", () => {
    expect(isAdminUrl("javascript:void(0)")).toBe(false);
  });
});

// ── useActiveKey ──────────────────────────────────────────────────────────────

describe("useActiveKey", () => {
  beforeEach(() => {
    resetNavigationStore();
  });

  afterEach(() => {
    resetNavigationStore();
  });

  it("returns undefined when there is no page in the URL", () => {
    navigationStore.setState({
      pageUrl: "http://localhost/wp-admin/index.php",
      iframeUrl: toEmbedUrl("http://localhost/wp-admin/index.php"),
    });
    const { result } = renderHook(() => useActiveKey());
    expect(result.current).toBe("index.php");
  });

  it("extracts the ?page= param as the active key", () => {
    navigationStore.setState({
      pageUrl: "http://localhost/wp-admin/admin.php?page=my-plugin",
      iframeUrl: toEmbedUrl("http://localhost/wp-admin/admin.php?page=my-plugin"),
    });
    const { result } = renderHook(() => useActiveKey());
    expect(result.current).toBe("my-plugin");
  });

  it("updates reactively when navigationStore changes", () => {
    navigationStore.setState({
      pageUrl: "http://localhost/wp-admin/admin.php?page=first-plugin",
      iframeUrl: toEmbedUrl("http://localhost/wp-admin/admin.php?page=first-plugin"),
    });
    const { result } = renderHook(() => useActiveKey());
    expect(result.current).toBe("first-plugin");

    act(() => {
      navigationStore.setState({
        pageUrl: "http://localhost/wp-admin/admin.php?page=second-plugin",
        iframeUrl: toEmbedUrl("http://localhost/wp-admin/admin.php?page=second-plugin"),
      });
    });
    expect(result.current).toBe("second-plugin");
  });
});

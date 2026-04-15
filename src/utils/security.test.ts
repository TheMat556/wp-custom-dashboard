/**
 * Tests for src/utils/security.ts
 *
 * jsdom URL: "http://localhost/wp-admin/admin.php" (set in vitest.config.ts)
 */

import { beforeEach, describe, expect, it } from "vitest";
import { isSameOrigin } from "./security";

function setLocation(url: string) {
  history.replaceState({}, "", url);
}

describe("isSameOrigin", () => {
  beforeEach(() => {
    setLocation("http://localhost/wp-admin/admin.php");
  });

  it("returns true for an absolute same-origin URL", () => {
    expect(isSameOrigin("http://localhost/wp-admin/plugins.php")).toBe(true);
  });

  it("returns true for an absolute same-origin URL with query params", () => {
    expect(isSameOrigin("http://localhost/wp-admin/admin.php?page=my-plugin")).toBe(true);
  });

  it("returns true for a root-relative URL", () => {
    expect(isSameOrigin("/wp-admin/edit.php")).toBe(true);
  });

  it("returns true for a relative URL (no leading slash)", () => {
    expect(isSameOrigin("options-general.php")).toBe(true);
  });

  it("returns true for an empty string (resolves to current page)", () => {
    expect(isSameOrigin("")).toBe(true);
  });

  it("returns false for a cross-origin URL (different host)", () => {
    expect(isSameOrigin("https://evil.com/steal-cookies")).toBe(false);
  });

  it("returns false for a cross-origin URL on a different port", () => {
    expect(isSameOrigin("http://localhost:8080/wp-admin/admin.php")).toBe(false);
  });

  it("returns false for a cross-origin URL with a different scheme", () => {
    expect(isSameOrigin("ftp://localhost/wp-admin/admin.php")).toBe(false);
  });

  it("returns false for an invalid/malformed absolute URL (unclosed IPv6 bracket)", () => {
    // new URL("http://[invalid", base) throws — the catch branch returns false.
    expect(isSameOrigin("http://[invalid")).toBe(false);
  });

  it("returns false for a javascript: URI", () => {
    expect(isSameOrigin("javascript:alert(1)")).toBe(false);
  });
});

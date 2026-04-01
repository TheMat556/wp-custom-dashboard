import { beforeEach, describe, expect, it } from "vitest";
import {
  matchesOpenInNewTabPattern,
  normalizeOpenInNewTabPatterns,
  shouldOpenOutsideAdminInNewTab,
} from "./openInNewTab";

function setAdminLocation(url: string) {
  history.replaceState({}, "", url);
}

describe("normalizeOpenInNewTabPatterns", () => {
  it("deduplicates and trims patterns", () => {
    expect(normalizeOpenInNewTabPatterns([" bricks=run ", "BRICKS=RUN", "", "builder=bricks"])).toEqual(
      ["bricks=run", "builder=bricks"]
    );
  });

  it("returns an empty list for invalid input", () => {
    expect(normalizeOpenInNewTabPatterns(undefined)).toEqual([]);
  });
});

describe("matchesOpenInNewTabPattern", () => {
  it("matches URLs case-insensitively", () => {
    expect(
      matchesOpenInNewTabPattern(
        "http://localhost/wp-admin/admin.php?page=landing&builder=Bricks",
        ["builder=bricks"]
      )
    ).toBe(true);
  });

  it("returns false for non-matching URLs", () => {
    expect(matchesOpenInNewTabPattern("http://localhost/wp-admin/plugins.php", ["builder=bricks"])).toBe(
      false
    );
  });
});

describe("shouldOpenOutsideAdminInNewTab", () => {
  beforeEach(() => {
    setAdminLocation("http://localhost/wp-admin/admin.php");
  });

  it("opens same-origin frontend URLs in a new tab", () => {
    expect(shouldOpenOutsideAdminInNewTab("http://localhost/")).toBe(true);
    expect(shouldOpenOutsideAdminInNewTab("/about/")).toBe(true);
  });

  it("does not force wp-admin URLs into a new tab", () => {
    expect(shouldOpenOutsideAdminInNewTab("http://localhost/wp-admin/plugins.php")).toBe(false);
    expect(shouldOpenOutsideAdminInNewTab("plugins.php")).toBe(false);
  });

  it("does not force non-navigation href values into a new tab", () => {
    expect(shouldOpenOutsideAdminInNewTab("#section")).toBe(false);
    expect(shouldOpenOutsideAdminInNewTab("javascript:void(0)")).toBe(false);
    expect(shouldOpenOutsideAdminInNewTab("mailto:test@example.com")).toBe(false);
  });
});

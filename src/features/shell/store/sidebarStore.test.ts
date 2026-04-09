import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  sidebarStore,
  bootstrapSidebarStore,
  resetSidebarStore,
} from "./sidebarStore";
import { getBootConfig } from "../../../config/bootConfig";

const cfg = getBootConfig();
const SIDEBAR_FULL = cfg.layout.sidebarWidths.expanded;
const SIDEBAR_COLLAPSED = cfg.layout.sidebarWidths.collapsed;
const LS_KEY = cfg.layout.collapsedStorageKey;

let teardown: (() => void) | undefined;

describe("sidebarStore", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty("--sidebar-width");
    resetSidebarStore();
    teardown = undefined;
  });

  afterEach(() => {
    teardown?.();
    resetSidebarStore();
  });

  // ── Initial state ────────────────────────────────────────────────────────────

  it("initialises to expanded (desktop) state", () => {
    teardown = bootstrapSidebarStore();
    expect(sidebarStore.getState().collapsed).toBe(false);
    expect(sidebarStore.getState().sidebarWidth).toBe(SIDEBAR_FULL);
  });

  it("restores collapsed state from localStorage on bootstrap", () => {
    localStorage.setItem(LS_KEY, "true");
    teardown = bootstrapSidebarStore();
    expect(sidebarStore.getState().collapsed).toBe(true);
    expect(sidebarStore.getState().sidebarWidth).toBe(SIDEBAR_COLLAPSED);
  });

  // ── toggle() ─────────────────────────────────────────────────────────────────

  it("toggle() collapses sidebar on desktop", () => {
    teardown = bootstrapSidebarStore();
    sidebarStore.getState().toggle();
    expect(sidebarStore.getState().collapsed).toBe(true);
    expect(sidebarStore.getState().sidebarWidth).toBe(SIDEBAR_COLLAPSED);
  });

  it("toggle() expands sidebar after collapsing", () => {
    teardown = bootstrapSidebarStore();
    sidebarStore.getState().toggle();
    sidebarStore.getState().toggle();
    expect(sidebarStore.getState().collapsed).toBe(false);
    expect(sidebarStore.getState().sidebarWidth).toBe(SIDEBAR_FULL);
  });

  // ── CSS var subscriber ────────────────────────────────────────────────────────

  it("bootstrap applies --sidebar-width CSS var on initial state", () => {
    teardown = bootstrapSidebarStore();
    expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe(
      `${SIDEBAR_FULL}px`
    );
  });

  it("toggle() updates --sidebar-width CSS var via subscriber", () => {
    teardown = bootstrapSidebarStore();
    sidebarStore.getState().toggle();
    expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe(
      `${SIDEBAR_COLLAPSED}px`
    );
  });

  // ── Persist subscriber ───────────────────────────────────────────────────────

  it("toggle() persists collapsed state to localStorage via subscriber", () => {
    teardown = bootstrapSidebarStore();
    sidebarStore.getState().toggle();
    expect(localStorage.getItem(LS_KEY)).toBe("true");
  });

  it("toggle() persists expanded state to localStorage via subscriber", () => {
    localStorage.setItem(LS_KEY, "true");
    teardown = bootstrapSidebarStore();
    sidebarStore.getState().toggle(); // expand
    expect(localStorage.getItem(LS_KEY)).toBe("false");
  });

  // ── Teardown ─────────────────────────────────────────────────────────────────

  it("teardown removes CSS var subscriber", () => {
    const td = bootstrapSidebarStore();
    td(); // tear down
    document.documentElement.style.removeProperty("--sidebar-width");

    // toggle without subscriber — CSS var should NOT update
    sidebarStore.getState().toggle();
    expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("");
  });

  it("teardown removes persist subscriber", () => {
    localStorage.clear();
    const td = bootstrapSidebarStore();
    td(); // tear down
    localStorage.clear();

    sidebarStore.getState().toggle();
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  // ── resetSidebarStore ────────────────────────────────────────────────────────

  it("resetSidebarStore resets state to uncollapsed", () => {
    teardown = bootstrapSidebarStore();
    sidebarStore.getState().toggle();
    resetSidebarStore();
    expect(sidebarStore.getState().collapsed).toBe(false);
    teardown = undefined; // already torn down by reset
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Theme } from "./themeStore";
import {
  applyThemeToDOM,
  bootstrapThemeStore,
  resetThemeStore,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  themeStore,
} from "./themeStore";

const mockConfig = {
  theme: "light" as Theme,
  restUrl: "http://localhost/wp-json/wp-react-ui/v1",
  nonce: "test-nonce",
};

const mockService = {
  getTheme: vi.fn().mockResolvedValue({ theme: "light" }),
  saveTheme: vi.fn().mockResolvedValue(undefined),
};

let teardown: (() => void) | undefined;

describe("themeStore", () => {
  beforeEach(() => {
    resetThemeStore();
    teardown = undefined;
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.className = "";
    document.body.removeAttribute("data-theme");
    document.body.className = "";
  });

  afterEach(() => {
    teardown?.();
  });

  it("initialises to light theme from config when no localStorage value", () => {
    teardown = bootstrapThemeStore(mockConfig, mockService);
    expect(themeStore.getState().theme).toBe("light");
  });

  it("initialises to dark theme when localStorage has 'dark'", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    teardown = bootstrapThemeStore(mockConfig, mockService);
    expect(themeStore.getState().theme).toBe("dark");
  });

  it("applies theme to DOM on bootstrap", () => {
    teardown = bootstrapThemeStore({ ...mockConfig, theme: "dark" as Theme }, mockService);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.body.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("wp-react-dark")).toBe(true);
    expect(document.body.classList.contains("wp-react-dark")).toBe(true);
  });

  it("toggle switches from light to dark", () => {
    teardown = bootstrapThemeStore(mockConfig, mockService);
    themeStore.getState().toggle();
    expect(themeStore.getState().theme).toBe("dark");
  });

  it("toggle applies new theme to DOM via subscriber", () => {
    teardown = bootstrapThemeStore(mockConfig, mockService);
    themeStore.getState().toggle();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.body.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("wp-react-dark")).toBe(true);
    expect(document.body.classList.contains("wp-react-dark")).toBe(true);
  });

  it("toggle dispatches THEME_CHANGE_EVENT with new theme via subscriber", () => {
    teardown = bootstrapThemeStore(mockConfig, mockService);
    const handler = vi.fn();
    window.addEventListener(THEME_CHANGE_EVENT, handler);
    themeStore.getState().toggle();
    window.removeEventListener(THEME_CHANGE_EVENT, handler);
    expect(handler).toHaveBeenCalledOnce();
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ theme: "dark" });
  });

  it("toggle calls service.saveTheme with new theme via subscriber", async () => {
    const svc = { ...mockService, saveTheme: vi.fn().mockResolvedValue(undefined) };
    teardown = bootstrapThemeStore(mockConfig, svc);
    themeStore.getState().toggle();
    await Promise.resolve();
    expect(svc.saveTheme).toHaveBeenCalledWith("dark");
  });

  it("bootstrap does not call saveTheme on initial load", async () => {
    const svc = { ...mockService, saveTheme: vi.fn().mockResolvedValue(undefined) };
    teardown = bootstrapThemeStore({ ...mockConfig, theme: "dark" }, svc);
    await Promise.resolve();
    expect(svc.saveTheme).not.toHaveBeenCalled();
  });

  it("toggle does not throw if bootstrapped without service subscribers (reset state)", () => {
    resetThemeStore();
    expect(() => themeStore.getState().toggle()).not.toThrow();
  });

  it("teardown unsubscribes DOM and service subscribers", async () => {
    const svc = { ...mockService, saveTheme: vi.fn().mockResolvedValue(undefined) };
    const td = bootstrapThemeStore(mockConfig, svc);
    td(); // teardown immediately
    document.body.removeAttribute("data-theme");

    themeStore.getState().toggle();
    await Promise.resolve();

    // DOM subscriber was torn down — no update
    expect(document.body.getAttribute("data-theme")).toBeNull();
    // Service subscriber was torn down — no save call
    expect(svc.saveTheme).not.toHaveBeenCalled();
  });

  it("resetThemeStore resets theme to light and detaches service", async () => {
    const svc = { ...mockService, saveTheme: vi.fn().mockResolvedValue(undefined) };
    teardown = bootstrapThemeStore(mockConfig, svc);
    themeStore.getState().toggle();
    expect(themeStore.getState().theme).toBe("dark");

    resetThemeStore();
    expect(themeStore.getState().theme).toBe("light");

    // Module-level service cleared — toggle after reset won't call svc again
    svc.saveTheme.mockClear();
    themeStore.getState().toggle();
    await Promise.resolve();
    expect(svc.saveTheme).not.toHaveBeenCalled();
  });

  it("applyThemeToDOM sets data-theme on body", () => {
    applyThemeToDOM("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.body.getAttribute("data-theme")).toBe("dark");
  });

  it("applyThemeToDOM toggles wp-react-dark class", () => {
    applyThemeToDOM("dark");
    expect(document.documentElement.classList.contains("wp-react-dark")).toBe(true);
    expect(document.body.classList.contains("wp-react-dark")).toBe(true);
    applyThemeToDOM("light");
    expect(document.documentElement.classList.contains("wp-react-dark")).toBe(false);
    expect(document.body.classList.contains("wp-react-dark")).toBe(false);
  });

  it("applyThemeToDOM notifies embedded iframes", () => {
    const postMessage = vi.fn();
    const iframe = document.createElement("iframe");
    Object.defineProperty(iframe, "contentWindow", {
      configurable: true,
      value: { postMessage },
    });
    document.body.appendChild(iframe);

    applyThemeToDOM("dark");

    expect(postMessage).toHaveBeenCalledWith(
      { type: THEME_CHANGE_EVENT, detail: { theme: "dark" } },
      window.location.origin
    );
  });
});

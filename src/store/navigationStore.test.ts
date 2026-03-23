/**
 * Tests for src/store/navigationStore.ts
 *
 * jsdom URL: "http://localhost/wp-admin/admin.php" (set in vitest.config.ts)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  navigationStore,
  activeKeyStore,
  resetNavigationStore,
} from "./navigationStore";
import { toEmbedUrl } from "../utils/embedUrl";

beforeEach(() => {
  resetNavigationStore();
  vi.spyOn(history, "pushState").mockImplementation(() => {});
  vi.spyOn(history, "replaceState").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  resetNavigationStore();
});

describe("initial state", () => {
  it("sets iframeUrl to current URL with embed param", () => {
    const state = navigationStore.getState();
    expect(new URL(state.iframeUrl).searchParams.get("wp_shell_embed")).toBe("1");
  });

  it("sets pageUrl to current URL without embed param", () => {
    const state = navigationStore.getState();
    expect(new URL(state.pageUrl).searchParams.has("wp_shell_embed")).toBe(false);
  });
});

describe("navigate()", () => {
  it("sets iframeUrl with embed param and pageUrl without it", () => {
    const { navigate } = navigationStore.getState();
    navigate("http://localhost/wp-admin/plugins.php");

    const state = navigationStore.getState();
    expect(state.pageUrl).toBe("http://localhost/wp-admin/plugins.php");
    expect(state.iframeUrl).toBe(toEmbedUrl("http://localhost/wp-admin/plugins.php"));
  });

  it("sets isLoading to true and _shellInitiated to true", () => {
    navigationStore.getState().navigate("http://localhost/wp-admin/plugins.php");
    const state = navigationStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state._shellInitiated).toBe(true);
  });

  it("pushes clean URL to history", () => {
    navigationStore.getState().navigate("http://localhost/wp-admin/plugins.php");
    expect(history.pushState).toHaveBeenCalledWith(
      expect.objectContaining({ pageUrl: "http://localhost/wp-admin/plugins.php" }),
      "",
      "http://localhost/wp-admin/plugins.php"
    );
  });

  it("does a full redirect for breakout URLs", () => {
    // Replace window.location with a plain mock so we can capture href assignment.
    // jsdom allows deleting and redefining window.location in tests.
    const originalLocation = window.location;
    delete (window as unknown as Record<string, unknown>).location;
    const hrefSetter = vi.fn();
    (window as unknown as Record<string, unknown>).location = {
      origin: "http://localhost",
      set href(v: string) { hrefSetter(v); },
    };

    navigationStore.getState().navigate("http://localhost/wp-admin/post-new.php");

    expect(hrefSetter).toHaveBeenCalledWith("http://localhost/wp-admin/post-new.php");
    // navigate() returns early for breakout — pushState must NOT be called.
    expect(history.pushState).not.toHaveBeenCalled();

    // Restore
    (window as unknown as Record<string, unknown>).location = originalLocation;
  });

  it("notifies activeKeyStore subscribers", () => {
    const listener = vi.fn();
    const unsub = activeKeyStore.subscribe(listener);
    navigationStore.getState().navigate("http://localhost/wp-admin/plugins.php");
    expect(listener).toHaveBeenCalled();
    unsub();
  });
});

describe("handleIframeLoad()", () => {
  it("updates state and clears loading for shell-initiated loads", () => {
    navigationStore.setState({ _shellInitiated: true, isLoading: true });

    const fakeWindow = {
      location: { href: "http://localhost/wp-admin/plugins.php?wp_shell_embed=1" },
      document: { title: "Plugins — WordPress" },
    } as unknown as Window;

    navigationStore.getState().handleIframeLoad(fakeWindow);

    const state = navigationStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state._shellInitiated).toBe(false);
    expect(state.pageUrl).toBe("http://localhost/wp-admin/plugins.php");
    expect(state.pageTitle).toBe("Plugins — WordPress");
  });

  it("pushes to history for user-initiated iframe navigation", () => {
    navigationStore.setState({ _shellInitiated: false });

    const fakeWindow = {
      location: { href: "http://localhost/wp-admin/plugins.php?paged=2&wp_shell_embed=1" },
      document: { title: "Plugins — WordPress" },
    } as unknown as Window;

    navigationStore.getState().handleIframeLoad(fakeWindow);

    expect(history.pushState).toHaveBeenCalledWith(
      expect.objectContaining({ pageUrl: "http://localhost/wp-admin/plugins.php?paged=2" }),
      "Plugins — WordPress",
      "http://localhost/wp-admin/plugins.php?paged=2"
    );
  });

  it("does NOT push history for shell-initiated loads", () => {
    navigationStore.setState({ _shellInitiated: true });

    const fakeWindow = {
      location: { href: "http://localhost/wp-admin/plugins.php?wp_shell_embed=1" },
      document: { title: "Plugins" },
    } as unknown as Window;

    navigationStore.getState().handleIframeLoad(fakeWindow);
    expect(history.pushState).not.toHaveBeenCalled();
  });

  it("clears loading even when location access throws (cross-origin)", () => {
    navigationStore.setState({ isLoading: true, _shellInitiated: true });
    const badWindow = {
      get location(): never {
        throw new DOMException("cross-origin");
      },
    } as unknown as Window;
    navigationStore.getState().handleIframeLoad(badWindow);
    expect(navigationStore.getState().isLoading).toBe(false);
  });
});

describe("handleIframeMessage()", () => {
  it("ignores messages from other origins", () => {
    const event = new MessageEvent("message", {
      origin: "https://evil.com",
      data: { source: "wp-shell-embed", type: "title-change", title: "Hacked" },
    });
    navigationStore.getState().handleIframeMessage(event);
    expect(navigationStore.getState().pageTitle).not.toBe("Hacked");
  });

  it("ignores messages with wrong source", () => {
    const event = new MessageEvent("message", {
      origin: "http://localhost",
      data: { source: "other-plugin", type: "title-change", title: "Hacked" },
    });
    navigationStore.getState().handleIframeMessage(event);
    expect(navigationStore.getState().pageTitle).not.toBe("Hacked");
  });

  it("updates pageTitle on title-change message", () => {
    const event = new MessageEvent("message", {
      origin: "http://localhost",
      data: { source: "wp-shell-embed", type: "title-change", title: "New Title" },
    });
    navigationStore.getState().handleIframeMessage(event);
    expect(navigationStore.getState().pageTitle).toBe("New Title");
  });
});

describe("activeKeyStore.getSnapshot()", () => {
  it("extracts ?page= as the menu key", () => {
    navigationStore.setState({
      pageUrl: "http://localhost/wp-admin/admin.php?page=woocommerce",
    });
    expect(activeKeyStore.getSnapshot()).toBe("woocommerce");
  });

  it("extracts the PHP filename when no ?page= is present", () => {
    navigationStore.setState({ pageUrl: "http://localhost/wp-admin/plugins.php" });
    expect(activeKeyStore.getSnapshot()).toBe("plugins.php");
  });
});

/**
 * Tests for src/store/navigationStore.ts
 *
 * jsdom URL: "http://localhost/wp-admin/admin.php" (set in vitest.config.ts)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activeKeyStore,
  bootstrapNavigationStore,
  navigationStore,
  resetNavigationStore,
} from "../features/navigation/store/navigationStore";
import { EMBED_MESSAGE_SOURCE, EMBED_MESSAGE_VERSION } from "../types/embedMessages";
import { toEmbedUrl } from "../utils/embedUrl";

beforeEach(() => {
  resetNavigationStore();
  bootstrapNavigationStore({
    breakoutPagenow: ["post.php", "post-new.php", "site-editor.php"],
    openInNewTabPatterns: [],
  });
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

  it("resets iframe overlay state during bootstrap", () => {
    navigationStore.setState({ iframeOverlayActive: true });
    resetNavigationStore();
    expect(navigationStore.getState().iframeOverlayActive).toBe(false);
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

  it("sets status to loading and marks the navigation source as shell", () => {
    navigationStore.getState().navigate("http://localhost/wp-admin/plugins.php");
    const state = navigationStore.getState();
    expect(state.status).toBe("loading");
    expect(state.pendingNavigationSource).toBe("shell");
  });

  it("pushes clean URL to history", () => {
    navigationStore.getState().navigate("http://localhost/wp-admin/plugins.php");
    expect(history.pushState).toHaveBeenCalledWith(
      expect.objectContaining({ pageUrl: "http://localhost/wp-admin/plugins.php" }),
      "",
      "http://localhost/wp-admin/plugins.php"
    );
  });

  it("does not re-navigate when the target is the current page", () => {
    navigationStore.setState({
      iframeUrl: "http://localhost/wp-admin/index.php?wp_shell_embed=1",
      pageUrl: "http://localhost/wp-admin/index.php",
      status: "ready",
      pendingNavigationSource: null,
    });

    navigationStore.getState().navigate("http://localhost/wp-admin/");

    expect(navigationStore.getState().status).toBe("ready");
    expect(navigationStore.getState().pendingNavigationSource).toBeNull();
    expect(history.pushState).not.toHaveBeenCalled();
  });

  it("does a full redirect for breakout URLs", () => {
    // Replace window.location with a plain mock so we can capture href assignment.
    // jsdom allows deleting and redefining window.location in tests.
    const originalLocation = window.location;
    delete (window as unknown as Record<string, unknown>).location;
    const hrefSetter = vi.fn();
    (window as unknown as Record<string, unknown>).location = {
      origin: "http://localhost",
      set href(v: string) {
        hrefSetter(v);
      },
    };

    navigationStore.getState().navigate("http://localhost/wp-admin/post-new.php");

    expect(hrefSetter).toHaveBeenCalledWith("http://localhost/wp-admin/post-new.php");
    // navigate() returns early for breakout — pushState must NOT be called.
    expect(history.pushState).not.toHaveBeenCalled();

    // Restore
    (window as unknown as Record<string, unknown>).location = originalLocation;
  });

  it("blocks navigate() for cross-origin breakout URLs", () => {
    const originalLocation = window.location;
    delete (window as unknown as Record<string, unknown>).location;
    const hrefSetter = vi.fn();
    (window as unknown as Record<string, unknown>).location = {
      origin: "http://localhost",
      get href() {
        return "http://localhost/wp-admin/admin.php";
      },
      set href(v: string) {
        hrefSetter(v);
      },
    };

    // A URL that matches a breakout pagenow but is on a different host.
    navigationStore.getState().navigate("https://evil.com/wp-admin/post-new.php");

    expect(hrefSetter).not.toHaveBeenCalled();
    expect(history.pushState).not.toHaveBeenCalled();

    (window as unknown as Record<string, unknown>).location = originalLocation;
  });

  it("opens matching configured URL patterns in a new tab", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    navigationStore.setState({
      openInNewTabPatterns: ["builder=bricks"],
    });

    navigationStore
      .getState()
      .navigate("http://localhost/wp-admin/admin.php?page=landing-page&builder=bricks");

    expect(openSpy).toHaveBeenCalledWith(
      "http://localhost/wp-admin/admin.php?page=landing-page&builder=bricks",
      "_blank",
      "noopener,noreferrer"
    );
    expect(history.pushState).not.toHaveBeenCalled();
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
    navigationStore.setState({ pendingNavigationSource: "shell", status: "loading" });

    const fakeWindow = {
      location: { href: "http://localhost/wp-admin/plugins.php?wp_shell_embed=1" },
      document: { title: "Plugins — WordPress" },
    } as unknown as Window;

    navigationStore.getState().handleIframeLoad(fakeWindow);

    const state = navigationStore.getState();
    expect(state.status).toBe("ready");
    expect(state.pendingNavigationSource).toBeNull();
    expect(state.pageUrl).toBe("http://localhost/wp-admin/plugins.php");
    expect(state.pageTitle).toBe("Plugins — WordPress");
  });

  it("pushes to history for user-initiated iframe navigation", () => {
    navigationStore.setState({ pendingNavigationSource: null });

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
    navigationStore.setState({ pendingNavigationSource: "shell" });

    const fakeWindow = {
      location: { href: "http://localhost/wp-admin/plugins.php?wp_shell_embed=1" },
      document: { title: "Plugins" },
    } as unknown as Window;

    navigationStore.getState().handleIframeLoad(fakeWindow);
    expect(history.pushState).not.toHaveBeenCalled();
  });

  it("clears loading even when location access throws (cross-origin)", () => {
    navigationStore.setState({ status: "loading", pendingNavigationSource: "shell" });
    const badWindow = {
      get location(): never {
        throw new DOMException("cross-origin");
      },
    } as unknown as Window;
    navigationStore.getState().handleIframeLoad(badWindow);
    expect(navigationStore.getState().status).toBe("ready");
    expect(navigationStore.getState().pendingNavigationSource).toBeNull();
  });
});

describe("handleIframeMessage()", () => {
  it("ignores messages from other origins", () => {
    const event = new MessageEvent("message", {
      origin: "https://evil.com",
      data: {
        source: EMBED_MESSAGE_SOURCE,
        version: EMBED_MESSAGE_VERSION,
        type: "title-change",
        title: "Hacked",
      },
    });
    navigationStore.getState().handleIframeMessage(event);
    expect(navigationStore.getState().pageTitle).not.toBe("Hacked");
  });

  it("ignores messages with wrong source", () => {
    const event = new MessageEvent("message", {
      origin: "http://localhost",
      data: {
        source: "other-plugin",
        version: EMBED_MESSAGE_VERSION,
        type: "title-change",
        title: "Hacked",
      },
    });
    navigationStore.getState().handleIframeMessage(event);
    expect(navigationStore.getState().pageTitle).not.toBe("Hacked");
  });

  it("updates pageTitle on title-change message", () => {
    const event = new MessageEvent("message", {
      origin: "http://localhost",
      data: {
        source: EMBED_MESSAGE_SOURCE,
        version: EMBED_MESSAGE_VERSION,
        type: "title-change",
        title: "New Title",
      },
    });
    navigationStore.getState().handleIframeMessage(event);
    expect(navigationStore.getState().pageTitle).toBe("New Title");
  });

  it("tracks iframe overlay state from overlay-state messages", () => {
    const event = new MessageEvent("message", {
      origin: "http://localhost",
      data: {
        source: EMBED_MESSAGE_SOURCE,
        version: EMBED_MESSAGE_VERSION,
        type: "overlay-state",
        active: true,
      },
    });

    navigationStore.getState().handleIframeMessage(event);

    expect(navigationStore.getState().iframeOverlayActive).toBe(true);
  });

  it("accepts page-ready messages as part of the iframe protocol", () => {
    const event = new MessageEvent("message", {
      origin: "http://localhost",
      data: {
        source: "wp-shell-embed",
        version: EMBED_MESSAGE_VERSION,
        type: "page-ready",
        url: "http://localhost/wp-admin/users.php?wp_shell_embed=1",
        title: "Users",
      },
    });

    navigationStore.setState({
      status: "loading",
      iframeOverlayActive: true,
      pendingNavigationSource: "shell",
    });
    navigationStore.getState().handleIframeMessage(event);

    const state = navigationStore.getState();
    expect(state.pageUrl).toBe("http://localhost/wp-admin/users.php");
    expect(state.iframeUrl).toBe("http://localhost/wp-admin/users.php?wp_shell_embed=1");
    expect(state.pageTitle).toBe("Users");
    expect(state.status).toBe("ready");
    expect(state.iframeOverlayActive).toBe(false);
    expect(state.pendingNavigationSource).toBe("shell");
  });

  it("blocks cross-origin breakout navigation", () => {
    const originalLocation = window.location;
    delete (window as unknown as Record<string, unknown>).location;
    const hrefSetter = vi.fn();
    (window as unknown as Record<string, unknown>).location = {
      origin: "http://localhost",
      get href() {
        return "http://localhost/wp-admin/admin.php";
      },
      set href(v: string) {
        hrefSetter(v);
      },
    };

    const event = new MessageEvent("message", {
      origin: "http://localhost",
      data: {
        source: EMBED_MESSAGE_SOURCE,
        version: EMBED_MESSAGE_VERSION,
        type: "breakout",
        url: "https://evil.com/steal-cookies",
      },
    });
    navigationStore.getState().handleIframeMessage(event);

    expect(hrefSetter).not.toHaveBeenCalled();

    (window as unknown as Record<string, unknown>).location = originalLocation;
  });

  it("allows same-origin breakout navigation", () => {
    const originalLocation = window.location;
    delete (window as unknown as Record<string, unknown>).location;
    const hrefSetter = vi.fn();
    (window as unknown as Record<string, unknown>).location = {
      origin: "http://localhost",
      get href() {
        return "http://localhost/wp-admin/admin.php";
      },
      set href(v: string) {
        hrefSetter(v);
      },
    };

    const event = new MessageEvent("message", {
      origin: "http://localhost",
      data: {
        source: EMBED_MESSAGE_SOURCE,
        version: EMBED_MESSAGE_VERSION,
        type: "breakout",
        url: "http://localhost/wp-admin/post-new.php",
      },
    });
    navigationStore.getState().handleIframeMessage(event);

    expect(hrefSetter).toHaveBeenCalledWith("http://localhost/wp-admin/post-new.php");

    (window as unknown as Record<string, unknown>).location = originalLocation;
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

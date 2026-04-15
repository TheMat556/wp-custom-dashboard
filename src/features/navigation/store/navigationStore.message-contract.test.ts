/**
 * Message-contract tests for navigationStore.handleIframeMessage()
 *
 * Covers the security hardening added in P1:
 *   - page-ready: rejects cross-origin URLs
 *   - page-ready: rejects URLs without the wp_shell_embed marker
 *   - page-ready: accepts valid same-origin embed URLs
 *   - session-expired: marks the session as expired
 *   - session-expired from bad origin: ignored
 *
 * Note: event.source pinning lives one layer up in useContentFrameController,
 * so these tests call handleIframeMessage() directly to validate the store's
 * own URL-validation and dispatch logic.
 *
 * jsdom URL: "http://localhost/wp-admin/admin.php" (set in vitest.config.ts)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMBED_MESSAGE_SOURCE, EMBED_MESSAGE_VERSION } from "../../../types/embedMessages";
import { sessionStore } from "../../session/store/sessionStore";
import { bootstrapNavigationStore, navigationStore, resetNavigationStore } from "./navigationStore";

function makeMessage(data: Record<string, unknown>, origin = "http://localhost") {
  return new MessageEvent("message", { origin, data });
}

function validPageReady(url = "http://localhost/wp-admin/users.php?wp_shell_embed=1") {
  return makeMessage({
    source: EMBED_MESSAGE_SOURCE,
    version: EMBED_MESSAGE_VERSION,
    type: "page-ready",
    url,
    title: "Users",
  });
}

beforeEach(() => {
  resetNavigationStore();
  bootstrapNavigationStore({
    breakoutPagenow: [],
    openInNewTabPatterns: [],
  });
  vi.spyOn(history, "pushState").mockImplementation(() => {});
  vi.spyOn(history, "replaceState").mockImplementation(() => {});
  // Reset session state between tests.
  sessionStore.setState({ expired: false, checking: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  resetNavigationStore();
});

// ── page-ready URL validation ─────────────────────────────────────────────────

describe("handleIframeMessage() — page-ready URL validation", () => {
  it("accepts a valid same-origin URL with the wp_shell_embed marker", () => {
    navigationStore.getState().handleIframeMessage(validPageReady());

    const state = navigationStore.getState();
    expect(state.status).toBe("ready");
    expect(state.iframeUrl).toBe("http://localhost/wp-admin/users.php?wp_shell_embed=1");
    expect(state.pageUrl).toBe("http://localhost/wp-admin/users.php");
    expect(state.pageTitle).toBe("Users");
    expect(state.iframeOverlayActive).toBe(false);
  });

  it("rejects a page-ready message with a cross-origin URL", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const event = makeMessage({
      source: EMBED_MESSAGE_SOURCE,
      version: EMBED_MESSAGE_VERSION,
      type: "page-ready",
      url: "https://evil.com/steal?wp_shell_embed=1",
      title: "Stolen",
    });

    navigationStore.setState({ status: "loading" });
    navigationStore.getState().handleIframeMessage(event);

    // Store state must not change.
    expect(navigationStore.getState().status).toBe("loading");
    expect(navigationStore.getState().pageTitle).not.toBe("Stolen");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Blocked page-ready with cross-origin URL"),
      expect.any(String)
    );
  });

  it("rejects a page-ready message without the wp_shell_embed marker", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const event = makeMessage({
      source: EMBED_MESSAGE_SOURCE,
      version: EMBED_MESSAGE_VERSION,
      type: "page-ready",
      url: "http://localhost/wp-admin/users.php", // missing wp_shell_embed
      title: "Users",
    });

    navigationStore.setState({ status: "loading" });
    navigationStore.getState().handleIframeMessage(event);

    expect(navigationStore.getState().status).toBe("loading");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Blocked page-ready with non-embed URL"),
      expect.any(String)
    );
  });
});

// ── session-expired ───────────────────────────────────────────────────────────

describe("handleIframeMessage() — session-expired", () => {
  it("marks the session as expired when message comes from the correct origin", () => {
    const event = makeMessage({
      source: EMBED_MESSAGE_SOURCE,
      version: EMBED_MESSAGE_VERSION,
      type: "session-expired",
    });

    navigationStore.getState().handleIframeMessage(event);

    expect(sessionStore.getState().expired).toBe(true);
  });

  it("ignores session-expired messages from other origins", () => {
    const event = makeMessage(
      {
        source: EMBED_MESSAGE_SOURCE,
        version: EMBED_MESSAGE_VERSION,
        type: "session-expired",
      },
      "https://attacker.example.com"
    );

    navigationStore.getState().handleIframeMessage(event);

    expect(sessionStore.getState().expired).toBe(false);
  });
});

// ── title-change ──────────────────────────────────────────────────────────────

describe("handleIframeMessage() — title-change", () => {
  it("updates pageTitle from a valid title-change message", () => {
    const event = makeMessage({
      source: EMBED_MESSAGE_SOURCE,
      version: EMBED_MESSAGE_VERSION,
      type: "title-change",
      title: "New Page Title",
    });

    navigationStore.getState().handleIframeMessage(event);

    expect(navigationStore.getState().pageTitle).toBe("New Page Title");
  });
});

// ── overlay-state ─────────────────────────────────────────────────────────────

describe("handleIframeMessage() — overlay-state", () => {
  it("activates the iframe overlay", () => {
    const event = makeMessage({
      source: EMBED_MESSAGE_SOURCE,
      version: EMBED_MESSAGE_VERSION,
      type: "overlay-state",
      active: true,
    });

    navigationStore.getState().handleIframeMessage(event);

    expect(navigationStore.getState().iframeOverlayActive).toBe(true);
  });

  it("deactivates the iframe overlay", () => {
    navigationStore.setState({ iframeOverlayActive: true });
    const event = makeMessage({
      source: EMBED_MESSAGE_SOURCE,
      version: EMBED_MESSAGE_VERSION,
      type: "overlay-state",
      active: false,
    });

    navigationStore.getState().handleIframeMessage(event);

    expect(navigationStore.getState().iframeOverlayActive).toBe(false);
  });
});

// ── unknown / malformed messages ──────────────────────────────────────────────

describe("handleIframeMessage() — malformed messages", () => {
  it("ignores messages with wrong source field", () => {
    const initialTitle = navigationStore.getState().pageTitle;
    const event = makeMessage({
      source: "not-wp-shell-embed",
      version: EMBED_MESSAGE_VERSION,
      type: "title-change",
      title: "Injected",
    });

    navigationStore.getState().handleIframeMessage(event);

    expect(navigationStore.getState().pageTitle).toBe(initialTitle);
  });

  it("ignores messages with wrong version", () => {
    const initialTitle = navigationStore.getState().pageTitle;
    const event = makeMessage({
      source: EMBED_MESSAGE_SOURCE,
      version: 999,
      type: "title-change",
      title: "Injected",
    });

    navigationStore.getState().handleIframeMessage(event);

    expect(navigationStore.getState().pageTitle).toBe(initialTitle);
  });
});

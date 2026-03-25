/**
 * Global test setup — runs before every test file.
 *
 * Loaded via vitest.config.ts → test.setupFiles.
 * At this point jsdom is already active, so window/document exist.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

const DEFAULT_NAVIGATION = {
  fullReloadPageParams: ["site-health", "wp-react-ui-branding", "h-bricks-elements"],
  shellDisabledPagenow: ["post.php", "post-new.php", "site-editor.php"],
  breakoutPagenow: ["post.php", "post-new.php", "site-editor.php", "customize.php", "export.php"],
  openInNewTabPatterns: [],
};

// Minimal wpReactUi stub used by main/bootstrap configuration tests.
Object.defineProperty(window, "wpReactUi", {
  writable: true,
  configurable: true,
  value: {
    theme: "light",
    restUrl: "http://localhost/wp-json/wp-react-ui/v1",
    nonce: "test-nonce",
    adminUrl: "http://localhost/wp-admin/",
    siteName: "Test Site",
    assetsUrl: "http://localhost/wp-content/plugins/wp-custom-dashboard/dist/",
    user: { name: "Admin", role: "administrator" },
    branding: {
      siteName: "Test Site",
      logos: { lightUrl: null, darkUrl: null, defaultUrl: "/logo.svg" },
    },
    navigation: DEFAULT_NAVIGATION,
    logoutUrl: "http://localhost/wp-login.php?action=logout",
    logoutNonce: "logout-nonce",
    menu: [],
  },
});

Object.defineProperty(window, "wpReactUiBoot", {
  writable: true,
  configurable: true,
  value: {
    layout: {
      mobileBreakpoint: 768,
      collapsedStorageKey: "wp-react-sidebar-collapsed",
      sidebarWidths: {
        expanded: 240,
        collapsed: 64,
        mobile: 0,
      },
    },
    theme: {
      storageKey: "wp-react-ui-theme",
    },
  },
});

// Stub fetch globally — individual tests override this via vi.stubGlobal()
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.body.innerHTML = "";
  document.title = "";
  window.__wpReactUiTeardown = undefined;
  (window.wpReactUi as { theme: string }).theme = "light";
  (window.wpReactUi as { menu: unknown[] }).menu = [];
  (window.wpReactUi as { navigation: typeof DEFAULT_NAVIGATION }).navigation = {
    ...DEFAULT_NAVIGATION,
  };
});

/**
 * Global test setup — runs before every test file.
 *
 * Loaded via vitest.config.ts → test.setupFiles.
 * At this point jsdom is already active, so window/document exist.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Minimal wpReactUi stub — must exist before any module-level code in
// ThemeContext.tsx runs (it reads window.wpReactUi?.theme at import time).
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
    logoutUrl: "http://localhost/wp-login.php?action=logout",
    logoutNonce: "logout-nonce",
    menu: [],
  },
});

// Stub fetch globally — individual tests override this via vi.stubGlobal()
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.body.innerHTML = "";
  document.title = "";
  (window.wpReactUi as { theme: string }).theme = "light";
});

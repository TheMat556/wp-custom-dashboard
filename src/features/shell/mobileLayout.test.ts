/**
 * Mobile layout regression tests.
 *
 * Verifies the CSS rules in critical.css that keep the shell
 * fully visible on mobile browsers (iOS Safari / Android Chrome).
 *
 * These rules MUST stay in sync. If you change critical.css, update the
 * expected values here too.
 *
 * Why CSS rule assertions rather than a rendering test?
 * jsdom does not compute CSS layout, so we assert the *source rules*
 * that guarantee the correct behaviour in a real browser:
 *
 *  - #wpwrap must be `position: fixed; inset: 0` — pins the shell to the
 *    visual viewport. Prevents iOS Safari from scrolling the layout when the
 *    URL bar animates or the virtual keyboard opens.
 *
 *  - #react-shell-root must NOT use `100vh` — on iOS Safari `100vh` equals
 *    the "large" viewport (URL bar hidden), which is taller than the actual
 *    visible fixed container. Using `height: 100%` instead makes the shell
 *    root exactly as tall as its fixed parent (#wpwrap = visual viewport).
 *
 *  - #wpwrap must use `height: auto` (not `100vh`) — the fixed+inset combo
 *    already sizes it to the viewport; an explicit `100vh` conflicts with the
 *    dynamic viewport on iOS.
 *
 *  - Shell navbar slot must be 64 px tall (first grid row of #wpwrap).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadCriticalCss(): string {
  return readFileSync(resolve(__dirname, "../../../includes/critical.css"), "utf-8");
}

/** Very lightweight rule extractor — no full CSS parser needed for our checks. */
function extractRule(css: string, selector: string): string | null {
  // Match selector followed by its { … } block (handles multi-line, single block).
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, "s");
  const m = re.exec(css);
  return m ? m[1] : null;
}

function prop(block: string, property: string): string | null {
  const re = new RegExp(`${property}\\s*:\\s*([^;!\\n]+)(?:\\s*!important)?`, "i");
  const m = re.exec(block);
  return m ? m[1].trim() : null;
}

function hasProp(block: string, property: string, value: string): boolean {
  const re = new RegExp(`${property}\\s*:\\s*[^;]*${value}[^;]*(?:!important)?\\s*;`, "i");
  return re.test(block);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("critical.css mobile layout rules", () => {
  const css = loadCriticalCss();

  // ── #wpwrap ────────────────────────────────────────────────────────────────

  describe("#wpwrap", () => {
    const block = extractRule(css, "#wpwrap");

    it("exists in critical.css", () => {
      expect(block).not.toBeNull();
    });

    it("uses position: fixed to pin the shell to the visual viewport", () => {
      expect(block).not.toBeNull();
      if (!block) throw new Error("Expected #wpwrap block in critical.css");
      expect(hasProp(block, "position", "fixed")).toBe(true);
    });

    it("sets top: 0 so it anchors at the viewport top edge", () => {
      expect(block).not.toBeNull();
      if (!block) throw new Error("Expected #wpwrap block in critical.css");
      expect(hasProp(block, "top", "0")).toBe(true);
    });

    it("sets left: 0 so it anchors at the viewport left edge", () => {
      expect(block).not.toBeNull();
      if (!block) throw new Error("Expected #wpwrap block in critical.css");
      expect(hasProp(block, "left", "0")).toBe(true);
    });

    it("sets right: 0 so it spans the full viewport width", () => {
      expect(block).not.toBeNull();
      if (!block) throw new Error("Expected #wpwrap block in critical.css");
      expect(hasProp(block, "right", "0")).toBe(true);
    });

    it("sets bottom: 0 so it spans to the viewport bottom (excludes virtual keyboard)", () => {
      expect(block).not.toBeNull();
      if (!block) throw new Error("Expected #wpwrap block in critical.css");
      expect(hasProp(block, "bottom", "0")).toBe(true);
    });

    it("does NOT use height: 100vh (conflicts with dynamic viewport on iOS)", () => {
      expect(block).not.toBeNull();
      if (!block) throw new Error("Expected #wpwrap block in critical.css");
      // height: auto or height: 100% are fine; height: 100vh is not
      const heightVal = prop(block, "height");
      expect(heightVal).not.toMatch(/100vh/i);
    });

    it("uses overflow: hidden to clip content that would otherwise scroll", () => {
      expect(block).not.toBeNull();
      if (!block) throw new Error("Expected #wpwrap block in critical.css");
      expect(hasProp(block, "overflow", "hidden")).toBe(true);
    });

    it("defines a grid with first row of 65px for the shell navbar", () => {
      expect(block).not.toBeNull();
      if (!block) throw new Error("Expected #wpwrap block in critical.css");
      expect(hasProp(block, "grid-template-rows", "65px")).toBe(true);
    });
  });

  // ── #react-shell-root ─────────────────────────────────────────────────────

  describe("#react-shell-root (main block, not :not(.mounted))", () => {
    // Manually grab the first #react-shell-root { } block
    const firstBlock = (() => {
      const idx = css.indexOf("#react-shell-root {");
      if (idx === -1) return null;
      const start = css.indexOf("{", idx);
      const end = css.indexOf("}", start);
      return css.slice(start + 1, end);
    })();

    it("exists in critical.css", () => {
      expect(firstBlock).not.toBeNull();
    });

    it("does NOT use height: 100vh (causes overflow on iOS Safari)", () => {
      expect(firstBlock).not.toBeNull();
      if (!firstBlock) throw new Error("Expected #react-shell-root block in critical.css");
      const heightVal = prop(firstBlock, "height");
      expect(heightVal).not.toMatch(/100vh/i);
    });

    it("does NOT use min-height: 100vh (same iOS overflow issue)", () => {
      expect(firstBlock).not.toBeNull();
      if (!firstBlock) throw new Error("Expected #react-shell-root block in critical.css");
      const minHeightVal = prop(firstBlock, "min-height");
      // min-height: 0 or unset are fine
      if (minHeightVal) {
        expect(minHeightVal).not.toMatch(/100vh/i);
      }
    });

    it("does NOT use position: sticky (meaningless inside overflow:hidden, can break layout)", () => {
      expect(firstBlock).not.toBeNull();
      if (!firstBlock) throw new Error("Expected #react-shell-root block in critical.css");
      const posVal = prop(firstBlock, "position");
      if (posVal) {
        expect(posVal).not.toMatch(/sticky/i);
      }
    });

    it("uses height: 100% so it matches the fixed #wpwrap container exactly", () => {
      expect(firstBlock).not.toBeNull();
      expect(firstBlock).toMatch(/height\s*:\s*100%/i);
    });
  });

  // ── Mobile sidebar overlay ────────────────────────────────────────────────

  describe("ChatPage.module.css mobile sidebar overlay", () => {
    const chatCss = readFileSync(
      resolve(__dirname, "../chat/components/ChatPage/ChatPage.module.css"),
      "utf-8"
    );

    it("positions mobile sidebar below the shell navbar (top: ~64px)", () => {
      // The top value should reference the --shell-navbar-height variable (64px)
      // NOT calc(64px + 64px) = 128px which wrongly skips the chat navbar too
      expect(chatCss).toMatch(/top\s*:\s*var\(--shell-navbar-height/i);
      expect(chatCss).not.toMatch(/top\s*:\s*calc\(var\(--shell-navbar-height[^)]*\)\s*\+\s*64px/i);
    });

    it("backdrop top also uses shell-navbar-height, not 128px", () => {
      // Verify backdrop hasn't been shifted to calc(64px+64px)
      const backdropSection = chatCss.slice(chatCss.indexOf("sidebarBackdrop"));
      const topMatch = backdropSection.match(/top\s*:\s*([^;]+)/i);
      expect(topMatch?.[1]).toMatch(/--shell-navbar-height/i);
    });
  });
});

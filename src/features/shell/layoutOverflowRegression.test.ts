import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function loadSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), "utf-8");
}

function extractRule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, "s").exec(css);
  return match ? match[1] : null;
}

describe("shell overflow regression guards", () => {
  it("keeps the iframe/content slot hidden-clipped instead of overflow: clip", () => {
    const css = loadSource("../../../src/index.css");
    const block = extractRule(css, ".wp-react-ui-shell-content-slot");

    expect(block).not.toBeNull();
    expect(block).toMatch(/overflow\s*:\s*hidden/i);
    expect(block).not.toMatch(/overflow\s*:\s*clip/i);
  });

  it("keeps the desktop sidebar frame shrink-safe and hidden-clipped", () => {
    const sidebarSource = loadSource("../../../src/features/shell/components/sidebar/index.tsx");

    expect(sidebarSource).toContain('flex: "1 1 auto"');
    expect(sidebarSource).toContain('overflow: "hidden"');
    expect(sidebarSource).not.toContain('overflow: "clip"');
  });

  it("removes the hidden native wpcontent from layout once the shell is active", () => {
    const criticalCss = loadSource("../../../includes/critical.css");

    expect(criticalCss).toMatch(
      /#wpwrap\.has-react-shell > #wpcontent,\s*#wpwrap\.has-react-shell > #wpfooter\s*\{[\s\S]*display:\s*none/i
    );
    expect(criticalCss).toMatch(/grid-template-rows:\s*65px\s+minmax\(0,\s*1fr\)\s*!important/i);
  });
});

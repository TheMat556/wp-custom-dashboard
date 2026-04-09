import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShellMountEffects } from "./ShellMountEffects";

describe("ShellMountEffects", () => {
  it("marks the shell and wpwrap as ready after commit", () => {
    document.body.innerHTML = `
      <div id="wpwrap">
        <div id="react-shell-root"></div>
      </div>
    `;

    const host = document.getElementById("react-shell-root");
    const wpwrap = document.getElementById("wpwrap");

    if (!host || !wpwrap) {
      throw new Error("Expected shell host and wpwrap to exist");
    }

    render(<ShellMountEffects host={host} />);

    expect(host.classList.contains("mounted")).toBe(true);
    expect(wpwrap.classList.contains("react-ready")).toBe(true);
  });
});

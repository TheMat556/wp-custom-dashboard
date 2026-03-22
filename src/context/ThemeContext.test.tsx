/**
 * Tests for ThemeContext.tsx
 *
 * The module-level store runs applyThemeToDOM() immediately on import.
 * Strategy: set up DOM + wpReactUi BEFORE the dynamic import so the
 * module-level side effects land on a jsdom that's ready.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupDom() {
  document.body.innerHTML = `
    <div id="react-navbar-root"></div>
    <div id="react-sidebar-root"></div>
  `;
}

function setServerTheme(theme: "light" | "dark") {
  (window as Window & { wpReactUi: typeof window.wpReactUi }).wpReactUi = {
    ...window.wpReactUi,
    theme,
  };
}

// ── applyThemeToDOM (module-level side effect on import) ──────────────────────

describe("applyThemeToDOM", () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets data-theme='light' on body and roots when server theme is light", async () => {
    setServerTheme("light");
    await import("../context/ThemeContext");

    expect(document.body.getAttribute("data-theme")).toBe("light");
    expect(document.getElementById("react-navbar-root")?.getAttribute("data-theme")).toBe("light");
    expect(document.getElementById("react-sidebar-root")?.getAttribute("data-theme")).toBe("light");
  });

  it("sets data-theme='dark' when server theme is dark", async () => {
    setServerTheme("dark");
    await import("../context/ThemeContext");

    expect(document.body.getAttribute("data-theme")).toBe("dark");
    expect(document.getElementById("react-navbar-root")?.getAttribute("data-theme")).toBe("dark");
  });

  it("prefers localStorage over server theme", async () => {
    setServerTheme("light");
    localStorage.setItem("wp-react-ui-theme", "dark");
    await import("../context/ThemeContext");

    expect(document.body.getAttribute("data-theme")).toBe("dark");
  });
});

// ── ThemeProvider + useTheme ──────────────────────────────────────────────────

describe("ThemeProvider / useTheme", () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    setServerTheme("light");
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provides the current theme to consumers", async () => {
    const { ThemeProvider, useTheme } = await import("../context/ThemeContext");

    function Consumer() {
      const { theme } = useTheme();
      return <span data-testid="theme">{theme}</span>;
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("toggles from light to dark and updates the DOM", async () => {
    const { ThemeProvider, useTheme } = await import("../context/ThemeContext");

    function ToggleButton() {
      const { theme, toggle } = useTheme();
      return (
        <button type="submit" data-testid="toggle" onClick={toggle}>
          {theme}
        </button>
      );
    }

    render(
      <ThemeProvider>
        <ToggleButton />
      </ThemeProvider>
    );

    expect(screen.getByTestId("toggle").textContent).toBe("light");

    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(screen.getByTestId("toggle").textContent).toBe("dark");
    expect(document.body.getAttribute("data-theme")).toBe("dark");
  });

  it("persists theme to localStorage on toggle", async () => {
    const { ThemeProvider, useTheme } = await import("../context/ThemeContext");

    function ToggleButton() {
      const { toggle } = useTheme();
      return <button type="submit" data-testid="toggle" onClick={toggle} />;
    }

    render(
      <ThemeProvider>
        <ToggleButton />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(localStorage.getItem("wp-react-ui-theme")).toBe("dark");
  });

  it("calls the REST endpoint to persist theme on toggle", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { ThemeProvider, useTheme } = await import("../context/ThemeContext");

    function ToggleButton() {
      const { toggle } = useTheme();
      return <button type="submit" data-testid="toggle" onClick={toggle} />;
    }

    render(
      <ThemeProvider>
        <ToggleButton />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/wp-json/wp-react-ui/v1/theme",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-WP-Nonce": "test-nonce",
        }),
        body: JSON.stringify({ theme: "dark" }),
      })
    );
  });

  it("dispatches wp-react-ui-theme-change custom event on toggle", async () => {
    const { ThemeProvider, useTheme } = await import("../context/ThemeContext");

    function ToggleButton() {
      const { toggle } = useTheme();
      return <button type="submit" data-testid="toggle" onClick={toggle} />;
    }

    render(
      <ThemeProvider>
        <ToggleButton />
      </ThemeProvider>
    );

    const listener = vi.fn();
    window.addEventListener("wp-react-ui-theme-change", listener);

    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.theme).toBe("dark");

    window.removeEventListener("wp-react-ui-theme-change", listener);
  });

  it("two providers sharing the module-level store stay in sync", async () => {
    const { ThemeProvider, useTheme } = await import("../context/ThemeContext");

    function Consumer({ id }: { id: string }) {
      const { theme } = useTheme();
      return <span data-testid={id}>{theme}</span>;
    }

    function Toggler() {
      const { toggle } = useTheme();
      return <button type="submit" data-testid="toggle" onClick={toggle} />;
    }

    const { unmount: unmountA } = render(
      <ThemeProvider>
        <Consumer id="a" />
        <Toggler />
      </ThemeProvider>
    );

    const { unmount: unmountB } = render(
      <ThemeProvider>
        <Consumer id="b" />
      </ThemeProvider>
    );

    expect(screen.getByTestId("a").textContent).toBe("light");
    expect(screen.getByTestId("b").textContent).toBe("light");

    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(screen.getByTestId("a").textContent).toBe("dark");
    expect(screen.getByTestId("b").textContent).toBe("dark");

    unmountA();
    unmountB();
  });
});

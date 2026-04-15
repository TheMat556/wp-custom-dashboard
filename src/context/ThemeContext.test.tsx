/**
 * Tests for themeStore.ts and ThemeContext.tsx
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupDom() {
  document.body.innerHTML = `
    <div id="react-shell-root"></div>
  `;
}

function getThemeBootstrapConfig(theme: "light" | "dark") {
  return {
    theme,
    restUrl: "http://localhost/wp-json/wp-react-ui/v1",
    nonce: "test-nonce",
  };
}

// ── bootstrapThemeStore ───────────────────────────────────────────────────────

describe("bootstrapThemeStore", () => {
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
    const { bootstrapThemeStore } = await import("../store/themeStore");
    bootstrapThemeStore(getThemeBootstrapConfig("light"));

    expect(document.body.getAttribute("data-theme")).toBe("light");
    expect(document.getElementById("react-shell-root")?.getAttribute("data-theme")).toBe("light");
  });

  it("sets data-theme='dark' when server theme is dark", async () => {
    const { bootstrapThemeStore } = await import("../store/themeStore");
    bootstrapThemeStore(getThemeBootstrapConfig("dark"));

    expect(document.body.getAttribute("data-theme")).toBe("dark");
    expect(document.getElementById("react-shell-root")?.getAttribute("data-theme")).toBe("dark");
  });

  it("prefers localStorage over server theme", async () => {
    localStorage.setItem("wp-react-ui-theme", "dark");
    const { bootstrapThemeStore } = await import("../store/themeStore");
    bootstrapThemeStore(getThemeBootstrapConfig("light"));

    expect(document.body.getAttribute("data-theme")).toBe("dark");
    expect(document.getElementById("react-shell-root")?.getAttribute("data-theme")).toBe("dark");
  });
});

// ── ThemeProvider + useTheme ──────────────────────────────────────────────────

describe("useTheme", () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provides the current theme to consumers", async () => {
    const { useTheme } = await import("../context/ThemeContext");
    const { bootstrapThemeStore } = await import("../store/themeStore");
    bootstrapThemeStore(getThemeBootstrapConfig("light"));

    function Consumer() {
      const { theme } = useTheme();
      return <span data-testid="theme">{theme}</span>;
    }

    render(<Consumer />);

    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("toggles from light to dark and updates the DOM", async () => {
    const { useTheme } = await import("../context/ThemeContext");
    const { bootstrapThemeStore } = await import("../store/themeStore");
    bootstrapThemeStore(getThemeBootstrapConfig("light"));

    function ToggleButton() {
      const { theme, toggle } = useTheme();
      return (
        <button type="submit" data-testid="toggle" onClick={toggle}>
          {theme}
        </button>
      );
    }

    render(<ToggleButton />);

    expect(screen.getByTestId("toggle").textContent).toBe("light");

    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(screen.getByTestId("toggle").textContent).toBe("dark");
    expect(document.body.getAttribute("data-theme")).toBe("dark");
  });

  it("persists theme to localStorage on toggle", async () => {
    const { useTheme } = await import("../context/ThemeContext");
    const { bootstrapThemeStore } = await import("../store/themeStore");
    bootstrapThemeStore(getThemeBootstrapConfig("light"));

    function ToggleButton() {
      const { toggle } = useTheme();
      return <button type="submit" data-testid="toggle" onClick={toggle} />;
    }

    render(<ToggleButton />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(localStorage.getItem("wp-react-ui-theme")).toBe("dark");
  });

  it("calls the REST endpoint to persist theme on toggle", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { useTheme } = await import("../context/ThemeContext");
    const { bootstrapThemeStore } = await import("../store/themeStore");
    bootstrapThemeStore(getThemeBootstrapConfig("light"));

    function ToggleButton() {
      const { toggle } = useTheme();
      return <button type="submit" data-testid="toggle" onClick={toggle} />;
    }

    render(<ToggleButton />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    const [themeUrl, themeInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(themeUrl).toBe("http://localhost/wp-json/wp-react-ui/v1/theme");
    expect(themeInit.method).toBe("POST");
    expect(themeInit.body).toBe(JSON.stringify({ theme: "dark" }));
    expect(new Headers(themeInit.headers).get("X-WP-Nonce")).toBe("test-nonce");
  });

  it("dispatches wp-react-ui-theme-change custom event on toggle", async () => {
    const { useTheme } = await import("../context/ThemeContext");
    const { bootstrapThemeStore } = await import("../store/themeStore");
    bootstrapThemeStore(getThemeBootstrapConfig("light"));

    function ToggleButton() {
      const { toggle } = useTheme();
      return <button type="submit" data-testid="toggle" onClick={toggle} />;
    }

    render(<ToggleButton />);

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
    const { useTheme } = await import("../context/ThemeContext");
    const { bootstrapThemeStore } = await import("../store/themeStore");
    bootstrapThemeStore(getThemeBootstrapConfig("light"));

    function Consumer({ id }: { id: string }) {
      const { theme } = useTheme();
      return <span data-testid={id}>{theme}</span>;
    }

    function Toggler() {
      const { toggle } = useTheme();
      return <button type="submit" data-testid="toggle" onClick={toggle} />;
    }

    const { unmount: unmountA } = render(
      <>
        <Consumer id="a" />
        <Toggler />
      </>
    );

    const { unmount: unmountB } = render(<Consumer id="b" />);

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

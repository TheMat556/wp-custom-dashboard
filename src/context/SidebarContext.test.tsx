import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function setupDom() {
  document.body.innerHTML = `
    <div id="react-shell-root"></div>
  `;
  document.documentElement.style.removeProperty("--sidebar-width");
}

function resetViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

describe("SidebarProvider / useSidebar", () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    vi.resetModules();
    resetViewport(1280);
    delete (window as Window & { __wpReactUiSidebarResizeBound?: boolean })
      .__wpReactUiSidebarResizeBound;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders desktop sidebar state without unstable snapshot loops", async () => {
    const { SidebarProvider, useSidebar } = await import("../context/SidebarContext");

    function Consumer() {
      const { collapsed, isMobile, mobileOpen, sidebarWidth } = useSidebar();

      return (
        <span data-testid="sidebar-state">
          {JSON.stringify({ collapsed, isMobile, mobileOpen, sidebarWidth })}
        </span>
      );
    }

    expect(() =>
      render(
        <SidebarProvider>
          <Consumer />
        </SidebarProvider>
      )
    ).not.toThrow();

    expect(screen.getByTestId("sidebar-state")).toHaveTextContent(
      JSON.stringify({
        collapsed: false,
        isMobile: false,
        mobileOpen: false,
        sidebarWidth: 240,
      })
    );
    expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("240px");
  });

  it("toggles desktop collapsed state and persists the new width", async () => {
    const { SidebarProvider, useSidebar } = await import("../context/SidebarContext");

    function ToggleButton() {
      const { collapsed, sidebarWidth, toggle } = useSidebar();

      return (
        <button type="button" data-testid="toggle" onClick={toggle}>
          {`${collapsed}-${sidebarWidth}`}
        </button>
      );
    }

    render(
      <SidebarProvider>
        <ToggleButton />
      </SidebarProvider>
    );

    expect(screen.getByTestId("toggle")).toHaveTextContent("false-240");

    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle"));
    });

    expect(screen.getByTestId("toggle")).toHaveTextContent("true-64");
    expect(localStorage.getItem("wp-react-sidebar-collapsed")).toBe("true");
    expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("64px");
  });
});

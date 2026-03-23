import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useMenu", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `<div id="react-shell-root"></div>`;
    window.wpReactUi = {
      ...window.wpReactUi,
      menu: [
        { label: "Dashboard", slug: "index.php" },
        { label: "Plugins", slug: "plugins.php" },
      ],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shares menu state across multiple consumers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        menu: [
          { label: "Dashboard", slug: "index.php" },
          { label: "Users", slug: "users.php" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { useMenu } = await import("./useMenu");
    const { bootstrapMenuStore, resetMenuStore } = await import("../store/menuStore");
    resetMenuStore();
    bootstrapMenuStore({
      menu: window.wpReactUi?.menu ?? [],
      restUrl: "http://localhost/wp-json/wp-react-ui/v1",
      nonce: "test-nonce",
    });

    function NavbarConsumer() {
      const { menuItems } = useMenu();
      return <span data-testid="navbar-menu">{menuItems.map((item) => item.label).join(",")}</span>;
    }

    function SidebarConsumer() {
      const { menuItems, refresh } = useMenu();

      return (
        <>
          <span data-testid="sidebar-menu">{menuItems.map((item) => item.label).join(",")}</span>
          <button type="button" data-testid="refresh" onClick={() => void refresh()} />
        </>
      );
    }

    render(
      <>
        <NavbarConsumer />
        <SidebarConsumer />
      </>
    );

    expect(screen.getByTestId("navbar-menu")).toHaveTextContent("Dashboard,Plugins");
    expect(screen.getByTestId("sidebar-menu")).toHaveTextContent("Dashboard,Plugins");

    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh"));
      await Promise.resolve();
    });

    expect(screen.getByTestId("navbar-menu")).toHaveTextContent("Dashboard,Users");
    expect(screen.getByTestId("sidebar-menu")).toHaveTextContent("Dashboard,Users");
    expect(window.wpReactUi?.menu?.[1]?.slug).toBe("plugins.php");
  });
});

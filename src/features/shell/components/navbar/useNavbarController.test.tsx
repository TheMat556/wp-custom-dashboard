import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NavbarController } from "./useNavbarController";
import { useNavbarController } from "./useNavbarController";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("../../context/ShellConfigContext", () => ({
  useShellConfig: () => ({
    adminUrl: "http://localhost/wp-admin/",
    publicUrl: "http://localhost/",
  }),
}));

vi.mock("../../context/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggle: vi.fn() }),
}));

vi.mock("../../context/SidebarContext", () => ({
  useSidebar: () => ({ collapsed: false, toggle: vi.fn(), isMobile: false }),
}));

vi.mock("../../../navigation/hooks/useMenu", () => ({
  useMenu: () => ({ menuItems: [] }),
}));

vi.mock("../../../../utils/spaNavigate", () => ({
  useActiveKey: () => "http://localhost/wp-admin/edit.php",
}));

vi.mock("../../../../utils/wp", () => ({
  navigate: vi.fn(),
  navigateHome: vi.fn(),
}));

// vi.hoisted ensures the fn is available inside the vi.mock factory below
const { mockReadAdminBarAction } = vi.hoisted(() => ({
  mockReadAdminBarAction: vi.fn(() => null as { id: string; title: string; html: string } | null),
}));

vi.mock("../../../../utils/adminBar", () => ({
  readAdminBarAction: mockReadAdminBarAction,
  triggerAdminBarAction: vi.fn(),
  triggerAdminBarActionIn: vi.fn(),
}));

// mutable variable; the zustand mock reads it via a getter so per-test changes take effect
let mockNavigationStatus = "idle";

vi.mock("zustand", async (importOriginal) => {
  const orig = await importOriginal<typeof import("zustand")>();
  return {
    ...orig,
    useStore: (_store: unknown, selector: (s: unknown) => unknown) =>
      selector({
        get status() {
          return mockNavigationStatus;
        },
      }),
  };
});

// ── ResizeObserver mock helpers ───────────────────────────────────────────────

let capturedResizeCallback: ResizeObserverCallback | null = null;
let mockObserve: ReturnType<typeof vi.fn>;
let mockDisconnect: ReturnType<typeof vi.fn>;

/**
 * Minimal harness that attaches containerRef to a real DOM node so the
 * ResizeObserver effect can run (it guards on el being non-null).
 */
function NavbarHarness({ onCtrl }: { onCtrl: (c: NavbarController) => void }) {
  const ctrl = useNavbarController();
  onCtrl(ctrl);
  return <div ref={ctrl.containerRef} />;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("useNavbarController", () => {
  beforeEach(() => {
    mockNavigationStatus = "idle";
    mockReadAdminBarAction.mockReturnValue(null);
    capturedResizeCallback = null;
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    const _observe = mockObserve;
    const _disconnect = mockDisconnect;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: ResizeObserverCallback) {
          capturedResizeCallback = cb;
        }
        observe = _observe;
        disconnect = _disconnect;
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ── ResizeObserver lifecycle ─────────────────────────────────────────────

  describe("ResizeObserver", () => {
    it("creates an observer and calls observe() on the container element", () => {
      render(<NavbarHarness onCtrl={() => {}} />);
      expect(mockObserve).toHaveBeenCalledOnce();
    });

    it("calls disconnect() on unmount", () => {
      const { unmount } = render(<NavbarHarness onCtrl={() => {}} />);
      unmount();
      expect(mockDisconnect).toHaveBeenCalledOnce();
    });

    it("does not create an observer when containerRef.current is null", () => {
      // renderHook has no DOM element to attach the ref to
      renderHook(() => useNavbarController());
      expect(mockObserve).not.toHaveBeenCalled();
    });

    it("updates showExport/showHistory when the ResizeObserver fires a narrow width", () => {
      let latestCtrl!: NavbarController;
      render(
        <NavbarHarness
          onCtrl={(c) => {
            latestCtrl = c;
          }}
        />
      );

      act(() => {
        capturedResizeCallback?.(
          [{ contentRect: { width: 400 } } as ResizeObserverEntry],
          null as unknown as ResizeObserver
        );
      });

      expect(latestCtrl.showExport).toBe(false);
      expect(latestCtrl.showHistory).toBe(false);
      expect(latestCtrl.showTheme).toBe(false);
      expect(latestCtrl.showSearchFull).toBe(false);
    });
  });

  // ── Overflow flag breakpoints ────────────────────────────────────────────

  describe("overflow flags", () => {
    it("all flags are true at the default containerWidth of 1200", () => {
      const { result } = renderHook(() => useNavbarController());
      expect(result.current.showExport).toBe(true);
      expect(result.current.showHistory).toBe(true);
      expect(result.current.showTheme).toBe(true);
      expect(result.current.showSearchFull).toBe(true);
    });

    it.each<[number, boolean, boolean, boolean, boolean]>([
      // [width, showExport(≥860), showHistory(≥720), showTheme(≥580), showSearchFull(≥640)]
      [860, true, true, true, true],
      [859, false, true, true, true],
      [720, false, true, true, true],
      [719, false, false, true, true],
      [640, false, false, true, true],
      [639, false, false, true, false],
      [580, false, false, true, false],
      [400, false, false, false, false],
    ])("containerWidth=%i → showExport=%s showHistory=%s showTheme=%s showSearchFull=%s", (width, expExport, expHistory, expTheme, expSearchFull) => {
      let latestCtrl!: NavbarController;
      render(
        <NavbarHarness
          onCtrl={(c) => {
            latestCtrl = c;
          }}
        />
      );

      act(() => {
        capturedResizeCallback?.(
          [{ contentRect: { width } } as ResizeObserverEntry],
          null as unknown as ResizeObserver
        );
      });

      expect(latestCtrl.showExport).toBe(expExport);
      expect(latestCtrl.showHistory).toBe(expHistory);
      expect(latestCtrl.showTheme).toBe(expTheme);
      expect(latestCtrl.showSearchFull).toBe(expSearchFull);
    });
  });

  // ── adminBar sync / retry loop ───────────────────────────────────────────

  describe("adminBar sync", () => {
    it("calls readAdminBarAction synchronously when navigationStatus is ready", () => {
      mockNavigationStatus = "ready";
      renderHook(() => useNavbarController());
      expect(mockReadAdminBarAction).toHaveBeenCalled();
    });

    it("schedules retries when the action is not found on the first attempt", () => {
      vi.useFakeTimers();
      mockNavigationStatus = "ready";

      renderHook(() => useNavbarController());
      const callsAfterMount = mockReadAdminBarAction.mock.calls.length;

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(mockReadAdminBarAction.mock.calls.length).toBeGreaterThan(callsAfterMount);
    });

    it("stops scheduling retries once the action is found", () => {
      vi.useFakeTimers();
      mockNavigationStatus = "ready";
      mockReadAdminBarAction.mockReturnValue({
        id: "wp-admin-bar-snn-ai-chat",
        title: "AI Chat",
        html: "<span>AI</span>",
      });

      renderHook(() => useNavbarController());
      const callsAfterMount = mockReadAdminBarAction.mock.calls.length;

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // No additional attempts after a successful sync
      expect(mockReadAdminBarAction.mock.calls.length).toBe(callsAfterMount);
    });

    it("aborts the retry loop when the component unmounts", () => {
      vi.useFakeTimers();
      mockNavigationStatus = "ready";

      const { unmount } = renderHook(() => useNavbarController());
      const callsBeforeUnmount = mockReadAdminBarAction.mock.calls.length;

      unmount(); // sets cancelled = true in the effect closure
      act(() => {
        vi.advanceTimersByTime(2000);
      }); // advance past all 8 × 250 ms retry slots

      // The cancelled flag must prevent all further readAdminBarAction calls
      expect(mockReadAdminBarAction.mock.calls.length).toBe(callsBeforeUnmount);
    });
  });

  // ── Activity panel state ─────────────────────────────────────────────────

  describe("activity panel", () => {
    it("openActivity sets activityOpen=true and activityEverOpened=true", () => {
      const { result } = renderHook(() => useNavbarController());
      act(() => {
        result.current.openActivity();
      });
      expect(result.current.activityOpen).toBe(true);
      expect(result.current.activityEverOpened).toBe(true);
    });

    it("closeActivity sets activityOpen=false", () => {
      const { result } = renderHook(() => useNavbarController());
      act(() => {
        result.current.openActivity();
      });
      act(() => {
        result.current.closeActivity();
      });
      expect(result.current.activityOpen).toBe(false);
    });

    it("activityEverOpened remains true after closeActivity", () => {
      const { result } = renderHook(() => useNavbarController());
      act(() => {
        result.current.openActivity();
      });
      act(() => {
        result.current.closeActivity();
      });
      expect(result.current.activityEverOpened).toBe(true);
    });
  });
});

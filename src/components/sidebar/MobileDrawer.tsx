import { theme } from "antd";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getBootConfig } from "../../config/bootConfig";

const SIDEBAR_WIDTH = getBootConfig().layout.sidebarWidths.expanded;
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableEdges(container: HTMLElement): [HTMLElement, HTMLElement] | null {
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  if (focusable.length === 0) return null;
  return [focusable[0], focusable[focusable.length - 1]];
}

function trapFocus(e: KeyboardEvent, container: HTMLElement) {
  const edges = getFocusableEdges(container);
  if (!edges) return;

  const [first, last] = edges;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { token } = theme.useToken();
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        trapFocus(e, panelRef.current);
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    if (!open) return;

    document.addEventListener("keydown", handleKeyDown);

    // Move focus into the drawer when it opens
    const panel = panelRef.current;
    if (panel) {
      const edges = getFocusableEdges(panel);
      edges?.[0].focus();
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  return createPortal(
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close navigation menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          zIndex: 99998,
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
          border: "none",
          cursor: "default",
          padding: 0,
        }}
      />
      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          backgroundColor: token.colorBgContainer,
          boxShadow: open ? "6px 0 16px rgba(0, 0, 0, 0.12)" : "none",
          zIndex: 99999,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export default MobileDrawer;

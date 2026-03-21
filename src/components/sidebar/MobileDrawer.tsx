import { createPortal } from "react-dom";
import { theme } from "antd";
import type { ReactNode } from "react";

const SIDEBAR_FULL = 240;

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

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          zIndex: 99998,
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
        }}
      />
      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_FULL,
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

import { useLayoutEffect } from "react";

export function ShellMountEffects({ host }: { host: HTMLElement }) {
  useLayoutEffect(() => {
    const wpwrap = document.getElementById("wpwrap");

    host.classList.add("mounted");
    wpwrap?.classList.add("react-ready");

    return () => {
      host.classList.remove("mounted");
      wpwrap?.classList.remove("react-ready");
    };
  }, [host]);

  return null;
}

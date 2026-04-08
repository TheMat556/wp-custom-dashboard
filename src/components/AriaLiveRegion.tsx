import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { navigationStore } from "../store/navigationStore";

export function AriaLiveRegion() {
  const [announcement, setAnnouncement] = useState("");
  const pageTitle = useStore(navigationStore, (s) => s.pageTitle);
  const status = useStore(navigationStore, (s) => s.status);

  useEffect(() => {
    if (status === "ready" && pageTitle) {
      setAnnouncement(`Navigated to ${pageTitle}`);
    }
  }, [status, pageTitle]);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>
  );
}

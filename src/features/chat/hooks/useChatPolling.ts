import { useEffect, useRef } from "react";
import { logger } from "../../../utils/logger";

interface UseChatPollingOptions {
  pollIntervalSeconds: number;
  onPoll: () => Promise<void>;
  enabled: boolean;
}

/**
 * Manages polling interval for live chat updates.
 *
 * Handles cleanup and respects the enabled flag. Automatically cancels
 * in-flight requests if polling is disabled or the component unmounts.
 */
export function useChatPolling({
  pollIntervalSeconds,
  onPoll,
  enabled,
}: UseChatPollingOptions): void {
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(
      () => {
        const requestId = ++requestIdRef.current;
        void onPoll().catch((err) => {
          // Request already cancelled by newer poll
          if (requestId !== requestIdRef.current) return;
          logger.error("Chat poll error:", err);
        });
      },
      (pollIntervalSeconds || 15) * 1000
    );

    return () => {
      requestIdRef.current++;
      window.clearInterval(timer);
    };
  }, [enabled, onPoll, pollIntervalSeconds]);
}

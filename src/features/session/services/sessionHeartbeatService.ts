import type { CoreWpRestConfig } from "../../../platform/wordpress/client/coreWpRestClient";
import { createSessionGateway } from "../../../platform/wordpress/gateway/sessionGateway";

export type SessionHeartbeatResult = "active" | "expired" | "network-error";

export interface SessionHeartbeatService {
  checkSession(): Promise<SessionHeartbeatResult>;
}

export function createSessionHeartbeatService(config: CoreWpRestConfig): SessionHeartbeatService {
  const gateway = createSessionGateway(config);

  return {
    async checkSession() {
      try {
        const response = await gateway.fetchCurrentUser();

        if (response.status === 401 || response.status === 403) {
          return "expired";
        }

        return "active";
      } catch {
        return "network-error";
      }
    },
  };
}

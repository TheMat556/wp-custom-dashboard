import type { CoreWpRestConfig } from "../client/coreWpRestClient";
import { createCoreWpRestClient } from "../client/coreWpRestClient";

export interface SessionGateway {
  fetchCurrentUser(): Promise<Response>;
}

export function createSessionGateway(config: CoreWpRestConfig): SessionGateway {
  const client = createCoreWpRestClient(config);

  return {
    async fetchCurrentUser() {
      return client.get("/wp/v2/users/me");
    },
  };
}

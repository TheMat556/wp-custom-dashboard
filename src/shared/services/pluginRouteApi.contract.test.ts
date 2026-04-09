import { describe, expect, it } from "vitest";
import { PLUGIN_ROUTE_PATHS, REST_ROUTE_CONTRACTS } from "../../generated/contracts/routes";

describe("pluginRouteApi contract", () => {
  it("keeps route path constants aligned with the shared REST route contract", () => {
    expect(Object.values(PLUGIN_ROUTE_PATHS).sort()).toEqual(
      Object.keys(REST_ROUTE_CONTRACTS).sort()
    );
  });
});

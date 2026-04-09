import { describe, expect, it } from "vitest";
import { buildAdminUrl, getAdminBaseUrl } from "./wp";

describe("buildAdminUrl", () => {
  it("removes any number of trailing slashes from the admin base URL", () => {
    expect(getAdminBaseUrl("http://localhost/wp-admin/")).toBe("http://localhost/wp-admin");
    expect(getAdminBaseUrl("https://example.com//")).toBe("https://example.com");
    expect(getAdminBaseUrl("https://example.com/wp-admin")).toBe("https://example.com/wp-admin");
  });

  it("builds admin.php?page= URLs for plain plugin slugs", () => {
    expect(buildAdminUrl("my-plugin", "http://localhost/wp-admin/")).toBe(
      "http://localhost/wp-admin/admin.php?page=my-plugin"
    );
  });

  it("keeps direct admin PHP files as direct paths", () => {
    expect(buildAdminUrl("plugins.php", "http://localhost/wp-admin/")).toBe(
      "http://localhost/wp-admin/plugins.php"
    );
    expect(buildAdminUrl("edit.php?post_type=page", "http://localhost/wp-admin/")).toBe(
      "http://localhost/wp-admin/edit.php?post_type=page"
    );
  });

  it("routes plugin basenames through admin.php?page=", () => {
    expect(buildAdminUrl("woocommerce/woocommerce.php", "http://localhost/wp-admin/")).toBe(
      "http://localhost/wp-admin/admin.php?page=woocommerce/woocommerce.php"
    );
  });
});

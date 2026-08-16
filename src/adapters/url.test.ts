import { describe, expect, it } from "vitest";

import { normalizeIntegrationUrl } from "./url";

describe("integration URL validation", () => {
  it("keeps an operator-configured private HTTP endpoint", () => {
    expect(
      normalizeIntegrationUrl("http://192.168.1.20:8080/").toString(),
    ).toBe("http://192.168.1.20:8080/");
  });

  it("rejects embedded credentials and non-HTTP protocols", () => {
    expect(() =>
      normalizeIntegrationUrl("http://admin:pass@host:8080"),
    ).toThrow("cannot contain credentials");
    expect(() => normalizeIntegrationUrl("file:///etc/passwd")).toThrow(
      "HTTP or HTTPS",
    );
  });
});

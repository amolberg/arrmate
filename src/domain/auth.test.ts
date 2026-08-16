import { describe, expect, it } from "vitest";

import type { Role, Viewer } from "./auth";
import { AuthorizationError, authorize, can } from "./auth";

const viewer = (role: Role): Viewer => ({ id: role, name: role, role });

describe("role authorization", () => {
  it("gives the owner administrative and destructive permissions", () => {
    expect(can(viewer("owner"), "integration:manage")).toBe(true);
    expect(can(viewer("owner"), "user:manage")).toBe(true);
    expect(can(viewer("owner"), "media:delete")).toBe(true);
  });

  it("lets maintainers operate media without changing security", () => {
    expect(can(viewer("maintainer"), "download:manage")).toBe(true);
    expect(can(viewer("maintainer"), "media:replace")).toBe(true);
    expect(can(viewer("maintainer"), "integration:manage")).toBe(false);
    expect(can(viewer("maintainer"), "security:manage")).toBe(false);
  });

  it("limits requester and guest sessions to their request surface", () => {
    for (const role of ["requester", "guest"] as const) {
      expect(can(viewer(role), "discovery:search")).toBe(true);
      expect(can(viewer(role), "request:create")).toBe(true);
      expect(can(viewer(role), "operations:view")).toBe(false);
      expect(can(viewer(role), "media:delete")).toBe(false);
    }
  });

  it("throws a typed error when a server mutation is denied", () => {
    expect(() => authorize(viewer("guest"), "integration:manage")).toThrow(
      AuthorizationError,
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  canRequestThroughSeerr,
  roleFromSeerrPermissions,
  SeerrPermission,
} from "./seerr-permissions";

describe("Jellyseerr permission mapping", () => {
  it("maps upstream admin and management permissions to Arrmate roles", () => {
    expect(roleFromSeerrPermissions(SeerrPermission.ADMIN)).toBe("owner");
    expect(roleFromSeerrPermissions(SeerrPermission.MANAGE_REQUESTS)).toBe(
      "maintainer",
    );
    expect(roleFromSeerrPermissions(SeerrPermission.REQUEST)).toBe("requester");
  });

  it("keeps movie and series request permissions distinct", () => {
    expect(canRequestThroughSeerr(SeerrPermission.REQUEST_MOVIE, "movie")).toBe(
      true,
    );
    expect(
      canRequestThroughSeerr(SeerrPermission.REQUEST_MOVIE, "series"),
    ).toBe(false);
    expect(canRequestThroughSeerr(SeerrPermission.REQUEST, "series")).toBe(
      true,
    );
  });
});

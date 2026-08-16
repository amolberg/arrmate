import { describe, expect, it } from "vitest";

import { sealSession, unsealSession } from "./session-crypto";

describe("encrypted session envelope", () => {
  const secret = "a-test-only-secret-that-is-long-enough";

  it("round trips a provider session without exposing plaintext", () => {
    const value = { userId: 7, upstreamCookie: "connect.sid=test-value" };
    const sealed = sealSession(value, secret);
    expect(sealed).not.toContain("connect.sid");
    expect(unsealSession(sealed, secret)).toEqual(value);
  });

  it("rejects tampering and the wrong key", () => {
    const sealed = sealSession({ userId: 7 }, secret);
    const segments = sealed.split(".");
    segments[2] = `${segments[2].startsWith("a") ? "b" : "a"}${segments[2].slice(1)}`;
    const tampered = segments.join(".");
    expect(unsealSession(tampered, secret)).toBeNull();
    expect(unsealSession(sealed, "another-test-only-secret-value")).toBeNull();
  });
});

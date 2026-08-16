import { describe, expect, it } from "vitest";

import { InMemoryQuotaStore } from "./quota";

describe("quota reservations", () => {
  it("blocks after the configured limit and returns the reset", async () => {
    const store = new InMemoryQuotaStore([
      { userId: "friend", mediaType: "movie", window: "day", maximum: 2 },
    ]);
    const now = new Date("2026-08-16T12:30:00.000Z");

    expect(await store.reserve("friend", "movie", now)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(await store.reserve("friend", "movie", now)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(await store.reserve("friend", "movie", now)).toMatchObject({
      allowed: false,
      remaining: 0,
      resetsAt: new Date("2026-08-17T00:00:00.000Z"),
    });
  });

  it("enforces movie and series limits independently", async () => {
    const store = new InMemoryQuotaStore([
      { userId: "friend", mediaType: "movie", window: "hour", maximum: 1 },
      { userId: "friend", mediaType: "series", window: "hour", maximum: 1 },
    ]);

    expect((await store.reserve("friend", "movie")).allowed).toBe(true);
    expect((await store.reserve("friend", "movie")).allowed).toBe(false);
    expect((await store.reserve("friend", "series")).allowed).toBe(true);
  });

  it("does not oversubscribe a bucket during concurrent double submits", async () => {
    const store = new InMemoryQuotaStore([
      { userId: "friend", mediaType: "movie", window: "hour", maximum: 3 },
    ]);

    const attempts = await Promise.all(
      Array.from({ length: 12 }, () => store.reserve("friend", "movie")),
    );
    expect(attempts.filter((attempt) => attempt.allowed)).toHaveLength(3);
    expect(attempts.filter((attempt) => !attempt.allowed)).toHaveLength(9);
  });
});

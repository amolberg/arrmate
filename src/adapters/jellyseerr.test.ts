import { describe, expect, it, vi } from "vitest";

import { JellyseerrAdapter } from "./jellyseerr";

function adapter(fetchImpl: typeof fetch, timeoutMs = 100) {
  return new JellyseerrAdapter(
    { baseUrl: "http://jellyseerr.test:5055", timeoutMs },
    fetchImpl,
  );
}

function pathname(input: RequestInfo | URL): string {
  if (input instanceof URL) return `${input.pathname}${input.search}`;
  if (input instanceof Request) {
    const url = new URL(input.url);
    return `${url.pathname}${url.search}`;
  }
  const url = new URL(input);
  return `${url.pathname}${url.search}`;
}

describe("Jellyseerr adapter", () => {
  it("exchanges Jellyfin credentials for a user-scoped session", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        {
          id: 7,
          jellyfinUsername: "friend",
          permissions: 32,
          avatar: "/avatarproxy/user",
        },
        {
          headers: {
            "set-cookie": "connect.sid=s%3Atest.signature; Path=/; HttpOnly",
          },
        },
      ),
    ) as unknown as typeof fetch;

    const result = await adapter(fetchMock).login("friend", "local-test-value");
    expect(result).toEqual({
      ok: true,
      data: {
        user: {
          id: 7,
          displayName: "friend",
          permissions: 32,
          avatarPath: "/avatarproxy/user",
        },
        sessionCookie: "connect.sid=s%3Atest.signature",
      },
    });
    const [, init] = vi.mocked(fetchMock).mock.calls[0];
    expect(init?.redirect).toBe("error");
    expect(JSON.parse(String(init?.body))).toEqual({
      username: "friend",
      password: "local-test-value",
    });
  });

  it("returns a safe message when Jellyfin rejects the credentials", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({}, { status: 401 }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).login("friend", "local-test-value");
    expect(result).toEqual({
      ok: false,
      error: {
        code: "authentication",
        message: "Jellyfin did not accept those credentials",
        retryable: false,
      },
    });
  });

  it("rejects a login response without an upstream session", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: 7, permissions: 32 }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).login("friend", "local-test-value");
    expect(result).toMatchObject({
      ok: false,
      error: { code: "malformed-response" },
    });
  });

  it("normalizes movie and series search results and ignores people", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        page: 1,
        totalPages: 1,
        totalResults: 3,
        results: [
          {
            id: 10,
            mediaType: "movie",
            title: "A Film",
            releaseDate: "2026-03-02",
            overview: "Movie overview",
            posterPath: "/film.jpg",
            voteAverage: 8.2,
            mediaInfo: { status: 5 },
          },
          {
            id: 11,
            mediaType: "tv",
            name: "A Series",
            firstAirDate: "2025-01-01",
            overview: "Series overview",
          },
          { id: 12, mediaType: "person", name: "An Actor" },
        ],
      }),
    ) as unknown as typeof fetch;

    const result = await adapter(fetchMock).search("test", "connect.sid=test");
    expect(result).toMatchObject({
      ok: true,
      data: {
        items: [
          {
            id: 10,
            mediaType: "movie",
            title: "A Film",
            year: "2026",
            availability: 5,
          },
          { id: 11, mediaType: "series", title: "A Series", year: "2025" },
        ],
      },
    });
    const [, init] = vi.mocked(fetchMock).mock.calls[0];
    expect(new Headers(init?.headers).get("cookie")).toBe("connect.sid=test");
  });

  it("reads the user's Jellyseerr quota", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        movie: { days: 7, limit: 3, used: 1, remaining: 2, restricted: false },
        tv: { days: 30, limit: 2, used: 2, remaining: 0, restricted: true },
      }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).quota(7, "connect.sid=test");
    expect(result).toMatchObject({
      ok: true,
      data: {
        movie: { remaining: 2 },
        series: { remaining: 0, restricted: true },
      },
    });
  });

  it("requests every season for the initial series request flow", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: 99, status: 1 }, { status: 201 }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).createRequest(
      42,
      "series",
      "connect.sid=test",
    );
    expect(result).toEqual({ ok: true, data: { id: 99, status: "pending" } });
    const [input, init] = vi.mocked(fetchMock).mock.calls[0];
    expect(pathname(input)).toBe("/api/v1/request");
    expect(JSON.parse(String(init?.body))).toEqual({
      mediaId: 42,
      mediaType: "tv",
      seasons: "all",
    });
  });

  it("distinguishes an upstream timeout", async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock, 2).search(
      "test",
      "connect.sid=test",
    );
    expect(result).toMatchObject({
      ok: false,
      error: { code: "timeout", retryable: true },
    });
  });
});

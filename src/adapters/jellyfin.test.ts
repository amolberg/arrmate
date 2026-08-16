import { describe, expect, it, vi } from "vitest";

import { JellyfinAdapter } from "./jellyfin";

describe("Jellyfin adapter", () => {
  it("normalizes an authenticated user and never returns the password", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        AccessToken: "token",
        User: {
          Id: "user-1",
          Name: "Test user",
          Policy: { IsAdministrator: true },
        },
      }),
    ) as unknown as typeof fetch;
    const result = await new JellyfinAdapter(
      { baseUrl: "https://jellyfin.test" },
      fetchMock,
    ).login("user", "secret");
    expect(result).toEqual({
      ok: true,
      data: {
        token: "token",
        userId: "user-1",
        displayName: "Test user",
        isAdministrator: true,
      },
    });
    expect(
      JSON.parse(String(vi.mocked(fetchMock).mock.calls[0][1]?.body)),
    ).toEqual({ Username: "user", Pw: "secret" });
  });

  it("normalizes administrative user records", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          Id: "1",
          Name: "Owner",
          Policy: { IsAdministrator: true, IsDisabled: false },
        },
        {
          Id: "2",
          Name: "Guest",
          Policy: { IsAdministrator: false, IsDisabled: true },
        },
      ]),
    ) as unknown as typeof fetch;
    const result = await new JellyfinAdapter(
      { baseUrl: "https://jellyfin.test" },
      fetchMock,
    ).users("token");
    expect(result).toMatchObject({
      ok: true,
      data: [
        { displayName: "Owner", isAdministrator: true },
        { displayName: "Guest", disabled: true },
      ],
    });
    expect(
      new Headers(vi.mocked(fetchMock).mock.calls[0][1]?.headers).get(
        "authorization",
      ),
    ).toBe("MediaBrowser Token=token");
  });

  it("maps rejected credentials to an authentication error", async () => {
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 401 }),
    ) as unknown as typeof fetch;
    await expect(
      new JellyfinAdapter(
        { baseUrl: "https://jellyfin.test" },
        fetchMock,
      ).login("user", "secret"),
    ).resolves.toMatchObject({ ok: false, error: { code: "authentication" } });
  });

  it("normalizes played items into watch history", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        Items: [
          { Name: "A Film", Type: "Movie", DatePlayed: "2026-08-16T10:00:00Z" },
        ],
      }),
    ) as unknown as typeof fetch;
    const result = await new JellyfinAdapter(
      { baseUrl: "https://jellyfin.test" },
      fetchMock,
    ).watchHistory("token", "user-1");
    expect(result).toMatchObject({
      ok: true,
      data: [{ title: "A Film", type: "Movie" }],
    });
  });
});

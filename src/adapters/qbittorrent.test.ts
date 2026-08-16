import { describe, expect, it, vi } from "vitest";

import { QbittorrentAdapter } from "./qbittorrent";

function adapter(fetchImpl: typeof fetch, timeoutMs = 100) {
  return new QbittorrentAdapter(
    {
      baseUrl: "http://qbittorrent.test:8080",
      username: "test-user",
      password: "test-value",
      timeoutMs,
    },
    fetchImpl,
  );
}

function pathname(input: RequestInfo | URL): string {
  if (input instanceof URL) return input.pathname;
  if (input instanceof Request) return new URL(input.url).pathname;
  return new URL(input).pathname;
}

const loginResponse = () =>
  new Response("Ok.", {
    status: 200,
    headers: { "set-cookie": "SID=test-session; HttpOnly" },
  });

describe("qBittorrent adapter", () => {
  it("normalizes a live transfer and download response", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (pathname(input) === "/api/v2/auth/login") return loginResponse();
      if (pathname(input) === "/api/v2/torrents/info") {
        return Response.json([
          {
            hash: "abc123",
            name: "Example movie",
            size: 10_000,
            progress: 0.42,
            dlspeed: 800,
            upspeed: 20,
            eta: 90,
            state: "downloading",
            ratio: 0.2,
            category: "movies",
          },
        ]);
      }
      return Response.json({
        dl_info_speed: 800,
        up_info_speed: 20,
        dl_info_data: 4_200,
        up_info_data: 200,
      });
    }) as unknown as typeof fetch;

    const result = await adapter(fetchMock).overview();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toEqual([
      expect.objectContaining({
        id: "abc123",
        name: "Example movie",
        progress: 0.42,
        state: "downloading",
      }),
    ]);
    expect(result.data.transfer.downloadSpeedBytes).toBe(800);
    const torrentCall = vi
      .mocked(fetchMock)
      .mock.calls.find(
        ([input]) => pathname(input) === "/api/v2/torrents/info",
      );
    expect(new Headers(torrentCall?.[1]?.headers).get("cookie")).toBe(
      "SID=test-session",
    );
  });

  it("distinguishes a valid empty queue from an error", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (pathname(input) === "/api/v2/auth/login") return loginResponse();
      if (pathname(input) === "/api/v2/torrents/info") return Response.json([]);
      return Response.json({
        dl_info_speed: 0,
        up_info_speed: 0,
        dl_info_data: 0,
        up_info_data: 0,
      });
    }) as unknown as typeof fetch;

    const result = await adapter(fetchMock).overview();
    expect(result).toMatchObject({ ok: true, data: { items: [] } });
  });

  it("returns a safe authentication error", async () => {
    const fetchMock = vi.fn(
      async () => new Response("Fails.", { status: 403 }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).overview();
    expect(result).toEqual({
      ok: false,
      error: {
        code: "authentication",
        message: "qBittorrent rejected the credentials",
        retryable: false,
      },
    });
  });

  it("reports a timeout without exposing request details", async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;

    const result = await adapter(fetchMock, 2).overview();
    expect(result).toMatchObject({
      ok: false,
      error: { code: "timeout", retryable: true },
    });
  });

  it("rejects malformed upstream data", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (pathname(input) === "/api/v2/auth/login") return loginResponse();
      if (pathname(input) === "/api/v2/torrents/info") {
        return Response.json([{ hash: "missing-required-fields" }]);
      }
      return Response.json({ unexpected: true });
    }) as unknown as typeof fetch;

    const result = await adapter(fetchMock).overview();
    expect(result).toMatchObject({
      ok: false,
      error: { code: "malformed-response", retryable: true },
    });
  });
});

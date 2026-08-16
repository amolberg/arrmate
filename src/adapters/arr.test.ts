import { describe, expect, it, vi } from "vitest";

import { ArrAdapter } from "./arr";

function adapter(fetchImpl: typeof fetch, timeoutMs = 100) {
  return new ArrAdapter(
    {
      baseUrl: "https://sonarr.test",
      apiKey: "local-test-key",
      serviceName: "Sonarr",
      timeoutMs,
    },
    fetchImpl,
  );
}

describe("Arr adapter", () => {
  it("reads and validates the system status", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ version: "4.0.1" }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).health();
    expect(result).toMatchObject({ ok: true, data: { version: "4.0.1" } });
    const [, init] = vi.mocked(fetchMock).mock.calls[0];
    expect(new Headers(init?.headers).get("X-Api-Key")).toBe("local-test-key");
  });

  it("redacts authentication failures into a safe adapter error", async () => {
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 401 }),
    ) as unknown as typeof fetch;
    await expect(adapter(fetchMock).health()).resolves.toMatchObject({
      ok: false,
      error: { code: "authentication", message: "Sonarr rejected its API key" },
    });
  });

  it("rejects malformed status data", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ title: "not status" }),
    ) as unknown as typeof fetch;
    await expect(adapter(fetchMock).health()).resolves.toMatchObject({
      ok: false,
      error: { code: "malformed-response" },
    });
  });

  it("distinguishes timeout from an empty or failed response", async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;
    await expect(adapter(fetchMock, 2).health()).resolves.toMatchObject({
      ok: false,
      error: { code: "timeout" },
    });
  });

  it("normalizes series metadata into a domain shape", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          id: 1,
          title: "Breaking Bad",
          sortTitle: "breaking bad",
          status: "ended",
          overview: "A chemistry teacher",
          network: "AMC",
          year: 2008,
          tvdbId: 81189,
          tmdbId: 1396,
          imdbId: "tt0903747",
          runtime: 49,
          images: [
            { coverType: "poster", remoteUrl: "https://poster/1.jpg" },
            { coverType: "fanart", remoteUrl: "https://fanart/1.jpg" },
          ],
          monitored: true,
          seasons: [
            {
              seasonNumber: 1,
              monitored: true,
              statistics: {
                episodeFileCount: 7,
                episodeCount: 7,
                totalEpisodeCount: 7,
              },
            },
          ],
          statistics: {
            episodeFileCount: 62,
            episodeCount: 62,
            totalEpisodeCount: 62,
            sizeOnDisk: 100,
            releaseGroups: ["NTb"],
          },
        },
      ]),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).listSeries();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe("Breaking Bad");
    expect(result.data[0].posterUrl).toBe("https://poster/1.jpg");
    expect(result.data[0].statistics?.releaseGroups).toEqual(["NTb"]);
    expect(result.data[0].seasons[0].episodeFileCount).toBe(7);
  });

  it("returns a malformed-response when series payload is invalid", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([{ random: "data" }]),
    ) as unknown as typeof fetch;
    await expect(adapter(fetchMock).listSeries()).resolves.toMatchObject({
      ok: false,
      error: { code: "malformed-response" },
    });
  });

  it("parses releases and sends them through the download endpoint", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        void init;
        if (url.includes("/release?") && (init?.method ?? "GET") === "GET") {
          return Response.json([
            {
              guid: "abc",
              title: "Breaking.Bad.S01E01.1080p.WEB-DL",
              quality: { quality: { name: "WEBDL-1080p", id: 7 } },
              releaseGroup: "NTb",
              indexer: "NZBgeek",
              indexerId: 4,
              size: 1_000_000_000,
              ageHours: 1,
              seeders: 24,
              leechers: 1,
              protocol: "usenet",
              approved: true,
              rejected: false,
              rejections: [],
              customFormats: [{ name: "HDR" }],
              cached: false,
              languages: [{ name: "English" }],
              score: 100,
            },
          ]);
        }
        if (url.endsWith("/release") && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          return new Response(JSON.stringify({ id: 99, body }), {
            status: 201,
          });
        }
        return new Response("not found", { status: 404 });
      },
    ) as unknown as typeof fetch;
    const adapterInstance = adapter(fetchMock);
    const list = await adapterInstance.searchReleases({ seriesId: 1 });
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data[0].quality).toBe("WEBDL-1080p");
    expect(list.data[0].score).toBe(100);
    const capture = await adapterInstance.captureRelease(
      "abc",
      4,
      "https://example.com/download",
    );
    expect(capture.ok).toBe(true);
  });

  it("lists queue records with normalized fields", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        records: [
          {
            id: 1,
            seriesId: 10,
            episodeId: 100,
            title: "Episode title",
            status: "downloading",
            downloadId: "abcdef",
            protocol: "torrent",
            indexer: "TorrentLeech",
            size: 1500,
            sizeleft: 500,
            timeleft: "00:30:00",
            addedAt: "2026-01-01T00:00:00Z",
          },
        ],
        totalRecords: 1,
      }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).queue();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0].title).toBe("Episode title");
    expect(result.data[0].downloadId).toBe("abcdef");
  });

  it("sends a delete request to the file endpoint", async () => {
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 204 }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).deleteEpisodeFile(5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.accepted).toBe(true);
    const [, init] = vi.mocked(fetchMock).mock.calls[0];
    expect(init?.method).toBe("DELETE");
  });
});

import { describe, expect, it, vi } from "vitest";

import { BazarrAdapter } from "./bazarr";

function adapter(fetchImpl: typeof fetch, timeoutMs = 100) {
  return new BazarrAdapter(
    {
      baseUrl: "https://bazarr.test",
      apiKey: "sample-key",
      timeoutMs,
    },
    fetchImpl,
  );
}

describe("Bazarr adapter", () => {
  it("requests system status with the api key header", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ data: { bazarr_version: "1.6.0" } }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).health();
    expect(result.ok).toBe(true);
    const [, init] = vi.mocked(fetchMock).mock.calls[0];
    expect(new Headers(init?.headers).get("x-api-key")).toBe("sample-key");
  });

  it("normalizes episode subtitle data into a flat list", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            sonarrEpisodeId: 1,
            sonarrSeriesId: 99,
            title: "Pilot",
            season: 1,
            episode: 1,
            path: "/media/ep1.mkv",
            monitored: true,
            subtitles: [
              {
                id: 11,
                language: { name: "English", code2: "en" },
                hi: false,
                forced: false,
                provider: "OpenSubtitles",
              },
            ],
            missing_subtitles: [{ name: "Danish", code2: "da" }],
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).episodesForSeries(99);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0].language).toBe("English");
    expect(result.data[0].missing).toBe(false);
    expect(result.data[1].missing).toBe(true);
    expect(result.data[1].language).toBe("Danish");
  });

  it("flattens wanted episodes with missing languages", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            seriesTitle: "Show",
            episode_number: "2x5",
            episodeTitle: "The Episode",
            sonarrSeriesId: 10,
            sonarrEpisodeId: 200,
            missing_subtitles: [{ name: "French" }],
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).wantedEpisodes(10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0].title).toBe("The Episode");
    expect(result.data[0].seasonNumber).toBe(2);
    expect(result.data[0].episodeNumber).toBe(5);
    expect(result.data[0].missingLanguages).toEqual(["French"]);
  });

  it("searches for episode subtitles and parses the payload", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            id: "opensubtitles|123",
            language: { name: "English", code2: "en" },
            hi: false,
            forced: false,
            provider: "OpenSubtitles",
            score: 9,
            release: "Sample.Release",
            url: "https://example.com/sub",
            size: 1024,
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).searchEpisodeSubtitles(1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0].id).toBe("opensubtitles|123");
    expect(result.data[0].language).toBe("English");
    expect(result.data[0].score).toBe(9);
  });

  it("triggers a subtitle download via POST", async () => {
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 204 }),
    ) as unknown as typeof fetch;
    const result = await adapter(fetchMock).downloadEpisodeSubtitle({
      seriesId: 1,
      episodeId: 2,
      provider: "OpenSubtitles",
      subtitle: "id-abc",
    });
    expect(result.ok).toBe(true);
    const [url, init] = vi.mocked(fetchMock).mock.calls[0];
    expect(String(url)).toContain("/api/providers/episodes");
    expect(init?.method).toBe("POST");
  });
});

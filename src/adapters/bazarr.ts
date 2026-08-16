import { z } from "zod";

import type {
  BazarrHistoryEntry,
  BazarrSubtitleSearch,
  BazarrSubtitleSummary,
  BazarrSubtitleTracks,
  BazarrWantedEntry,
} from "@/domain/bazarr";
import type {
  AdapterError,
  AdapterResult,
  CapabilitySet,
} from "@/domain/integrations";

import type { IntegrationAdapter } from "./contracts";
import { normalizeIntegrationUrl } from "./url";

export interface BazarrConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

type Fetch = typeof fetch;

function failure(
  code: AdapterError["code"],
  message: string,
  retryable: boolean,
): AdapterResult<never> {
  return { ok: false, error: { code, message, retryable } };
}

const dataEnvelope = z.object({ data: z.unknown() }).passthrough();

const seriesSchema = z
  .object({
    sonarrSeriesId: z.number(),
    title: z.string(),
    poster: z.string().optional().nullable(),
    fanart: z.string().optional().nullable(),
    year: z.string().optional().nullable(),
    monitored: z.boolean().optional().default(false),
    episodeFileCount: z.number().optional().default(0),
    episodeMissingCount: z.number().optional().default(0),
    profileId: z.number().optional().nullable(),
    lastAired: z.string().optional().nullable(),
    ended: z.boolean().optional().default(false),
    overview: z.string().optional().nullable(),
    tvdbId: z.number().optional().nullable(),
    imdbId: z.string().optional().nullable(),
    path: z.string().optional().nullable(),
  })
  .passthrough();

const movieSchema = z
  .object({
    radarrId: z.number(),
    title: z.string(),
    poster: z.string().optional().nullable(),
    fanart: z.string().optional().nullable(),
    year: z.string().optional().nullable(),
    monitored: z.boolean().optional().default(false),
    hasFile: z.boolean().optional().default(false),
    overview: z.string().optional().nullable(),
    tmdbId: z.number().optional().nullable(),
    imdbId: z.string().optional().nullable(),
    path: z.string().optional().nullable(),
    profileId: z.number().optional().nullable(),
  })
  .passthrough();

const languageRefSchema = z
  .object({
    name: z.string(),
    code2: z.string().optional().default(""),
    code3: z.string().optional().default(""),
  })
  .passthrough();

const subtitleEntrySchema = z
  .object({
    id: z.number(),
    path: z.string().optional().nullable(),
    language: languageRefSchema,
    hi: z.boolean().optional().default(false),
    forced: z.boolean().optional().default(false),
    provider: z.string().optional().default(""),
    score: z.number().optional().nullable(),
    uploadDate: z.string().optional().nullable(),
    release: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    listener_pid: z.string().optional().nullable(),
  })
  .passthrough();

const episodeSchema = z
  .object({
    sonarrEpisodeId: z.number(),
    sonarrSeriesId: z.number(),
    title: z.string(),
    season: z.number(),
    episode: z.number(),
    path: z.string().optional().nullable(),
    sceneName: z.string().optional().nullable(),
    monitored: z.boolean().optional().default(true),
    subtitles: z.array(subtitleEntrySchema).optional().default([]),
    missing_subtitles: z.array(languageRefSchema).optional().default([]),
    audio_language: z.array(languageRefSchema).optional().default([]),
  })
  .passthrough();

const wantedEntrySchema = z
  .object({
    seriesTitle: z.string().optional().default(""),
    seriesType: z.string().optional().default(""),
    season: z.number().optional().nullable(),
    episode_number: z.string().optional().default(""),
    episodeTitle: z.string().optional().default(""),
    sceneName: z.string().optional().nullable(),
    sonarrSeriesId: z.number().optional().nullable(),
    sonarrEpisodeId: z.number().optional().nullable(),
    radarrId: z.number().optional().nullable(),
    missing_subtitles: z.array(languageRefSchema).optional().default([]),
    tags: z.array(z.string()).optional().default([]),
  })
  .passthrough();

const historyEntrySchema = z
  .object({
    id: z.number(),
    action: z.string(),
    timestamp: z.string().optional().default(""),
    description: z.string().optional().default(""),
    provider: z.string().optional().nullable(),
    language: languageRefSchema.optional().nullable(),
    score: z.number().optional().nullable(),
    radarrId: z.number().optional().nullable(),
    sonarrEpisodeId: z.number().optional().nullable(),
    sonarrSeriesId: z.number().optional().nullable(),
  })
  .passthrough();

const subtitleSearchEntrySchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    language: languageRefSchema,
    hi: z.boolean().optional().default(false),
    forced: z.boolean().optional().default(false),
    provider: z.string(),
    score: z.number().optional().nullable(),
    uploadDate: z.string().optional().nullable(),
    release: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    infoUrl: z.string().optional().nullable(),
    size: z.number().optional().nullable(),
    matches: z.number().optional().nullable(),
    subtitle: z.string().optional().nullable(),
  })
  .passthrough();

const languageName = (entry: { name?: string } | null | undefined) =>
  entry?.name ?? "Unknown";

export class BazarrAdapter implements IntegrationAdapter {
  readonly name = "Bazarr";
  readonly capabilities: CapabilitySet = {
    readQueue: false,
    manageQueue: false,
    search: false,
    request: false,
    deleteMedia: false,
    replaceMedia: false,
    searchSubtitles: true,
  };
  private readonly baseUrl: URL;
  private readonly timeoutMs: number;
  constructor(
    private readonly config: BazarrConfig,
    private readonly fetchImpl: Fetch = fetch,
  ) {
    this.baseUrl = normalizeIntegrationUrl(config.baseUrl);
    this.timeoutMs = config.timeoutMs ?? 8_000;
  }

  async health(): Promise<AdapterResult<{ latencyMs: number }>> {
    const started = performance.now();
    const response = await this.request("/api/system/status");
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      await response.data.json();
      return {
        ok: true,
        data: { latencyMs: Math.round(performance.now() - started) },
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid status data",
        true,
      );
    }
  }

  async listSeries(): Promise<AdapterResult<{ id: number; title: string }[]>> {
    const response = await this.request("/api/series");
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const envelope = dataEnvelope.parse(json);
      const items = z.array(seriesSchema).parse(envelope.data);
      return {
        ok: true,
        data: items.map((series) => ({
          id: series.sonarrSeriesId,
          title: series.title,
        })),
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid series data",
        true,
      );
    }
  }

  async episodesForSeries(
    seriesId: number,
  ): Promise<AdapterResult<BazarrSubtitleSummary[]>> {
    const params = new URLSearchParams();
    params.append("seriesid[]", String(seriesId));
    const response = await this.request(`/api/episodes?${params.toString()}`);
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const envelope = dataEnvelope.parse(json);
      const items = z.array(episodeSchema).parse(envelope.data);
      return {
        ok: true,
        data: items.flatMap((episode) =>
          this.normalizeEpisodeSubtitles(episode),
        ),
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid episode subtitle data",
        true,
      );
    }
  }

  async episodesForSingle(
    episodeId: number,
  ): Promise<AdapterResult<BazarrSubtitleSummary[]>> {
    const params = new URLSearchParams();
    params.append("episodeid[]", String(episodeId));
    const response = await this.request(`/api/episodes?${params.toString()}`);
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const envelope = dataEnvelope.parse(json);
      const items = z.array(episodeSchema).parse(envelope.data);
      return {
        ok: true,
        data: items.flatMap((episode) =>
          this.normalizeEpisodeSubtitles(episode),
        ),
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid episode subtitle data",
        true,
      );
    }
  }

  async movies(): Promise<AdapterResult<{ id: number; title: string }[]>> {
    const response = await this.request("/api/movies");
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const envelope = dataEnvelope.parse(json);
      const items = z.array(movieSchema).parse(envelope.data);
      return {
        ok: true,
        data: items.map((movie) => ({
          id: movie.radarrId,
          title: movie.title,
        })),
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid movie data",
        true,
      );
    }
  }

  async wantedEpisodes(take = 25): Promise<AdapterResult<BazarrWantedEntry[]>> {
    const params = new URLSearchParams({
      start: "0",
      length: String(Math.max(1, Math.min(100, take))),
    });
    const response = await this.request(
      `/api/episodes/wanted?${params.toString()}`,
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const envelope = dataEnvelope.parse(json);
      const items = z.array(wantedEntrySchema).parse(envelope.data);
      return {
        ok: true,
        data: items.map((entry) => ({
          radarrId: entry.radarrId ?? null,
          sonarrEpisodeId: entry.sonarrEpisodeId ?? null,
          sonarrSeriesId: entry.sonarrSeriesId ?? null,
          title: entry.episodeTitle || entry.sceneName || "Wanted episode",
          seriesTitle: entry.seriesTitle || null,
          seasonNumber: (() => {
            const parts = entry.episode_number?.split("x") ?? [];
            return Number(parts[0] ?? 0) || null;
          })(),
          episodeNumber: (() => {
            const parts = entry.episode_number?.split("x") ?? [];
            return Number(parts[1] ?? 0) || null;
          })(),
          monitored: true,
          missingLanguages: entry.missing_subtitles.map((lang) =>
            languageName(lang),
          ),
        })),
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid wanted episode data",
        true,
      );
    }
  }

  async episodeHistory(
    episodeId: number,
  ): Promise<AdapterResult<BazarrHistoryEntry[]>> {
    const params = new URLSearchParams({
      start: "0",
      length: "25",
      episodeid: String(episodeId),
    });
    const response = await this.request(
      `/api/episodes/history?${params.toString()}`,
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const envelope = dataEnvelope.parse(json);
      const items = z.array(historyEntrySchema).parse(envelope.data);
      return {
        ok: true,
        data: items.map((entry) => ({
          id: entry.id,
          action: entry.action,
          timestamp: entry.timestamp,
          description: entry.description,
          provider: entry.provider ?? null,
          language: entry.language?.name ?? null,
          score: entry.score ?? null,
          radarrId: entry.radarrId ?? null,
          sonarrEpisodeId: entry.sonarrEpisodeId ?? null,
          sonarrSeriesId: entry.sonarrSeriesId ?? null,
        })),
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid episode history data",
        true,
      );
    }
  }

  async searchEpisodeSubtitles(
    episodeId: number,
  ): Promise<AdapterResult<BazarrSubtitleSearch[]>> {
    const params = new URLSearchParams({ episodeid: String(episodeId) });
    const response = await this.request(
      `/api/providers/episodes?${params.toString()}`,
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const envelope = dataEnvelope.parse(json);
      const items = z.array(subtitleSearchEntrySchema).parse(envelope.data);
      return {
        ok: true,
        data: items.map((entry) => ({
          id: String(entry.id ?? ""),
          language: entry.language.name,
          languageCode: entry.language.code2 || entry.language.code3,
          hi: entry.hi,
          forced: entry.forced,
          provider: entry.provider,
          score: entry.score ?? null,
          uploadDate: entry.uploadDate ?? null,
          release: entry.release ?? null,
          url: entry.url ?? null,
          infoUrl: entry.infoUrl ?? null,
          size: entry.size ?? null,
          matches: entry.matches ?? null,
          subtitle: entry.subtitle ?? null,
        })),
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid subtitle search results",
        true,
      );
    }
  }

  async searchMovieSubtitles(
    radarrId: number,
  ): Promise<AdapterResult<BazarrSubtitleSearch[]>> {
    const params = new URLSearchParams({ radarrid: String(radarrId) });
    const response = await this.request(
      `/api/providers/movies?${params.toString()}`,
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const envelope = dataEnvelope.parse(json);
      const items = z.array(subtitleSearchEntrySchema).parse(envelope.data);
      return {
        ok: true,
        data: items.map((entry) => ({
          id: String(entry.id ?? ""),
          language: entry.language.name,
          languageCode: entry.language.code2 || entry.language.code3,
          hi: entry.hi,
          forced: entry.forced,
          provider: entry.provider,
          score: entry.score ?? null,
          uploadDate: entry.uploadDate ?? null,
          release: entry.release ?? null,
          url: entry.url ?? null,
          infoUrl: entry.infoUrl ?? null,
          size: entry.size ?? null,
          matches: entry.matches ?? null,
          subtitle: entry.subtitle ?? null,
        })),
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid subtitle search results",
        true,
      );
    }
  }

  async downloadEpisodeSubtitle(input: {
    seriesId: number;
    episodeId: number;
    provider: string;
    subtitle: string;
    hi?: boolean;
    forced?: boolean;
  }): Promise<AdapterResult<{ accepted: boolean }>> {
    const params = new URLSearchParams({
      seriesid: String(input.seriesId),
      episodeid: String(input.episodeId),
      provider: input.provider,
      subtitle: input.subtitle,
      hi: input.hi ? "true" : "false",
      forced: input.forced ? "true" : "false",
    });
    const response = await this.request(
      `/api/providers/episodes?${params.toString()}`,
      { method: "POST" },
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    return { ok: true, data: { accepted: response.data.status < 400 } };
  }

  async downloadMovieSubtitle(input: {
    radarrId: number;
    provider: string;
    subtitle: string;
    hi?: boolean;
    forced?: boolean;
  }): Promise<AdapterResult<{ accepted: boolean }>> {
    const params = new URLSearchParams({
      radarrid: String(input.radarrId),
      provider: input.provider,
      subtitle: input.subtitle,
      hi: input.hi ? "true" : "false",
      forced: input.forced ? "true" : "false",
    });
    const response = await this.request(
      `/api/providers/movies?${params.toString()}`,
      { method: "POST" },
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    return { ok: true, data: { accepted: response.data.status < 400 } };
  }

  async deleteEpisodeSubtitle(input: {
    seriesId: number;
    episodeId: number;
    language: string;
    forced: boolean;
    hi: boolean;
    path: string;
  }): Promise<AdapterResult<{ accepted: boolean }>> {
    const params = new URLSearchParams({
      seriesid: String(input.seriesId),
      episodeid: String(input.episodeId),
      language: input.language,
      forced: input.forced ? "true" : "false",
      hi: input.hi ? "true" : "false",
      path: input.path,
    });
    const response = await this.request(
      `/api/episodes/subtitles?${params.toString()}`,
      { method: "DELETE" },
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    return { ok: true, data: { accepted: response.data.status < 400 } };
  }

  async deleteMovieSubtitle(input: {
    radarrId: number;
    language: string;
    forced: boolean;
    hi: boolean;
    path: string;
  }): Promise<AdapterResult<{ accepted: boolean }>> {
    const params = new URLSearchParams({
      radarrid: String(input.radarrId),
      language: input.language,
      forced: input.forced ? "true" : "false",
      hi: input.hi ? "true" : "false",
      path: input.path,
    });
    const response = await this.request(
      `/api/movies/subtitles?${params.toString()}`,
      { method: "DELETE" },
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    return { ok: true, data: { accepted: response.data.status < 400 } };
  }

  async listSubtitlesForPath(input: {
    subtitlesPath: string;
    sonarrEpisodeId?: number;
    radarrMovieId?: number;
  }): Promise<AdapterResult<BazarrSubtitleTracks>> {
    const params = new URLSearchParams();
    params.set("subtitlesPath", input.subtitlesPath);
    if (input.sonarrEpisodeId) {
      params.set("sonarrEpisodeId", String(input.sonarrEpisodeId));
    }
    if (input.radarrMovieId) {
      params.set("radarrMovieId", String(input.radarrMovieId));
    }
    const response = await this.request(`/api/subtitles?${params.toString()}`);
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const envelope = dataEnvelope.parse(json);
      const data = envelope.data as Record<string, unknown>;
      return {
        ok: true,
        data: {
          audioTracks: Array.isArray(data.audio_tracks)
            ? (data.audio_tracks as { language: string; codec: string }[])
            : [],
          embedded: Array.isArray(data.embedded_subtitles_tracks)
            ? (data.embedded_subtitles_tracks as { language: string }[])
            : [],
          external: Array.isArray(data.external_subtitles_tracks)
            ? (data.external_subtitles_tracks as {
                language: string;
                path: string;
                forced: boolean;
                hi: boolean;
              }[])
            : [],
        },
      };
    } catch {
      return failure(
        "malformed-response",
        "Bazarr returned invalid subtitle track data",
        true,
      );
    }
  }

  private normalizeEpisodeSubtitles(
    episode: z.infer<typeof episodeSchema>,
  ): BazarrSubtitleSummary[] {
    const present: BazarrSubtitleSummary[] = episode.subtitles.map((sub) => ({
      id: sub.id,
      radarrId: null,
      sonarrEpisodeId: episode.sonarrEpisodeId,
      sonarrSeriesId: episode.sonarrSeriesId,
      language: sub.language.name,
      languageCode: sub.language.code2 || sub.language.code3,
      hi: sub.hi,
      forced: sub.forced,
      provider: sub.provider,
      score: sub.score ?? null,
      uploadDate: sub.uploadDate ?? null,
      release: sub.release ?? null,
      listenerPid: sub.listener_pid ?? null,
      date: sub.date ?? null,
      missing: false,
      path: sub.path ?? null,
      subtitlesPath: episode.path ?? null,
    }));
    const missing: BazarrSubtitleSummary[] = episode.missing_subtitles.map(
      (language, index) => ({
        id: -1 - index,
        radarrId: null,
        sonarrEpisodeId: episode.sonarrEpisodeId,
        sonarrSeriesId: episode.sonarrSeriesId,
        language: language.name,
        languageCode: language.code2 || language.code3,
        hi: false,
        forced: false,
        provider: "",
        score: null,
        uploadDate: null,
        release: null,
        listenerPid: null,
        date: null,
        missing: true,
        path: null,
        subtitlesPath: episode.path ?? null,
      }),
    );
    return [...present, ...missing];
  }

  private httpError(status: number): AdapterResult<never> {
    if (status === 401 || status === 403)
      return failure("authentication", "Bazarr rejected its API key", false);
    return failure(
      "upstream",
      "Bazarr request failed",
      status >= 500 || status === 429,
    );
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<AdapterResult<Response>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = new Headers(init.headers);
      headers.set("accept", "application/json");
      headers.set("x-api-key", this.config.apiKey);
      const response = await this.fetchImpl(
        new URL(path, `${this.baseUrl.toString()}/`),
        {
          ...init,
          headers,
          signal: controller.signal,
          cache: "no-store",
          redirect: "error",
        },
      );
      return { ok: true, data: response };
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === "AbortError")
      )
        return failure(
          "timeout",
          "Bazarr did not respond before the timeout",
          true,
        );
      return failure("unreachable", "Bazarr could not be reached", true);
    } finally {
      clearTimeout(timeout);
    }
  }
}

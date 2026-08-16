import { z } from "zod";

import type {
  ArrCommandResult,
  ArrEpisode,
  ArrEpisodeFile,
  ArrMovie,
  ArrMovieFile,
  ArrQueue,
  ArrRelease,
  ArrSeason,
  ArrSeries,
} from "@/domain/arr";
import type {
  AdapterError,
  AdapterResult,
  CapabilitySet,
} from "@/domain/integrations";

import type { IntegrationAdapter } from "./contracts";
import { normalizeIntegrationUrl } from "./url";

const statusSchema = z.object({ version: z.string().min(1) }).passthrough();

export interface ArrAdapterConfig {
  baseUrl: string;
  apiKey: string;
  serviceName: string;
  timeoutMs?: number;
}

type Fetch = typeof fetch;

function errorResult(
  code: AdapterError["code"],
  message: string,
  retryable: boolean,
): AdapterResult<never> {
  return { ok: false, error: { code, message, retryable } };
}

const sortTitle = (title: string) =>
  title.toLowerCase().replace(/^(the|a|an)\s+/i, "");

const imageUrl = (baseUrl: URL, path: string | null | undefined) =>
  path ? new URL(path, `${baseUrl.toString()}/`).toString() : null;

const qualityLabel = (quality: unknown): string => {
  if (!quality || typeof quality !== "object") return "Unknown";
  const q = quality as { quality?: { name?: string } | null };
  return q.quality?.name ?? "Unknown";
};

const qualityWeight = (quality: unknown): number => {
  if (!quality || typeof quality !== "object") return 0;
  const q = quality as { quality?: { id?: number } | null };
  return q.quality?.id ?? 0;
};

const customFormatNames = (cfs: unknown): string[] => {
  if (!Array.isArray(cfs)) return [];
  return cfs
    .map((entry) => {
      if (entry && typeof entry === "object" && "name" in entry) {
        const name = (entry as { name?: unknown }).name;
        return typeof name === "string" ? name : null;
      }
      return null;
    })
    .filter((name): name is string => Boolean(name));
};

const languageLabels = (languages: unknown): string[] => {
  if (!Array.isArray(languages)) return [];
  return languages
    .map((entry) => {
      if (entry && typeof entry === "object" && "name" in entry) {
        const name = (entry as { name?: unknown }).name;
        return typeof name === "string" ? name : null;
      }
      return null;
    })
    .filter((name): name is string => Boolean(name));
};

const releaseGroups = (groups: unknown): string[] => {
  if (!Array.isArray(groups)) return [];
  return groups.filter((group): group is string => typeof group === "string");
};

const seasonStats = (stats: unknown): ArrSeason["statistics"] => {
  if (!stats || typeof stats !== "object") return null;
  const s = stats as {
    episodeFileCount?: number;
    episodeCount?: number;
    totalEpisodeCount?: number;
    sizeOnDisk?: number;
    releaseGroups?: unknown;
  };
  return {
    episodeFileCount: s.episodeFileCount ?? 0,
    episodeCount: s.episodeCount ?? 0,
    totalEpisodeCount: s.totalEpisodeCount ?? 0,
    sizeOnDisk: s.sizeOnDisk ?? 0,
    releaseGroups: releaseGroups(s.releaseGroups),
    percentOfEpisodes:
      s.totalEpisodeCount && s.totalEpisodeCount > 0
        ? (s.episodeFileCount ?? 0) / s.totalEpisodeCount
        : 0,
  };
};

const seriesStats = (series: {
  statistics?: Record<string, unknown> | null;
}): ArrSeries["statistics"] => {
  const stats = series.statistics;
  if (!stats) return null;
  return {
    seasonCount: 0,
    episodeFileCount: (stats.episodeFileCount as number) ?? 0,
    episodeCount: (stats.episodeCount as number) ?? 0,
    totalEpisodeCount: (stats.totalEpisodeCount as number) ?? 0,
    sizeOnDisk: (stats.sizeOnDisk as number) ?? 0,
    releaseGroups: releaseGroups(stats.releaseGroups),
    percentOfEpisodes:
      (stats.totalEpisodeCount as number) > 0
        ? ((stats.episodeFileCount as number) ?? 0) /
          (stats.totalEpisodeCount as number)
        : 0,
  };
};

const baseImageSchema = z
  .object({
    coverType: z.string().optional(),
    remoteUrl: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
  })
  .passthrough();

const seasonImageSchema = baseImageSchema.optional().nullable();

function pickPoster(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const poster = images.find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const coverType = (entry as { coverType?: string }).coverType;
    return coverType === "poster";
  });
  if (poster && typeof poster === "object") {
    const p = poster as { remoteUrl?: string; url?: string };
    return p.remoteUrl ?? p.url ?? null;
  }
  return null;
}

function pickFanart(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const fanart = images.find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const coverType = (entry as { coverType?: string }).coverType;
    return coverType === "fanart";
  });
  if (fanart && typeof fanart === "object") {
    const f = fanart as { remoteUrl?: string; url?: string };
    return f.remoteUrl ?? f.url ?? null;
  }
  return null;
}

const seasonSchema = z
  .object({
    seasonNumber: z.number(),
    monitored: z.boolean(),
    statistics: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .passthrough();

const seriesSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    sortTitle: z.string().optional().default(""),
    status: z.string().optional().default(""),
    overview: z.string().optional().nullable(),
    network: z.string().optional().nullable(),
    year: z.number().optional().nullable(),
    tvdbId: z.number().optional().nullable(),
    tmdbId: z.number().optional().nullable(),
    imdbId: z.string().optional().nullable(),
    runtime: z.number().optional().nullable(),
    poster: seasonImageSchema,
    fanart: seasonImageSchema,
    images: z.array(baseImageSchema).optional().default([]),
    monitored: z.boolean(),
    seasons: z.array(seasonSchema).optional().default([]),
    statistics: z.record(z.string(), z.unknown()).optional().nullable(),
    path: z.string().optional().nullable(),
    qualityProfileId: z.number().optional().nullable(),
    nextAiring: z.string().optional().nullable(),
    ended: z.boolean().optional().default(false),
  })
  .passthrough();

const episodeSchema = z
  .object({
    id: z.number(),
    seriesId: z.number(),
    tvdbId: z.number().optional().nullable(),
    episodeNumber: z.number(),
    seasonNumber: z.number(),
    title: z.string().optional().default(""),
    airDate: z.string().optional().nullable(),
    airDateUtc: z.string().optional().nullable(),
    overview: z.string().optional().nullable(),
    runtime: z.number().optional().nullable(),
    monitored: z.boolean(),
    hasFile: z.boolean(),
    episodeFileId: z.number().optional().nullable(),
    seasonId: z.number().optional().nullable(),
  })
  .passthrough();

const episodeFileSchema = z
  .object({
    id: z.number(),
    seriesId: z.number(),
    seasonNumber: z.number(),
    relativePath: z.string(),
    path: z.string(),
    size: z.number(),
    dateAdded: z.string().optional().nullable(),
    quality: z.record(z.string(), z.unknown()),
    releaseGroup: z.string().optional().nullable(),
    customFormats: z.array(z.record(z.string(), z.unknown())).optional(),
    languages: z.array(z.record(z.string(), z.unknown())).optional(),
    sceneName: z.string().optional().nullable(),
    originalFilePath: z.string().optional().nullable(),
  })
  .passthrough();

const movieSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    sortTitle: z.string().optional().default(""),
    originalTitle: z.string().optional().nullable(),
    status: z.string().optional().default(""),
    overview: z.string().optional().nullable(),
    year: z.number().optional().nullable(),
    tmdbId: z.number().optional().nullable(),
    imdbId: z.string().optional().nullable(),
    runtime: z.number().optional().nullable(),
    images: z.array(baseImageSchema).optional().default([]),
    monitored: z.boolean(),
    hasFile: z.boolean().optional().default(false),
    inCinemas: z.string().optional().nullable(),
    physicalRelease: z.string().optional().nullable(),
    digitalRelease: z.string().optional().nullable(),
    path: z.string().optional().nullable(),
    qualityProfileId: z.number().optional().nullable(),
    sizeOnDisk: z.number().optional().default(0),
    minimumAvailability: z.string().optional().nullable(),
    studio: z.string().optional().nullable(),
    collection: z
      .object({ name: z.string(), tmdbId: z.number().nullable() })
      .optional()
      .nullable(),
    originalLanguage: z.object({ name: z.string() }).optional().nullable(),
  })
  .passthrough();

const movieFileSchema = z
  .object({
    id: z.number(),
    movieId: z.number(),
    relativePath: z.string(),
    path: z.string(),
    size: z.number(),
    dateAdded: z.string().optional().nullable(),
    quality: z.record(z.string(), z.unknown()),
    releaseGroup: z.string().optional().nullable(),
    customFormats: z.array(z.record(z.string(), z.unknown())).optional(),
    languages: z.array(z.record(z.string(), z.unknown())).optional(),
    sceneName: z.string().optional().nullable(),
    originalFilePath: z.string().optional().nullable(),
    edition: z.string().optional().nullable(),
  })
  .passthrough();

const releaseSchema = z
  .object({
    guid: z.string(),
    title: z.string(),
    sortTitle: z.string().optional().nullable(),
    quality: z.record(z.string(), z.unknown()),
    releaseGroup: z.string().optional().nullable(),
    indexer: z.string(),
    indexerId: z.number(),
    size: z.number(),
    ageHours: z.number().optional().default(0),
    seeders: z.number().optional().nullable(),
    leechers: z.number().optional().nullable(),
    protocol: z.string(),
    infoUrl: z.string().optional().nullable(),
    downloadUrl: z.string().optional().nullable(),
    magnetUrl: z.string().optional().nullable(),
    approved: z.boolean().optional().default(false),
    rejected: z.boolean().optional().default(false),
    rejections: z.array(z.string()).optional().default([]),
    customFormats: z.array(z.record(z.string(), z.unknown())).optional(),
    cached: z.boolean().optional().default(false),
    languages: z.array(z.record(z.string(), z.unknown())).optional(),
    score: z.number().optional().nullable(),
    fullSignup: z.boolean().optional().default(false),
  })
  .passthrough();

const paginatedQueueSchema = z
  .object({
    records: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    totalRecords: z.number().optional().default(0),
  })
  .passthrough();

const commandResultSchema = z
  .object({
    id: z.number().optional(),
  })
  .passthrough();

export class ArrAdapter implements IntegrationAdapter {
  readonly capabilities: CapabilitySet = {
    readQueue: true,
    manageQueue: true,
    search: true,
    request: false,
    deleteMedia: true,
    replaceMedia: true,
    searchSubtitles: false,
  };

  readonly name: string;
  private readonly baseUrl: URL;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    config: ArrAdapterConfig,
    private readonly fetchImpl: Fetch = fetch,
  ) {
    this.name = config.serviceName;
    this.baseUrl = normalizeIntegrationUrl(config.baseUrl);
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 8_000;
  }

  async health(): Promise<
    AdapterResult<{ latencyMs: number; version: string }>
  > {
    const startedAt = performance.now();
    const response = await this.request("/api/v3/system/status");
    if (!response.ok) return response;
    if (!response.data.ok) {
      if (response.data.status === 401 || response.data.status === 403) {
        return errorResult(
          "authentication",
          `${this.name} rejected its API key`,
          false,
        );
      }
      return errorResult(
        "upstream",
        `${this.name} health check failed`,
        response.data.status === 429 || response.data.status >= 500,
      );
    }
    try {
      const status = statusSchema.parse(await response.data.json());
      return {
        ok: true,
        data: {
          version: status.version,
          latencyMs: Math.round(performance.now() - startedAt),
        },
      };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid status data`,
        true,
      );
    }
  }

  async listSeries(): Promise<AdapterResult<ArrSeries[]>> {
    const response = await this.request("/api/v3/series");
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const items = z.array(seriesSchema).parse(json);
      return {
        ok: true,
        data: items.map((series) => this.normalizeSeries(series)),
      };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid series data`,
        true,
      );
    }
  }

  async getSeries(id: number): Promise<AdapterResult<ArrSeries>> {
    const response = await this.request(`/api/v3/series/${id}`);
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const series = seriesSchema.parse(await response.data.json());
      return { ok: true, data: this.normalizeSeries(series) };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid series data`,
        true,
      );
    }
  }

  async listEpisodes(seriesId: number): Promise<AdapterResult<ArrEpisode[]>> {
    const response = await this.request(`/api/v3/episode?seriesId=${seriesId}`);
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const items = z.array(episodeSchema).parse(json);
      return {
        ok: true,
        data: items.map((episode) => ({
          id: episode.id,
          seriesId: episode.seriesId,
          tvdbId: episode.tvdbId ?? null,
          episodeNumber: episode.episodeNumber,
          seasonNumber: episode.seasonNumber,
          title: episode.title || `Episode ${episode.episodeNumber}`,
          airDate: episode.airDate ?? null,
          airDateUtc: episode.airDateUtc ?? null,
          overview: episode.overview ?? null,
          runtime: episode.runtime ?? null,
          monitored: episode.monitored,
          hasFile: episode.hasFile,
          episodeFileId: episode.episodeFileId ?? null,
          seasonId: episode.seasonId ?? null,
        })),
      };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid episode data`,
        true,
      );
    }
  }

  async listEpisodeFiles(
    seriesId: number,
  ): Promise<AdapterResult<ArrEpisodeFile[]>> {
    const response = await this.request(
      `/api/v3/episodefile?seriesId=${seriesId}`,
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const items = z.array(episodeFileSchema).parse(json);
      return {
        ok: true,
        data: items.map((file) => ({
          id: file.id,
          seriesId: file.seriesId,
          seasonNumber: file.seasonNumber,
          episodeId: (file as Record<string, unknown>).episodeId as number,
          relativePath: file.relativePath,
          path: file.path,
          size: file.size,
          dateAdded: file.dateAdded ?? null,
          quality: qualityLabel(file.quality),
          qualityWeight: qualityWeight(file.quality),
          releaseGroup: file.releaseGroup ?? null,
          customFormats: customFormatNames(file.customFormats),
          languages: languageLabels(file.languages),
          originalFilePath: file.originalFilePath ?? null,
        })),
      };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid episode file data`,
        true,
      );
    }
  }

  async listMovies(): Promise<AdapterResult<ArrMovie[]>> {
    const response = await this.request("/api/v3/movie");
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const items = z.array(movieSchema).parse(json);
      return {
        ok: true,
        data: items.map((movie) => this.normalizeMovie(movie)),
      };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid movie data`,
        true,
      );
    }
  }

  async getMovie(id: number): Promise<AdapterResult<ArrMovie>> {
    const response = await this.request(`/api/v3/movie/${id}`);
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const movie = movieSchema.parse(await response.data.json());
      return { ok: true, data: this.normalizeMovie(movie) };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid movie data`,
        true,
      );
    }
  }

  async getMovieFile(
    movieId: number,
  ): Promise<AdapterResult<ArrMovieFile | null>> {
    const response = await this.request(`/api/v3/moviefile?movieId=${movieId}`);
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const items = z.array(movieFileSchema).parse(json);
      if (items.length === 0) return { ok: true, data: null };
      const file = items[0];
      return {
        ok: true,
        data: {
          id: file.id,
          movieId: file.movieId,
          relativePath: file.relativePath,
          path: file.path,
          size: file.size,
          dateAdded: file.dateAdded ?? null,
          quality: qualityLabel(file.quality),
          qualityWeight: qualityWeight(file.quality),
          releaseGroup: file.releaseGroup ?? null,
          customFormats: customFormatNames(file.customFormats),
          languages: languageLabels(file.languages),
          originalFilePath: file.originalFilePath ?? null,
          edition: file.edition ?? null,
        },
      };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid movie file data`,
        true,
      );
    }
  }

  async searchReleases(query: {
    seriesId?: number;
    episodeId?: number;
    seasonNumber?: number;
    movieId?: number;
    limit?: number;
  }): Promise<AdapterResult<ArrRelease[]>> {
    const params = new URLSearchParams();
    if (query.seriesId) params.set("seriesId", String(query.seriesId));
    if (query.episodeId) params.set("episodeId", String(query.episodeId));
    if (query.seasonNumber)
      params.set("seasonNumber", String(query.seasonNumber));
    if (query.movieId) params.set("movieId", String(query.movieId));
    if (query.limit) params.set("limit", String(query.limit));
    const response = await this.request(`/api/v3/release?${params.toString()}`);
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const items = z.array(releaseSchema).parse(json);
      return {
        ok: true,
        data: items.map((release) => ({
          guid: release.guid,
          title: release.title,
          sortTitle: release.sortTitle ?? null,
          quality: qualityLabel(release.quality),
          qualityWeight: qualityWeight(release.quality),
          releaseGroup: release.releaseGroup ?? null,
          indexer: release.indexer,
          indexerId: release.indexerId,
          size: release.size,
          ageHours: release.ageHours,
          seeders: release.seeders ?? null,
          leechers: release.leechers ?? null,
          protocol: release.protocol,
          infoUrl: release.infoUrl ?? null,
          downloadUrl: release.downloadUrl ?? null,
          magnetUrl: release.magnetUrl ?? null,
          approved: release.approved,
          rejected: release.rejected,
          rejections: release.rejections,
          customFormats: customFormatNames(release.customFormats),
          cached: release.cached,
          languages: languageLabels(release.languages),
          score: release.score ?? null,
          fullSignup: release.fullSignup,
        })),
      };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid release data`,
        true,
      );
    }
  }

  async captureRelease(
    guid: string,
    indexerId: number,
    downloadUrl: string | null,
  ): Promise<AdapterResult<ArrCommandResult>> {
    const response = await this.request("/api/v3/release", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        guid,
        indexerId,
        ...(downloadUrl ? { downloadUrl } : {}),
      }),
    });
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const result = commandResultSchema.parse(await response.data.json());
      return { ok: true, data: { id: result.id, accepted: true } };
    } catch {
      return { ok: true, data: { accepted: true } };
    }
  }

  async blocklistRelease(
    guid: string,
  ): Promise<AdapterResult<ArrCommandResult>> {
    const response = await this.request(`/api/v3/release?guids=${guid}`, {
      method: "DELETE",
    });
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    return { ok: true, data: { accepted: response.data.status === 200 } };
  }

  async queue(): Promise<AdapterResult<ArrQueue[]>> {
    const response = await this.request("/api/v3/queue?page=1&pageSize=50");
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const json = await response.data.json();
      const parsed = paginatedQueueSchema.parse(json);
      return {
        ok: true,
        data: parsed.records.map((record) => this.normalizeQueue(record)),
      };
    } catch {
      return errorResult(
        "malformed-response",
        `${this.name} returned invalid queue data`,
        true,
      );
    }
  }

  async deleteEpisodeFile(
    fileId: number,
  ): Promise<AdapterResult<ArrCommandResult>> {
    return this.deleteFile(`/api/v3/episodefile/${fileId}`);
  }

  async deleteMovieFile(
    fileId: number,
  ): Promise<AdapterResult<ArrCommandResult>> {
    return this.deleteFile(`/api/v3/moviefile/${fileId}`);
  }

  async deleteSeries(id: number): Promise<AdapterResult<ArrCommandResult>> {
    return this.deleteFile(`/api/v3/series/${id}?deleteFiles=true`);
  }

  async deleteMovie(id: number): Promise<AdapterResult<ArrCommandResult>> {
    return this.deleteFile(`/api/v3/movie/${id}?deleteFiles=true`);
  }

  async removeFromQueue(
    id: number,
    removeFromClient = true,
  ): Promise<AdapterResult<ArrCommandResult>> {
    const params = new URLSearchParams();
    if (removeFromClient) params.set("removeFromClient", "true");
    return this.deleteFile(
      `/api/v3/queue/${id}${params.size ? `?${params.toString()}` : ""}`,
    );
  }

  async manualImport(
    path: string,
    seriesId?: number,
    seasonNumber?: number,
  ): Promise<AdapterResult<ArrCommandResult>> {
    const body: Record<string, unknown> = {
      path,
      filter: "manual",
    };
    if (seriesId) body.seriesId = seriesId;
    if (seasonNumber) body.seasonNumber = seasonNumber;
    return this.requestJson("/api/v3/command", {
      method: "POST",
      body: JSON.stringify({ name: "ManualImport", ...body }),
    });
  }

  private async deleteFile(
    path: string,
  ): Promise<AdapterResult<ArrCommandResult>> {
    const response = await this.request(path, { method: "DELETE" });
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    return { ok: true, data: { accepted: true } };
  }

  private async requestJson(
    path: string,
    init: RequestInit,
  ): Promise<AdapterResult<ArrCommandResult>> {
    const response = await this.request(path, init);
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const result = commandResultSchema.parse(await response.data.json());
      return { ok: true, data: { id: result.id, accepted: true } };
    } catch {
      return { ok: true, data: { accepted: true } };
    }
  }

  private normalizeSeries(series: z.infer<typeof seriesSchema>): ArrSeries {
    const posterUrl = pickPoster(series.images) ?? imageUrl(this.baseUrl, null);
    const fanartUrl = pickFanart(series.images);
    const seasons: ArrSeason[] = series.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      monitored: season.monitored,
      episodeCount: (season.statistics?.episodeCount as number) ?? 0,
      episodeFileCount: (season.statistics?.episodeFileCount as number) ?? 0,
      totalEpisodeCount: (season.statistics?.totalEpisodeCount as number) ?? 0,
      statistics: seasonStats(season.statistics),
    }));
    return {
      id: series.id,
      title: series.title,
      sortTitle: series.sortTitle || sortTitle(series.title),
      status: series.status || "unknown",
      overview: series.overview ?? null,
      network: series.network ?? null,
      year: series.year ?? null,
      tvdbId: series.tvdbId ?? null,
      tmdbId: series.tmdbId ?? null,
      imdbId: series.imdbId ?? null,
      runtime: series.runtime ?? null,
      posterUrl,
      fanartUrl,
      monitored: series.monitored,
      seasons,
      statistics: seriesStats(series),
      path: series.path ?? null,
      qualityProfileId: series.qualityProfileId ?? null,
      nextAiring: series.nextAiring ?? null,
      ended: series.ended,
    };
  }

  private normalizeMovie(movie: z.infer<typeof movieSchema>): ArrMovie {
    return {
      id: movie.id,
      title: movie.title,
      sortTitle: movie.sortTitle || sortTitle(movie.title),
      originalTitle: movie.originalTitle ?? null,
      status: movie.status || "unknown",
      overview: movie.overview ?? null,
      year: movie.year ?? null,
      tmdbId: movie.tmdbId ?? null,
      imdbId: movie.imdbId ?? null,
      runtime: movie.runtime ?? null,
      posterUrl: pickPoster(movie.images),
      fanartUrl: pickFanart(movie.images),
      monitored: movie.monitored,
      hasFile: movie.hasFile,
      inCinemas: movie.inCinemas ?? null,
      physicalRelease: movie.physicalRelease ?? null,
      digitalRelease: movie.digitalRelease ?? null,
      path: movie.path ?? null,
      qualityProfileId: movie.qualityProfileId ?? null,
      sizeOnDisk: movie.sizeOnDisk,
      minimumAvailability: movie.minimumAvailability ?? null,
      studio: movie.studio ?? null,
      collection: movie.collection
        ? { name: movie.collection.name, tmdbId: movie.collection.tmdbId }
        : null,
      originalLanguage: movie.originalLanguage
        ? { name: movie.originalLanguage.name }
        : null,
    };
  }

  private normalizeQueue(record: Record<string, unknown>): ArrQueue {
    const episode =
      (record.episode as Record<string, unknown> | undefined) ??
      (record.episodes as Record<string, unknown>[] | undefined)?.[0];
    return {
      id: (record.id as number) ?? 0,
      seriesId: (record.seriesId as number) ?? null,
      movieId: (record.movieId as number) ?? null,
      episodeId: (record.episodeId as number) ?? episode?.id ?? null,
      seasonNumber: (record.seasonNumber as number) ?? null,
      title:
        (record.title as string) ??
        ((record.movie as Record<string, unknown> | undefined)
          ?.title as string) ??
        ((record.series as Record<string, unknown> | undefined)
          ?.title as string) ??
        "Queued item",
      status: (record.status as string) ?? "queued",
      trackedDownloadStatus: (record.trackedDownloadStatus as string) ?? null,
      trackedDownloadState: (record.trackedDownloadState as string) ?? null,
      downloadId: (record.downloadId as string) ?? "",
      protocol: (record.protocol as string) ?? "unknown",
      indexer: (record.indexer as string) ?? "",
      downloadClient: (record.downloadClient as string) ?? null,
      outputPath: (record.outputPath as string) ?? null,
      size: (record.size as number) ?? 0,
      sizeleft: (record.sizeleft as number) ?? 0,
      timeleft: (record.timeleft as string) ?? null,
      estimatedCompletionTime:
        (record.estimatedCompletionTime as string) ?? null,
      addedAt: (record.addedAt as string) ?? new Date().toISOString(),
    };
  }

  private httpError(status: number): AdapterResult<never> {
    if (status === 401 || status === 403) {
      return errorResult(
        "authentication",
        `${this.name} rejected its API key`,
        false,
      );
    }
    return errorResult(
      "upstream",
      `${this.name} request failed`,
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
      if (!headers.has("X-Api-Key")) {
        headers.set("X-Api-Key", this.apiKey);
      }
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
      ) {
        return errorResult(
          "timeout",
          `${this.name} did not respond before the timeout`,
          true,
        );
      }
      return errorResult(
        "unreachable",
        `${this.name} could not be reached`,
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

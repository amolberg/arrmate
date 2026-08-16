import "server-only";

import { ArrAdapter } from "@/adapters/arr";
import type {
  ArrEpisode,
  ArrEpisodeFile,
  ArrMovie,
  ArrMovieFile,
  ArrSeries,
} from "@/domain/arr";
import type { AdapterError, AdapterResult } from "@/domain/integrations";

import { arrFromEnvironment } from "./integrations/arr";

export interface MediaOverview {
  series: MediaSeriesSummary[];
  movies: MediaMovieSummary[];
  errors: {
    sonarr: AdapterError | null;
    radarr: AdapterError | null;
  };
}

export interface MediaSeriesSummary {
  id: number;
  title: string;
  year: number | null;
  status: string;
  monitored: boolean;
  posterUrl: string | null;
  network: string | null;
  episodeFileCount: number;
  episodeTotalCount: number;
  sizeOnDisk: number;
  ended: boolean;
}

export interface MediaMovieSummary {
  id: number;
  title: string;
  year: number | null;
  status: string;
  monitored: boolean;
  hasFile: boolean;
  posterUrl: string | null;
  studio: string | null;
  sizeOnDisk: number;
  minimumAvailability: string | null;
  originalLanguage: string | null;
}

function summarizeSeries(series: ArrSeries): MediaSeriesSummary {
  return {
    id: series.id,
    title: series.title,
    year: series.year,
    status: series.status,
    monitored: series.monitored,
    posterUrl: series.posterUrl,
    network: series.network,
    episodeFileCount: series.statistics?.episodeFileCount ?? 0,
    episodeTotalCount: series.statistics?.totalEpisodeCount ?? 0,
    sizeOnDisk: series.statistics?.sizeOnDisk ?? 0,
    ended: series.ended,
  };
}

function summarizeMovie(movie: ArrMovie): MediaMovieSummary {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    status: movie.status,
    monitored: movie.monitored,
    hasFile: movie.hasFile,
    posterUrl: movie.posterUrl,
    studio: movie.studio,
    sizeOnDisk: movie.sizeOnDisk,
    minimumAvailability: movie.minimumAvailability,
    originalLanguage: movie.originalLanguage?.name ?? null,
  };
}

export async function getMediaOverview(): Promise<MediaOverview> {
  const sonarr = arrFromEnvironment("sonarr");
  const radarr = arrFromEnvironment("radarr");
  const [seriesResult, moviesResult] = await Promise.all([
    sonarr ? sonarr.listSeries() : Promise.resolve(null),
    radarr ? radarr.listMovies() : Promise.resolve(null),
  ]);
  return {
    series:
      seriesResult && seriesResult.ok
        ? seriesResult.data.map(summarizeSeries)
        : [],
    movies:
      moviesResult && moviesResult.ok
        ? moviesResult.data.map(summarizeMovie)
        : [],
    errors: {
      sonarr: seriesResult && !seriesResult.ok ? seriesResult.error : null,
      radarr: moviesResult && !moviesResult.ok ? moviesResult.error : null,
    },
  };
}

export interface MediaSeriesDetail {
  series: ArrSeries;
  episodes: ArrEpisode[];
  files: ArrEpisodeFile[];
  error: AdapterError | null;
}

export async function getSeriesDetail(
  id: number,
): Promise<MediaSeriesDetail | null> {
  const sonarr = arrFromEnvironment("sonarr");
  if (!sonarr) return null;
  const seriesResult = await sonarr.getSeries(id);
  if (!seriesResult.ok) {
    return {
      series: null as never,
      episodes: [],
      files: [],
      error: seriesResult.error,
    };
  }
  const [episodesResult, filesResult] = await Promise.all([
    sonarr.listEpisodes(id),
    sonarr.listEpisodeFiles(id),
  ]);
  return {
    series: seriesResult.data,
    episodes: episodesResult.ok ? episodesResult.data : [],
    files: filesResult.ok ? filesResult.data : [],
    error:
      episodesResult && !episodesResult.ok
        ? episodesResult.error
        : filesResult && !filesResult.ok
          ? filesResult.error
          : null,
  };
}

export interface MediaMovieDetail {
  movie: ArrMovie;
  file: ArrMovieFile | null;
  error: AdapterError | null;
}

export async function getMovieDetail(
  id: number,
): Promise<MediaMovieDetail | null> {
  const radarr = arrFromEnvironment("radarr");
  if (!radarr) return null;
  const movieResult = await radarr.getMovie(id);
  if (!movieResult.ok) {
    return { movie: null as never, file: null, error: movieResult.error };
  }
  const fileResult = await radarr.getMovieFile(id);
  return {
    movie: movieResult.data,
    file: fileResult.ok ? fileResult.data : null,
    error: fileResult && !fileResult.ok ? fileResult.error : null,
  };
}

export function getSonarrAdapter(): ArrAdapter | null {
  return arrFromEnvironment("sonarr");
}

export function getRadarrAdapter(): ArrAdapter | null {
  return arrFromEnvironment("radarr");
}

export function unwrapResult<T>(result: AdapterResult<T> | null): {
  data: T | null;
  error: AdapterError | null;
} {
  if (!result) return { data: null, error: null };
  if (result.ok) return { data: result.data, error: null };
  return { data: null, error: result.error };
}

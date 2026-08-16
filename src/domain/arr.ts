export interface ArrSeries {
  id: number;
  title: string;
  sortTitle: string;
  status: string;
  overview: string | null;
  network: string | null;
  year: number | null;
  tvdbId: number | null;
  tmdbId: number | null;
  imdbId: string | null;
  runtime: number | null;
  posterUrl: string | null;
  fanartUrl: string | null;
  monitored: boolean;
  seasons: ArrSeason[];
  statistics: ArrSeriesStatistics | null;
  path: string | null;
  qualityProfileId: number | null;
  nextAiring: string | null;
  ended: boolean;
}

export interface ArrSeason {
  seasonNumber: number;
  monitored: boolean;
  episodeCount: number;
  episodeFileCount: number;
  totalEpisodeCount: number;
  statistics: ArrSeasonStatistics | null;
}

export interface ArrSeasonStatistics {
  episodeFileCount: number;
  episodeCount: number;
  totalEpisodeCount: number;
  sizeOnDisk: number;
  releaseGroups: string[];
  percentOfEpisodes: number;
}

export interface ArrSeriesStatistics {
  seasonCount: number;
  episodeFileCount: number;
  episodeCount: number;
  totalEpisodeCount: number;
  sizeOnDisk: number;
  releaseGroups: string[];
  percentOfEpisodes: number;
}

export interface ArrEpisode {
  id: number;
  seriesId: number;
  tvdbId: number | null;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  airDate: string | null;
  airDateUtc: string | null;
  overview: string | null;
  runtime: number | null;
  monitored: boolean;
  hasFile: boolean;
  episodeFileId: number | null;
  seasonId: number | null;
}

export interface ArrEpisodeFile {
  id: number;
  seriesId: number;
  seasonNumber: number;
  episodeId: number;
  relativePath: string;
  path: string;
  size: number;
  dateAdded: string | null;
  quality: string;
  qualityWeight: number;
  releaseGroup: string | null;
  customFormats: string[];
  languages: string[];
  originalFilePath: string | null;
}

export interface ArrMovie {
  id: number;
  title: string;
  sortTitle: string;
  originalTitle: string | null;
  status: string;
  overview: string | null;
  year: number | null;
  tmdbId: number | null;
  imdbId: string | null;
  runtime: number | null;
  posterUrl: string | null;
  fanartUrl: string | null;
  monitored: boolean;
  hasFile: boolean;
  inCinemas: string | null;
  physicalRelease: string | null;
  digitalRelease: string | null;
  path: string | null;
  qualityProfileId: number | null;
  sizeOnDisk: number;
  minimumAvailability: string | null;
  studio: string | null;
  collection: { name: string; tmdbId: number | null } | null;
  originalLanguage: { name: string } | null;
}

export interface ArrMovieFile {
  id: number;
  movieId: number;
  relativePath: string;
  path: string;
  size: number;
  dateAdded: string | null;
  quality: string;
  qualityWeight: number;
  releaseGroup: string | null;
  customFormats: string[];
  languages: string[];
  originalFilePath: string | null;
  edition: string | null;
}

export interface ArrRelease {
  guid: string;
  title: string;
  sortTitle: string | null;
  quality: string;
  qualityWeight: number;
  releaseGroup: string | null;
  indexer: string;
  indexerId: number;
  size: number;
  ageHours: number;
  seeders: number | null;
  leechers: number | null;
  protocol: string;
  infoUrl: string | null;
  downloadUrl: string | null;
  magnetUrl: string | null;
  approved: boolean;
  rejected: boolean;
  rejections: string[];
  customFormats: string[];
  cached: boolean;
  languages: string[];
  score: number | null;
  fullSignup: boolean;
}

export interface ArrQueue {
  id: number;
  seriesId: number | null;
  movieId: number | null;
  episodeId: number | null;
  seasonNumber: number | null;
  title: string;
  status: string;
  trackedDownloadStatus: string | null;
  trackedDownloadState: string | null;
  downloadId: string;
  protocol: string;
  indexer: string;
  downloadClient: string | null;
  outputPath: string | null;
  size: number;
  sizeleft: number;
  timeleft: string | null;
  estimatedCompletionTime: string | null;
  addedAt: string;
}

export interface ArrCommandResult {
  id?: number;
  accepted: boolean;
}

export interface BazarrSubtitleSummary {
  id: number;
  radarrId: number | null;
  sonarrEpisodeId: number | null;
  sonarrSeriesId: number | null;
  language: string;
  languageCode: string;
  hi: boolean;
  forced: boolean;
  provider: string;
  score: number | null;
  uploadDate: string | null;
  release: string | null;
  listenerPid: string | null;
  date: string | null;
  missing: boolean;
  path: string | null;
  subtitlesPath: string | null;
}

export interface BazarrHistoryEntry {
  id: number;
  action: string;
  timestamp: string;
  description: string;
  provider: string | null;
  language: string | null;
  score: number | null;
  radarrId: number | null;
  sonarrEpisodeId: number | null;
  sonarrSeriesId: number | null;
}

export interface BazarrSubtitleSearch {
  id: string | number;
  language: string;
  languageCode: string;
  hi: boolean;
  forced: boolean;
  provider: string;
  score: number | null;
  uploadDate: string | null;
  release: string | null;
  url: string | null;
  infoUrl: string | null;
  size: number | null;
  matches: number | null;
  subtitle: string | null;
}

export interface BazarrWantedEntry {
  radarrId: number | null;
  sonarrEpisodeId: number | null;
  sonarrSeriesId: number | null;
  title: string;
  seriesTitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  monitored: boolean;
  missingLanguages: string[];
}

export interface BazarrSubtitleTracks {
  audioTracks: { language: string; codec: string }[];
  embedded: { language: string }[];
  external: {
    language: string;
    path: string;
    forced: boolean;
    hi: boolean;
  }[];
}

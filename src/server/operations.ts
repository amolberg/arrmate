import "server-only";

import type { DownloadOverview } from "@/domain/downloads";
import type { AdapterError, IntegrationSummary } from "@/domain/integrations";

import { qBittorrentFromEnvironment } from "./integrations/qbittorrent";

export interface OperationsSnapshot {
  integrations: IntegrationSummary[];
  downloads: DownloadOverview | null;
  downloadError: AdapterError | null;
}

const plannedIntegrations: IntegrationSummary[] = [
  {
    id: "jellyfin",
    name: "Jellyfin",
    kind: "media-server",
    health: "not-configured",
    detail: "Media server connection is not configured",
  },
  {
    id: "radarr",
    name: "Radarr",
    kind: "media-manager",
    health: "not-configured",
    detail: "Movie manager connection is not configured",
  },
  {
    id: "sonarr",
    name: "Sonarr",
    kind: "media-manager",
    health: "not-configured",
    detail: "Series manager connection is not configured",
  },
  {
    id: "prowlarr",
    name: "Prowlarr",
    kind: "indexer",
    health: "not-configured",
    detail: "Indexer connection is not configured",
  },
  {
    id: "bazarr",
    name: "Bazarr",
    kind: "subtitle-provider",
    health: "not-configured",
    detail: "Subtitle provider is not configured",
  },
];

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  const adapter = qBittorrentFromEnvironment();
  if (!adapter) {
    return {
      integrations: [
        ...plannedIntegrations,
        {
          id: "qbittorrent",
          name: "qBittorrent",
          kind: "download-client",
          health: "not-configured",
          detail: "Download client connection is not configured",
        },
      ],
      downloads: null,
      downloadError: null,
    };
  }

  const startedAt = performance.now();
  const overview = await adapter.overview();
  const checkedAt = new Date();
  const latencyMs = Math.round(performance.now() - startedAt);

  if (!overview.ok) {
    return {
      integrations: [
        ...plannedIntegrations,
        {
          id: "qbittorrent",
          name: "qBittorrent",
          kind: "download-client",
          health:
            overview.error.code === "authentication" ? "offline" : "degraded",
          detail: overview.error.message,
          checkedAt,
          latencyMs,
        },
      ],
      downloads: null,
      downloadError: overview.error,
    };
  }

  return {
    integrations: [
      ...plannedIntegrations,
      {
        id: "qbittorrent",
        name: "qBittorrent",
        kind: "download-client",
        health: "online",
        detail:
          overview.data.items.length === 0
            ? "Connected · queue is empty"
            : `Connected · ${overview.data.items.length} active item${overview.data.items.length === 1 ? "" : "s"}`,
        checkedAt,
        latencyMs,
      },
    ],
    downloads: overview.data,
    downloadError: null,
  };
}

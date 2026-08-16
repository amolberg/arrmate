import "server-only";

import type { DownloadOverview } from "@/domain/downloads";
import type { AdapterError, IntegrationSummary } from "@/domain/integrations";

import { jellyseerrFromEnvironment } from "./integrations/jellyseerr";
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
  {
    id: "lidarr",
    name: "Lidarr",
    kind: "media-manager",
    health: "not-configured",
    detail: "Music manager adapter is not configured",
  },
  {
    id: "cleanuparr",
    name: "Cleanuparr",
    kind: "maintenance",
    health: "not-configured",
    detail: "Queue maintenance adapter is not configured",
  },
  {
    id: "unmanic",
    name: "Unmanic",
    kind: "transcoder",
    health: "not-configured",
    detail: "Transcoding adapter is not configured",
  },
  {
    id: "flaresolverr",
    name: "FlareSolverr",
    kind: "indexer-helper",
    health: "not-configured",
    detail: "Indexer helper adapter is not configured",
  },
  {
    id: "jfa",
    name: "JFA",
    kind: "access",
    health: "not-configured",
    detail: "Account helper adapter is not configured",
  },
];

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  const qBittorrent = qBittorrentFromEnvironment();
  const jellyseerr = jellyseerrFromEnvironment();
  const qStartedAt = performance.now();
  const seerrStartedAt = performance.now();
  const [overview, seerrHealth] = await Promise.all([
    qBittorrent ? qBittorrent.overview() : null,
    jellyseerr ? jellyseerr.health() : null,
  ]);
  const checkedAt = new Date();

  const qBittorrentSummary: IntegrationSummary = !qBittorrent
    ? {
        id: "qbittorrent",
        name: "qBittorrent",
        kind: "download-client",
        health: "not-configured",
        detail: "Download client connection is not configured",
      }
    : overview && !overview.ok
      ? {
          id: "qbittorrent",
          name: "qBittorrent",
          kind: "download-client",
          health:
            overview.error.code === "authentication" ? "offline" : "degraded",
          detail: overview.error.message,
          checkedAt,
          latencyMs: Math.round(performance.now() - qStartedAt),
        }
      : {
          id: "qbittorrent",
          name: "qBittorrent",
          kind: "download-client",
          health: "online",
          detail:
            overview && overview.ok && overview.data.items.length > 0
              ? `Connected · ${overview.data.items.length} active item${overview.data.items.length === 1 ? "" : "s"}`
              : "Connected · queue is empty",
          checkedAt,
          latencyMs: Math.round(performance.now() - qStartedAt),
        };

  const jellyseerrSummary: IntegrationSummary = !jellyseerr
    ? {
        id: "jellyseerr",
        name: "Jellyseerr",
        kind: "request-manager",
        health: "not-configured",
        detail: "Discovery and requests are not configured",
      }
    : seerrHealth && !seerrHealth.ok
      ? {
          id: "jellyseerr",
          name: "Jellyseerr",
          kind: "request-manager",
          health: "degraded",
          detail: seerrHealth.error.message,
          checkedAt,
          latencyMs: Math.round(performance.now() - seerrStartedAt),
        }
      : {
          id: "jellyseerr",
          name: "Jellyseerr",
          kind: "request-manager",
          health: "online",
          detail: "Discovery, sign-in, and requests are ready",
          checkedAt,
          latencyMs: seerrHealth?.ok ? seerrHealth.data.latencyMs : undefined,
        };

  return {
    integrations: [
      ...plannedIntegrations,
      jellyseerrSummary,
      qBittorrentSummary,
    ],
    downloads: overview?.ok ? overview.data : null,
    downloadError: overview && !overview.ok ? overview.error : null,
  };
}

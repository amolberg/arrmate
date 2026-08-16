import "server-only";

import type { DownloadOverview } from "@/domain/downloads";
import type { AdapterError, IntegrationSummary } from "@/domain/integrations";
import {
  aggregateTransferStats,
  periodStart,
  type TransferPeriodStats,
} from "@/domain/transfer-stats";
import {
  readTransferSnapshots,
  recordTransferSnapshot,
} from "@/db/transfer-stats-store";

import { jellyseerrFromEnvironment } from "./integrations/jellyseerr";
import { qBittorrentFromEnvironment } from "./integrations/qbittorrent";
import { arrFromEnvironment } from "./integrations/arr";

export interface OperationsSnapshot {
  integrations: IntegrationSummary[];
  downloads: DownloadOverview | null;
  downloadError: AdapterError | null;
  transferStats: Record<
    "day" | "week" | "month" | "year",
    TransferPeriodStats
  > | null;
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
  const sonarr = arrFromEnvironment("sonarr");
  const radarr = arrFromEnvironment("radarr");
  const qStartedAt = performance.now();
  const seerrStartedAt = performance.now();
  const [overview, seerrHealth, sonarrHealth, radarrHealth] = await Promise.all(
    [
      qBittorrent ? qBittorrent.overview() : null,
      jellyseerr ? jellyseerr.health() : null,
      sonarr ? sonarr.health() : null,
      radarr ? radarr.health() : null,
    ],
  );
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

  function arrSummary(
    id: "sonarr" | "radarr",
    name: "Sonarr" | "Radarr",
    health: Awaited<ReturnType<NonNullable<typeof sonarr>["health"]>> | null,
    configured: boolean,
  ): IntegrationSummary {
    if (!configured) {
      return {
        id,
        name,
        kind: "media-manager",
        health: "not-configured",
        detail: `${name} connection is not configured`,
      };
    }
    if (health && !health.ok) {
      return {
        id,
        name,
        kind: "media-manager",
        health: health.error.code === "authentication" ? "offline" : "degraded",
        detail: health.error.message,
        checkedAt,
      };
    }
    return {
      id,
      name,
      kind: "media-manager",
      health: "online",
      detail: health?.ok ? `Connected · v${health.data.version}` : "Connected",
      checkedAt,
      latencyMs: health?.ok ? health.data.latencyMs : undefined,
    };
  }

  return {
    integrations: [
      ...plannedIntegrations.map((item) =>
        item.id === "sonarr"
          ? arrSummary("sonarr", "Sonarr", sonarrHealth, Boolean(sonarr))
          : item.id === "radarr"
            ? arrSummary("radarr", "Radarr", radarrHealth, Boolean(radarr))
            : item,
      ),
      jellyseerrSummary,
      qBittorrentSummary,
    ],
    downloads: overview?.ok ? overview.data : null,
    downloadError: overview && !overview.ok ? overview.error : null,
    transferStats: overview?.ok
      ? await collectTransferStats(overview.data.transfer)
      : null,
  };
}

async function collectTransferStats(
  transfer: DownloadOverview["transfer"],
): Promise<OperationsSnapshot["transferStats"]> {
  const sampledAt = new Date();
  try {
    await recordTransferSnapshot({
      sampledAt,
      downloadedBytes: transfer.downloadedBytes,
      uploadedBytes: transfer.uploadedBytes,
    });
    const snapshots = await readTransferSnapshots(
      periodStart(sampledAt, "year"),
      sampledAt,
    );
    return {
      day: aggregateTransferStats(
        snapshots,
        periodStart(sampledAt, "day"),
        sampledAt,
      ),
      week: aggregateTransferStats(
        snapshots,
        periodStart(sampledAt, "week"),
        sampledAt,
      ),
      month: aggregateTransferStats(
        snapshots,
        periodStart(sampledAt, "month"),
        sampledAt,
      ),
      year: aggregateTransferStats(
        snapshots,
        periodStart(sampledAt, "year"),
        sampledAt,
      ),
    };
  } catch {
    return null;
  }
}

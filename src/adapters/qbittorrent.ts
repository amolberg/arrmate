import { z } from "zod";

import type {
  DownloadItem,
  DownloadOverview,
  DownloadState,
} from "@/domain/downloads";
import type {
  AdapterError,
  AdapterResult,
  CapabilitySet,
} from "@/domain/integrations";

import type { DownloadClientAdapter } from "./contracts";
import { normalizeIntegrationUrl } from "./url";

const torrentSchema = z
  .object({
    hash: z.string().min(1),
    name: z.string(),
    size: z.number().nonnegative(),
    progress: z.number(),
    dlspeed: z.number().nonnegative(),
    upspeed: z.number().nonnegative(),
    eta: z.number(),
    state: z.string(),
    ratio: z.number(),
    category: z.string().optional().default(""),
  })
  .passthrough();

const torrentsSchema = z.array(torrentSchema);

const transferSchema = z
  .object({
    dl_info_speed: z.number().nonnegative(),
    up_info_speed: z.number().nonnegative(),
    dl_info_data: z.number().nonnegative(),
    up_info_data: z.number().nonnegative(),
  })
  .passthrough();

export interface QbittorrentConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs?: number;
}

type Fetch = typeof fetch;

function adapterError(
  code: AdapterError["code"],
  message: string,
  retryable: boolean,
): AdapterResult<never> {
  return { ok: false, error: { code, message, retryable } };
}

function normalizeState(state: string, progress: number): DownloadState {
  const normalized = state.toLowerCase();
  if (progress >= 1 && ["pausedUP", "stoppedUP"].includes(state))
    return "complete";
  if (state.includes("error") || state === "missingFiles") return "error";
  if (normalized.includes("checking")) return "checking";
  if (normalized.includes("stalled")) return "stalled";
  if (state.startsWith("paused") || state.startsWith("stopped"))
    return "paused";
  if (
    normalized.includes("downloading") ||
    state.includes("DL") ||
    state === "metaDL" ||
    state === "forcedDL"
  ) {
    return "downloading";
  }
  if (normalized.includes("queued")) return "queued";
  if (state.includes("UP") || state === "uploading" || state === "forcedUP") {
    return "seeding";
  }
  return progress >= 1 ? "complete" : "unknown";
}

function normalizeTorrent(
  torrent: z.infer<typeof torrentSchema>,
): DownloadItem {
  return {
    id: torrent.hash,
    name: torrent.name,
    sizeBytes: torrent.size,
    progress: Math.max(0, Math.min(1, torrent.progress)),
    downloadSpeedBytes: torrent.dlspeed,
    uploadSpeedBytes: torrent.upspeed,
    etaSeconds: torrent.eta >= 8_640_000 ? null : Math.max(0, torrent.eta),
    state: normalizeState(torrent.state, torrent.progress),
    ratio: torrent.ratio,
    category: torrent.category || null,
  };
}

export class QbittorrentAdapter implements DownloadClientAdapter {
  readonly name = "qBittorrent";
  readonly capabilities: CapabilitySet = {
    readQueue: true,
    manageQueue: false,
    search: false,
    request: false,
    deleteMedia: false,
    replaceMedia: false,
    searchSubtitles: false,
  };

  private readonly baseUrl: URL;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: QbittorrentConfig,
    private readonly fetchImpl: Fetch = fetch,
  ) {
    this.baseUrl = normalizeIntegrationUrl(config.baseUrl);
    this.timeoutMs = config.timeoutMs ?? 8_000;
  }

  async health(): Promise<AdapterResult<{ latencyMs: number }>> {
    const startedAt = performance.now();
    const session = await this.login();
    if (!session.ok) return session;

    const response = await this.request("/api/v2/app/version", session.data);
    if (!response.ok) return response;
    if (!response.data.ok) {
      return adapterError("upstream", "qBittorrent health check failed", true);
    }
    return {
      ok: true,
      data: { latencyMs: Math.round(performance.now() - startedAt) },
    };
  }

  async overview(): Promise<AdapterResult<DownloadOverview>> {
    const session = await this.login();
    if (!session.ok) return session;

    const [torrentsResponse, transferResponse] = await Promise.all([
      this.request("/api/v2/torrents/info", session.data),
      this.request("/api/v2/transfer/info", session.data),
    ]);

    if (!torrentsResponse.ok) return torrentsResponse;
    if (!transferResponse.ok) return transferResponse;
    if (
      torrentsResponse.data.status === 403 ||
      transferResponse.data.status === 403
    ) {
      return adapterError(
        "authentication",
        "qBittorrent rejected the session",
        false,
      );
    }
    if (!torrentsResponse.data.ok || !transferResponse.data.ok) {
      return adapterError(
        "upstream",
        "qBittorrent returned an unsuccessful response",
        true,
      );
    }

    try {
      const torrents = torrentsSchema.parse(await torrentsResponse.data.json());
      const transfer = transferSchema.parse(await transferResponse.data.json());
      return {
        ok: true,
        data: {
          items: torrents.map(normalizeTorrent),
          transfer: {
            downloadSpeedBytes: transfer.dl_info_speed,
            uploadSpeedBytes: transfer.up_info_speed,
            downloadedBytes: transfer.dl_info_data,
            uploadedBytes: transfer.up_info_data,
          },
          fetchedAt: new Date(),
        },
      };
    } catch {
      return adapterError(
        "malformed-response",
        "qBittorrent returned data Arrmate could not validate",
        true,
      );
    }
  }

  private async login(): Promise<AdapterResult<string>> {
    const body = new URLSearchParams({
      username: this.config.username,
      password: this.config.password,
    });
    const response = await this.request("/api/v2/auth/login", undefined, {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    if (!response.ok) return response;
    if (response.data.status === 403) {
      return adapterError(
        "authentication",
        "qBittorrent rejected the credentials",
        false,
      );
    }

    const text = await response.data.text();
    if (!response.data.ok || text.trim() !== "Ok.") {
      return adapterError(
        "authentication",
        "qBittorrent rejected the credentials",
        false,
      );
    }
    const cookie = response.data.headers
      .get("set-cookie")
      ?.match(/SID=[^;]+/)?.[0];
    if (!cookie) {
      return adapterError(
        "malformed-response",
        "qBittorrent did not create a session",
        true,
      );
    }
    return { ok: true, data: cookie };
  }

  private async request(
    path: string,
    session?: string,
    init: RequestInit = {},
  ): Promise<AdapterResult<Response>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = new Headers(init.headers);
      headers.set("referer", this.baseUrl.toString());
      if (session) headers.set("cookie", session);
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
        return adapterError(
          "timeout",
          "qBittorrent did not respond before the timeout",
          true,
        );
      }
      return adapterError(
        "unreachable",
        "qBittorrent could not be reached",
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

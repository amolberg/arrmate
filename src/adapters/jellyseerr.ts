import { z } from "zod";

import type {
  DiscoveryItem,
  DiscoveryPage,
  DiscoveryMediaType,
  SeerrQuota,
  SeerrRequestReceipt,
  SeerrUser,
} from "@/domain/discovery";
import type {
  AdapterError,
  AdapterResult,
  CapabilitySet,
} from "@/domain/integrations";

import type { IntegrationAdapter } from "./contracts";
import { normalizeIntegrationUrl } from "./url";

const userSchema = z
  .object({
    id: z.number().int().positive(),
    displayName: z.string().optional().nullable(),
    username: z.string().optional().nullable(),
    jellyfinUsername: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    permissions: z.number().int().nonnegative().default(0),
    avatar: z.string().optional().nullable(),
  })
  .passthrough();

const mediaInfoSchema = z
  .object({
    status: z.number().int().optional().nullable(),
  })
  .passthrough()
  .optional()
  .nullable();

const searchItemSchema = z
  .object({
    id: z.number().int().positive(),
    mediaType: z.string(),
    title: z.string().optional(),
    name: z.string().optional(),
    overview: z.string().optional().default(""),
    releaseDate: z.string().optional().nullable(),
    firstAirDate: z.string().optional().nullable(),
    posterPath: z.string().optional().nullable(),
    backdropPath: z.string().optional().nullable(),
    voteAverage: z.number().optional().nullable(),
    mediaInfo: mediaInfoSchema,
  })
  .passthrough();

const searchResponseSchema = z.object({
  page: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
  results: z.array(searchItemSchema),
});

const quotaWindowSchema = z.object({
  days: z.number().nonnegative().nullable().default(null),
  limit: z.number().nonnegative().nullable().default(null),
  used: z.number().nonnegative().default(0),
  remaining: z.number().nonnegative().nullable().default(null),
  restricted: z.boolean().default(false),
});

const quotaSchema = z.object({
  movie: quotaWindowSchema,
  tv: quotaWindowSchema,
});

const requestReceiptSchema = z.object({
  id: z.number().int().positive(),
  status: z.number().int(),
});

export interface JellyseerrConfig {
  baseUrl: string;
  timeoutMs?: number;
}

export interface JellyseerrLogin {
  user: SeerrUser;
  sessionCookie: string;
}

type Fetch = typeof fetch;

function errorResult(
  code: AdapterError["code"],
  message: string,
  retryable: boolean,
): AdapterResult<never> {
  return { ok: false, error: { code, message, retryable } };
}

function normalizeUser(user: z.infer<typeof userSchema>): SeerrUser {
  return {
    id: user.id,
    displayName:
      user.displayName ||
      user.username ||
      user.jellyfinUsername ||
      user.email?.split("@")[0] ||
      "Jellyfin user",
    permissions: user.permissions,
    avatarPath: user.avatar || null,
  };
}

function normalizeSearchItem(
  item: z.infer<typeof searchItemSchema>,
): DiscoveryItem | null {
  if (item.mediaType !== "movie" && item.mediaType !== "tv") return null;
  const title = item.mediaType === "movie" ? item.title : item.name;
  if (!title) return null;
  const date =
    item.mediaType === "movie" ? item.releaseDate : item.firstAirDate;
  return {
    id: item.id,
    mediaType: item.mediaType === "movie" ? "movie" : "series",
    title,
    overview: item.overview,
    year: date?.slice(0, 4) || null,
    posterPath: item.posterPath || null,
    backdropPath: item.backdropPath || null,
    rating: typeof item.voteAverage === "number" ? item.voteAverage : null,
    availability: item.mediaInfo?.status ?? null,
  };
}

function requestStatus(status: number): SeerrRequestReceipt["status"] {
  if (status === 1) return "pending";
  if (status === 2) return "approved";
  if (status === 3) return "declined";
  return "unknown";
}

export class JellyseerrAdapter implements IntegrationAdapter {
  readonly name = "Jellyseerr";
  readonly capabilities: CapabilitySet = {
    readQueue: false,
    manageQueue: false,
    search: true,
    request: true,
    deleteMedia: false,
    replaceMedia: false,
    searchSubtitles: false,
  };

  private readonly baseUrl: URL;
  private readonly timeoutMs: number;

  constructor(
    config: JellyseerrConfig,
    private readonly fetchImpl: Fetch = fetch,
  ) {
    this.baseUrl = normalizeIntegrationUrl(config.baseUrl);
    this.timeoutMs = config.timeoutMs ?? 8_000;
  }

  async health(): Promise<AdapterResult<{ latencyMs: number }>> {
    const startedAt = performance.now();
    const response = await this.request("/api/v1/status");
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    return {
      ok: true,
      data: { latencyMs: Math.round(performance.now() - startedAt) },
    };
  }

  async login(
    username: string,
    password: string,
  ): Promise<AdapterResult<JellyseerrLogin>> {
    const response = await this.request("/api/v1/auth/jellyfin", undefined, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status, true);

    const sessionCookie = response.data.headers
      .get("set-cookie")
      ?.match(/connect\.sid=[^;]+/)?.[0];
    if (!sessionCookie) {
      return errorResult(
        "malformed-response",
        "Jellyseerr did not create a user session",
        true,
      );
    }

    try {
      const user = userSchema.parse(await response.data.json());
      return { ok: true, data: { user: normalizeUser(user), sessionCookie } };
    } catch {
      return errorResult(
        "malformed-response",
        "Jellyseerr returned an invalid user profile",
        true,
      );
    }
  }

  async search(
    query: string,
    sessionCookie: string,
    page = 1,
  ): Promise<AdapterResult<DiscoveryPage>> {
    const params = new URLSearchParams({ query, page: String(page) });
    const response = await this.request(
      `/api/v1/search?${params}`,
      sessionCookie,
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);

    try {
      const result = searchResponseSchema.parse(await response.data.json());
      return {
        ok: true,
        data: {
          page: result.page,
          totalPages: result.totalPages,
          totalResults: result.totalResults,
          items: result.results
            .map(normalizeSearchItem)
            .filter((item): item is DiscoveryItem => item !== null),
        },
      };
    } catch {
      return errorResult(
        "malformed-response",
        "Jellyseerr returned search data Arrmate could not validate",
        true,
      );
    }
  }

  async quota(
    userId: number,
    sessionCookie: string,
  ): Promise<AdapterResult<SeerrQuota>> {
    const response = await this.request(
      `/api/v1/user/${userId}/quota`,
      sessionCookie,
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const quota = quotaSchema.parse(await response.data.json());
      return {
        ok: true,
        data: { movie: quota.movie, series: quota.tv },
      };
    } catch {
      return errorResult(
        "malformed-response",
        "Jellyseerr returned invalid quota data",
        true,
      );
    }
  }

  async createRequest(
    mediaId: number,
    mediaType: DiscoveryMediaType,
    sessionCookie: string,
  ): Promise<AdapterResult<SeerrRequestReceipt>> {
    const response = await this.request("/api/v1/request", sessionCookie, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mediaId,
        mediaType: mediaType === "series" ? "tv" : "movie",
        ...(mediaType === "series" ? { seasons: "all" } : {}),
      }),
    });
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const receipt = requestReceiptSchema.parse(await response.data.json());
      return {
        ok: true,
        data: { id: receipt.id, status: requestStatus(receipt.status) },
      };
    } catch {
      return errorResult(
        "malformed-response",
        "Jellyseerr accepted the request but returned an invalid receipt",
        false,
      );
    }
  }

  async logout(sessionCookie: string): Promise<void> {
    await this.request("/api/v1/auth/logout", sessionCookie, {
      method: "POST",
    });
  }

  artworkUrl(path: string, size: "w342" | "w500" = "w342"): URL {
    if (!/^\/[A-Za-z0-9/_-]+\.(jpg|jpeg|png|webp)$/i.test(path)) {
      throw new Error("Invalid artwork path");
    }
    return new URL(
      `/imageproxy/t/p/${size}${path}`,
      `${this.baseUrl.toString()}/`,
    );
  }

  private httpError(status: number, login = false): AdapterResult<never> {
    if (status === 401 || status === 403) {
      return errorResult(
        "authentication",
        login
          ? "Jellyfin did not accept those credentials"
          : "Your Jellyseerr session is no longer valid",
        false,
      );
    }
    return errorResult(
      "upstream",
      status === 429
        ? "Jellyseerr is receiving too many requests"
        : "Jellyseerr request failed",
      status >= 500 || status === 429,
    );
  }

  private async request(
    path: string,
    sessionCookie?: string,
    init: RequestInit = {},
  ): Promise<AdapterResult<Response>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = new Headers(init.headers);
      headers.set("accept", "application/json");
      headers.set("referer", this.baseUrl.toString());
      if (sessionCookie) headers.set("cookie", sessionCookie);
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
          "Jellyseerr did not respond before the timeout",
          true,
        );
      }
      return errorResult(
        "unreachable",
        "Jellyseerr could not be reached",
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

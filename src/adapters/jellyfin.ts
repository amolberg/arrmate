import { z } from "zod";

import type {
  AdapterError,
  AdapterResult,
  CapabilitySet,
} from "@/domain/integrations";

import type { IntegrationAdapter } from "./contracts";
import { normalizeIntegrationUrl } from "./url";

const authSchema = z
  .object({
    AccessToken: z.string().min(1),
    User: z
      .object({
        Id: z.string().min(1),
        Name: z.string().min(1),
        Policy: z
          .object({ IsAdministrator: z.boolean().optional().default(false) })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

const userSchema = z
  .object({
    Id: z.string().min(1),
    Name: z.string().min(1),
    Policy: z
      .object({
        IsAdministrator: z.boolean().optional().default(false),
        IsDisabled: z.boolean().optional().default(false),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const historySchema = z
  .object({
    Name: z.string().min(1),
    Type: z.string().optional().default("Media"),
    DatePlayed: z.string().optional().nullable(),
  })
  .passthrough();

export interface JellyfinConfig {
  baseUrl: string;
  timeoutMs?: number;
}
export interface JellyfinLogin {
  token: string;
  userId: string;
  displayName: string;
  isAdministrator: boolean;
}
export interface JellyfinUser {
  id: string;
  displayName: string;
  isAdministrator: boolean;
  disabled: boolean;
}
export interface JellyfinHistoryItem {
  title: string;
  type: string;
  playedAt: string | null;
}
export interface JellyfinCreatedUser {
  id: string;
  displayName: string;
}
type Fetch = typeof fetch;

function errorResult(
  code: AdapterError["code"],
  message: string,
  retryable: boolean,
): AdapterResult<never> {
  return { ok: false, error: { code, message, retryable } };
}

export class JellyfinAdapter implements IntegrationAdapter {
  readonly name = "Jellyfin";
  readonly capabilities: CapabilitySet = {
    readQueue: false,
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
    config: JellyfinConfig,
    private readonly fetchImpl: Fetch = fetch,
  ) {
    this.baseUrl = normalizeIntegrationUrl(config.baseUrl);
    this.timeoutMs = config.timeoutMs ?? 8_000;
  }

  async health(): Promise<AdapterResult<{ latencyMs: number }>> {
    const startedAt = performance.now();
    const response = await this.request("/System/Info");
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
  ): Promise<AdapterResult<JellyfinLogin>> {
    const response = await this.request("/Users/AuthenticateByName", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-emby-authorization":
          'MediaBrowser Client="Arrmate", Device="Server", DeviceId="arrmate", Version="0.1"',
      },
      body: JSON.stringify({ Username: username, Pw: password }),
    });
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status, true);
    try {
      const result = authSchema.parse(await response.data.json());
      return {
        ok: true,
        data: {
          token: result.AccessToken,
          userId: result.User.Id,
          displayName: result.User.Name,
          isAdministrator: result.User.Policy?.IsAdministrator ?? false,
        },
      };
    } catch {
      return errorResult(
        "malformed-response",
        "Jellyfin returned an invalid authentication response",
        true,
      );
    }
  }

  async users(token: string): Promise<AdapterResult<JellyfinUser[]>> {
    const response = await this.request("/Users", {
      headers: { authorization: `MediaBrowser Token=${token}` },
    });
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const result = z.array(userSchema).parse(await response.data.json());
      return {
        ok: true,
        data: result.map((user) => ({
          id: user.Id,
          displayName: user.Name,
          isAdministrator: user.Policy?.IsAdministrator ?? false,
          disabled: user.Policy?.IsDisabled ?? false,
        })),
      };
    } catch {
      return errorResult(
        "malformed-response",
        "Jellyfin returned invalid user data",
        true,
      );
    }
  }

  async watchHistory(
    token: string,
    userId: string,
  ): Promise<AdapterResult<JellyfinHistoryItem[]>> {
    const params = new URLSearchParams({
      Filters: "IsPlayed",
      Recursive: "true",
      SortBy: "DatePlayed",
      SortOrder: "Descending",
      Limit: "50",
      Fields: "DatePlayed",
    });
    const response = await this.request(
      `/Users/${encodeURIComponent(userId)}/Items?${params}`,
      { headers: { authorization: `MediaBrowser Token=${token}` } },
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const result = z
        .object({ Items: z.array(historySchema) })
        .parse(await response.data.json());
      return {
        ok: true,
        data: result.Items.map((item) => ({
          title: item.Name,
          type: item.Type,
          playedAt: item.DatePlayed || null,
        })),
      };
    } catch {
      return errorResult(
        "malformed-response",
        "Jellyfin returned invalid watch history",
        true,
      );
    }
  }

  async createUser(
    token: string,
    displayName: string,
  ): Promise<AdapterResult<JellyfinCreatedUser>> {
    const response = await this.request("/Users/New", {
      method: "POST",
      headers: {
        authorization: `MediaBrowser Token=${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ Name: displayName }),
    });
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    try {
      const user = userSchema.parse(await response.data.json());
      return { ok: true, data: { id: user.Id, displayName: user.Name } };
    } catch {
      return errorResult(
        "malformed-response",
        "Jellyfin returned an invalid new user",
        true,
      );
    }
  }

  async setPassword(
    token: string,
    userId: string,
    password: string,
  ): Promise<AdapterResult<null>> {
    const response = await this.request(
      `/Users/${encodeURIComponent(userId)}/Password`,
      {
        method: "POST",
        headers: {
          authorization: `MediaBrowser Token=${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          CurrentPassword: null,
          CurrentPasswordSha1: null,
          NewPassword: password,
        }),
      },
    );
    if (!response.ok) return response;
    if (!response.data.ok) return this.httpError(response.data.status);
    return { ok: true, data: null };
  }

  private httpError(status: number, login = false): AdapterResult<never> {
    if (status === 401 || status === 403)
      return errorResult(
        "authentication",
        login
          ? "Jellyfin did not accept those credentials"
          : "Jellyfin rejected the session",
        false,
      );
    return errorResult(
      "upstream",
      "Jellyfin request failed",
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
        return errorResult(
          "timeout",
          "Jellyfin did not respond before the timeout",
          true,
        );
      return errorResult("unreachable", "Jellyfin could not be reached", true);
    } finally {
      clearTimeout(timeout);
    }
  }
}

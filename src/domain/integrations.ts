export const integrationKinds = [
  "media-server",
  "media-manager",
  "indexer",
  "subtitle-provider",
  "request-manager",
  "download-client",
] as const;

export type IntegrationKind = (typeof integrationKinds)[number];
export type IntegrationHealth =
  "online" | "degraded" | "offline" | "not-configured";

export type AdapterErrorCode =
  | "not-configured"
  | "authentication"
  | "timeout"
  | "unreachable"
  | "malformed-response"
  | "upstream";

export interface AdapterError {
  code: AdapterErrorCode;
  message: string;
  retryable: boolean;
}

export type AdapterResult<T> =
  { ok: true; data: T } | { ok: false; error: AdapterError };

export interface IntegrationSummary {
  id: string;
  name: string;
  kind: IntegrationKind;
  health: IntegrationHealth;
  detail: string;
  latencyMs?: number;
  checkedAt?: Date;
}

export interface CapabilitySet {
  readQueue: boolean;
  manageQueue: boolean;
  search: boolean;
  request: boolean;
  deleteMedia: boolean;
  replaceMedia: boolean;
  searchSubtitles: boolean;
}

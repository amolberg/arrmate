import type { DownloadOverview } from "@/domain/downloads";
import type { AdapterResult, CapabilitySet } from "@/domain/integrations";

export interface IntegrationAdapter {
  readonly name: string;
  readonly capabilities: CapabilitySet;
  health(): Promise<AdapterResult<{ latencyMs: number }>>;
}

export interface DownloadClientAdapter extends IntegrationAdapter {
  overview(): Promise<AdapterResult<DownloadOverview>>;
}

export type MediaServerAdapter = IntegrationAdapter;
export type MediaManagerAdapter = IntegrationAdapter;
export type IndexerAdapter = IntegrationAdapter;
export type SubtitleProviderAdapter = IntegrationAdapter;

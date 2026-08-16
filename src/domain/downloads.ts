export type DownloadState =
  | "downloading"
  | "queued"
  | "paused"
  | "seeding"
  | "checking"
  | "stalled"
  | "error"
  | "complete"
  | "unknown";

export interface DownloadItem {
  id: string;
  name: string;
  progress: number;
  state: DownloadState;
  downloadSpeedBytes: number;
  uploadSpeedBytes: number;
  sizeBytes: number;
  etaSeconds: number | null;
  ratio: number;
  category: string | null;
}

export interface TransferStats {
  downloadSpeedBytes: number;
  uploadSpeedBytes: number;
  downloadedBytes: number;
  uploadedBytes: number;
}

export interface DownloadOverview {
  items: DownloadItem[];
  transfer: TransferStats;
  fetchedAt: Date;
}

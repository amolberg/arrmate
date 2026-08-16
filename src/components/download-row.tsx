import { ArrowDown, Clock3 } from "lucide-react";

import type { DownloadItem } from "@/domain/downloads";

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatEta(seconds: number | null): string {
  if (seconds === null) return "No ETA";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}

export function DownloadRow({ item }: { item: DownloadItem }) {
  const percentage = Math.round(item.progress * 100);
  return (
    <article className="download-row">
      <div className="download-main">
        <div className="download-title-line">
          <strong title={item.name}>{item.name}</strong>
          <span>{percentage}%</span>
        </div>
        <div
          className="progress-track"
          aria-label={`${percentage}% downloaded`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
        <div className="download-meta">
          <span className={`state-label state-${item.state}`}>
            {item.state}
          </span>
          <span>
            <ArrowDown size={13} aria-hidden="true" />
            {formatBytes(item.downloadSpeedBytes)}/s
          </span>
          <span>
            <Clock3 size={13} aria-hidden="true" />
            {formatEta(item.etaSeconds)}
          </span>
        </div>
      </div>
    </article>
  );
}

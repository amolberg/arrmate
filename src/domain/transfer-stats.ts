export interface TransferSnapshot {
  sampledAt: Date;
  downloadedBytes: number;
  uploadedBytes: number;
}

export interface TransferPeriodStats {
  downloadedBytes: number;
  uploadedBytes: number;
  sampleCount: number;
}

/** Calculates counter deltas and treats a counter decrease as a client reset. */
export function aggregateTransferStats(
  snapshots: TransferSnapshot[],
  since: Date,
  until = new Date(),
): TransferPeriodStats {
  const samples = snapshots
    .filter((sample) => sample.sampledAt >= since && sample.sampledAt <= until)
    .sort((a, b) => a.sampledAt.getTime() - b.sampledAt.getTime());
  let downloadedBytes = 0;
  let uploadedBytes = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    downloadedBytes +=
      current.downloadedBytes >= previous.downloadedBytes
        ? current.downloadedBytes - previous.downloadedBytes
        : current.downloadedBytes;
    uploadedBytes +=
      current.uploadedBytes >= previous.uploadedBytes
        ? current.uploadedBytes - previous.uploadedBytes
        : current.uploadedBytes;
  }
  return { downloadedBytes, uploadedBytes, sampleCount: samples.length };
}

export function periodStart(
  now: Date,
  period: "day" | "week" | "month" | "year",
): Date {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  if (period === "day") return start;
  if (period === "week") {
    const weekday = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
    return start;
  }
  if (period === "month") {
    start.setUTCDate(1);
    return start;
  }
  start.setUTCMonth(0, 1);
  return start;
}

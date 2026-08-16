import { describe, expect, it } from "vitest";

import { aggregateTransferStats, periodStart } from "./transfer-stats";

describe("transfer statistics", () => {
  it("aggregates cumulative counters into deltas", () => {
    const now = new Date("2026-08-16T12:00:00Z");
    expect(
      aggregateTransferStats(
        [
          {
            sampledAt: new Date("2026-08-16T10:00:00Z"),
            downloadedBytes: 100,
            uploadedBytes: 20,
          },
          {
            sampledAt: new Date("2026-08-16T11:00:00Z"),
            downloadedBytes: 250,
            uploadedBytes: 50,
          },
          { sampledAt: now, downloadedBytes: 400, uploadedBytes: 80 },
        ],
        new Date("2026-08-16T00:00:00Z"),
        now,
      ),
    ).toEqual({ downloadedBytes: 300, uploadedBytes: 60, sampleCount: 3 });
  });

  it("treats a qBittorrent counter reset as a new baseline", () => {
    const result = aggregateTransferStats(
      [
        {
          sampledAt: new Date("2026-08-16T10:00:00Z"),
          downloadedBytes: 900,
          uploadedBytes: 500,
        },
        {
          sampledAt: new Date("2026-08-16T11:00:00Z"),
          downloadedBytes: 40,
          uploadedBytes: 10,
        },
      ],
      new Date("2026-08-16T00:00:00Z"),
      new Date("2026-08-16T12:00:00Z"),
    );
    expect(result).toMatchObject({ downloadedBytes: 40, uploadedBytes: 10 });
  });

  it("starts week periods on Monday in UTC", () => {
    expect(
      periodStart(new Date("2026-08-16T12:00:00Z"), "week").toISOString(),
    ).toBe("2026-08-10T00:00:00.000Z");
  });
});

import type { MediaType, RequestLimit } from "./requests";

export interface QuotaReservation {
  allowed: boolean;
  remaining: number;
  resetsAt: Date;
  limitingWindow: "hour" | "day";
}

export interface QuotaStore {
  reserve(
    userId: string,
    mediaType: MediaType,
    now?: Date,
  ): Promise<QuotaReservation>;
}

interface Bucket {
  used: number;
  resetAt: Date;
}

function windowStart(now: Date, window: "hour" | "day"): Date {
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  if (window === "day") start.setUTCHours(0);
  return start;
}

function nextWindow(start: Date, window: "hour" | "day"): Date {
  const reset = new Date(start);
  if (window === "hour") reset.setUTCHours(reset.getUTCHours() + 1);
  else reset.setUTCDate(reset.getUTCDate() + 1);
  return reset;
}

/**
 * A deterministic development/test repository. Production uses the SQL
 * repository so quota increments and request creation share one transaction.
 */
export class InMemoryQuotaStore implements QuotaStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly limits: RequestLimit[]) {}

  async reserve(
    userId: string,
    mediaType: MediaType,
    now = new Date(),
  ): Promise<QuotaReservation> {
    const active = this.limits.filter(
      (limit) => limit.userId === userId && limit.mediaType === mediaType,
    );

    if (active.length === 0) {
      return {
        allowed: true,
        remaining: Number.POSITIVE_INFINITY,
        resetsAt: nextWindow(windowStart(now, "day"), "day"),
        limitingWindow: "day",
      };
    }

    const states = active.map((limit) => {
      const start = windowStart(now, limit.window);
      const key = `${userId}:${mediaType}:${limit.window}:${start.toISOString()}`;
      const bucket = this.buckets.get(key) ?? {
        used: 0,
        resetAt: nextWindow(start, limit.window),
      };
      return { limit, key, bucket };
    });

    const blocked = states.find(
      ({ limit, bucket }) => bucket.used >= limit.maximum,
    );
    if (blocked) {
      return {
        allowed: false,
        remaining: 0,
        resetsAt: blocked.bucket.resetAt,
        limitingWindow: blocked.limit.window,
      };
    }

    for (const { key, bucket } of states) {
      this.buckets.set(key, { ...bucket, used: bucket.used + 1 });
    }

    const limiting = states.reduce((current, candidate) => {
      const currentRemaining = current.limit.maximum - current.bucket.used - 1;
      const candidateRemaining =
        candidate.limit.maximum - candidate.bucket.used - 1;
      return candidateRemaining < currentRemaining ? candidate : current;
    });

    return {
      allowed: true,
      remaining: limiting.limit.maximum - limiting.bucket.used - 1,
      resetsAt: limiting.bucket.resetAt,
      limitingWindow: limiting.limit.window,
    };
  }
}

import "server-only";

import type { QuotaReservation, QuotaStore } from "@/domain/quota";
import type { MediaType } from "@/domain/requests";

import { sqlClient } from "./client";

class QuotaBlocked extends Error {
  constructor(
    readonly resetAt: Date,
    readonly window: "hour" | "day",
  ) {
    super("Request quota reached");
  }
}

function bucket(now: Date, window: "hour" | "day") {
  const startedAt = new Date(now);
  startedAt.setUTCMinutes(0, 0, 0);
  if (window === "day") startedAt.setUTCHours(0);
  const resetAt = new Date(startedAt);
  if (window === "hour") resetAt.setUTCHours(resetAt.getUTCHours() + 1);
  else resetAt.setUTCDate(resetAt.getUTCDate() + 1);
  return { startedAt, resetAt };
}

/** Atomically increments every active quota window in one SQL transaction. */
export class PostgresQuotaStore implements QuotaStore {
  async reserve(
    userId: string,
    mediaType: MediaType,
    now = new Date(),
  ): Promise<QuotaReservation> {
    const sql = sqlClient();

    try {
      return await sql.begin(async (transaction) => {
        const limits = await transaction<
          { window: "hour" | "day"; maximum: number }[]
        >`
          select window, maximum
          from request_limits
          where user_id = ${userId} and media_type = ${mediaType}
          order by window asc
        `;

        if (limits.length === 0) {
          const { resetAt } = bucket(now, "day");
          return {
            allowed: true,
            remaining: Number.POSITIVE_INFINITY,
            resetsAt: resetAt,
            limitingWindow: "day" as const,
          };
        }

        const reservations: {
          window: "hour" | "day";
          maximum: number;
          used: number;
          resetAt: Date;
        }[] = [];

        for (const limit of limits) {
          const { startedAt, resetAt } = bucket(now, limit.window);
          if (limit.maximum <= 0) throw new QuotaBlocked(resetAt, limit.window);

          const rows = await transaction<{ used: number }[]>`
            insert into quota_usage (user_id, media_type, window, window_started_at, used)
            values (${userId}, ${mediaType}, ${limit.window}, ${startedAt}, 1)
            on conflict (user_id, media_type, window, window_started_at)
            do update set used = quota_usage.used + 1
            where quota_usage.used < ${limit.maximum}
            returning used
          `;
          if (rows.length === 0) throw new QuotaBlocked(resetAt, limit.window);
          reservations.push({ ...limit, used: rows[0].used, resetAt });
        }

        const limiting = reservations.reduce((current, candidate) =>
          candidate.maximum - candidate.used < current.maximum - current.used
            ? candidate
            : current,
        );
        return {
          allowed: true,
          remaining: limiting.maximum - limiting.used,
          resetsAt: limiting.resetAt,
          limitingWindow: limiting.window,
        };
      });
    } catch (error) {
      if (error instanceof QuotaBlocked) {
        return {
          allowed: false,
          remaining: 0,
          resetsAt: error.resetAt,
          limitingWindow: error.window,
        };
      }
      throw error;
    }
  }
}

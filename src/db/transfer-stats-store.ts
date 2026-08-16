import "server-only";

import { and, gte, lte } from "drizzle-orm";

import type { TransferSnapshot } from "@/domain/transfer-stats";

import { database } from "./client";
import { transferSnapshots } from "./schema";

const memorySnapshots: TransferSnapshot[] = [];

export async function recordTransferSnapshot(
  snapshot: TransferSnapshot,
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    memorySnapshots.push(snapshot);
    return;
  }
  await database().insert(transferSnapshots).values({
    sampledAt: snapshot.sampledAt,
    downloadedBytes: snapshot.downloadedBytes,
    uploadedBytes: snapshot.uploadedBytes,
  });
}

export async function readTransferSnapshots(
  since: Date,
  until = new Date(),
): Promise<TransferSnapshot[]> {
  if (!process.env.DATABASE_URL) {
    return memorySnapshots.filter(
      (sample) => sample.sampledAt >= since && sample.sampledAt <= until,
    );
  }
  const rows = await database()
    .select({
      sampledAt: transferSnapshots.sampledAt,
      downloadedBytes: transferSnapshots.downloadedBytes,
      uploadedBytes: transferSnapshots.uploadedBytes,
    })
    .from(transferSnapshots)
    .where(
      and(
        gte(transferSnapshots.sampledAt, since),
        lte(transferSnapshots.sampledAt, until),
      ),
    )
    .orderBy(transferSnapshots.sampledAt);
  return rows;
}

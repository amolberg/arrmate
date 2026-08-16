import "server-only";

import { sql } from "drizzle-orm";

import { database } from "./client";
import { auditEvents } from "./schema";

const memoryAudit: unknown[] = [];

export async function assertAuditAvailable(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await database().execute(sql`select 1`);
}

export async function recordSystemAudit(input: {
  action: string;
  targetType: string;
  targetId: string;
  outcome: "success" | "denied" | "failed";
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  if (!process.env.DATABASE_URL) {
    memoryAudit.push({ ...input, createdAt: new Date() });
    return;
  }
  await database()
    .insert(auditEvents)
    .values({
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      outcome: input.outcome,
      metadata: input.metadata ?? {},
    });
}

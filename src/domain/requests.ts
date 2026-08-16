export const mediaTypes = ["movie", "series"] as const;
export type MediaType = (typeof mediaTypes)[number];

export const requestStatuses = [
  "pending",
  "approved",
  "available",
  "declined",
  "failed",
] as const;
export type RequestStatus = (typeof requestStatuses)[number];

export interface MediaRequest {
  id: string;
  requestedBy: string;
  mediaType: MediaType;
  externalId: string;
  title: string;
  status: RequestStatus;
  createdAt: Date;
}

export interface RequestLimit {
  userId: string;
  mediaType: MediaType;
  window: "hour" | "day";
  maximum: number;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: "success" | "denied" | "failed";
  metadata: Record<string, string | number | boolean | null>;
  createdAt: Date;
}

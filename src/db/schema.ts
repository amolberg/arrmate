import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "owner",
  "maintainer",
  "requester",
  "guest",
]);
export const mediaTypeEnum = pgEnum("media_type", ["movie", "series"]);
export const quotaWindowEnum = pgEnum("quota_window", ["hour", "day"]);
export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "available",
  "declined",
  "failed",
]);
export const integrationHealthEnum = pgEnum("integration_health", [
  "online",
  "degraded",
  "offline",
  "not-configured",
]);
export const auditOutcomeEnum = pgEnum("audit_outcome", [
  "success",
  "denied",
  "failed",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: roleEnum("role").notNull().default("requester"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const requestLimits = pgTable(
  "request_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaType: mediaTypeEnum("media_type").notNull(),
    window: quotaWindowEnum("window").notNull(),
    maximum: integer("maximum").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("request_limits_scope_unique").on(
      table.userId,
      table.mediaType,
      table.window,
    ),
  ],
);

export const quotaUsage = pgTable(
  "quota_usage",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaType: mediaTypeEnum("media_type").notNull(),
    window: quotaWindowEnum("window").notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    used: integer("used").notNull().default(0),
  },
  (table) => [
    primaryKey({
      name: "quota_usage_scope_pk",
      columns: [
        table.userId,
        table.mediaType,
        table.window,
        table.windowStartedAt,
      ],
    }),
  ],
);

export const mediaRequests = pgTable(
  "media_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    mediaType: mediaTypeEnum("media_type").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    status: requestStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("media_requests_user_created_idx").on(
      table.requestedBy,
      table.createdAt,
    ),
    uniqueIndex("media_requests_user_media_unique").on(
      table.requestedBy,
      table.mediaType,
      table.externalId,
    ),
  ],
);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    baseUrl: text("base_url").notNull(),
    encryptedCredential: text("encrypted_credential").notNull(),
    health: integrationHealthEnum("health").notNull().default("not-configured"),
    capabilities: jsonb("capabilities").notNull().default({}),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("integrations_name_unique").on(table.name)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    outcome: auditOutcomeEnum("outcome").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_events_actor_created_idx").on(table.actorId, table.createdAt),
  ],
);

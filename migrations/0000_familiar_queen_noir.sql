CREATE TYPE "public"."audit_outcome" AS ENUM('success', 'denied', 'failed');--> statement-breakpoint
CREATE TYPE "public"."integration_health" AS ENUM('online', 'degraded', 'offline', 'not-configured');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('movie', 'series');--> statement-breakpoint
CREATE TYPE "public"."quota_window" AS ENUM('hour', 'day');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'available', 'declined', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'maintainer', 'requester', 'guest');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"outcome" "audit_outcome" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"base_url" text NOT NULL,
	"encrypted_credential" text NOT NULL,
	"health" "integration_health" DEFAULT 'not-configured' NOT NULL,
	"capabilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by" uuid NOT NULL,
	"media_type" "media_type" NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quota_usage" (
	"user_id" uuid NOT NULL,
	"media_type" "media_type" NOT NULL,
	"window" "quota_window" NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "quota_usage_scope_pk" PRIMARY KEY("user_id","media_type","window","window_started_at")
);
--> statement-breakpoint
CREATE TABLE "request_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_type" "media_type" NOT NULL,
	"window" "quota_window" NOT NULL,
	"maximum" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "role" DEFAULT 'requester' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_requests" ADD CONSTRAINT "media_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_usage" ADD CONSTRAINT "quota_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_limits" ADD CONSTRAINT "request_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_actor_created_idx" ON "audit_events" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_name_unique" ON "integrations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "media_requests_user_created_idx" ON "media_requests" USING btree ("requested_by","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_requests_user_media_unique" ON "media_requests" USING btree ("requested_by","media_type","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "request_limits_scope_unique" ON "request_limits" USING btree ("user_id","media_type","window");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");
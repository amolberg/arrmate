CREATE TABLE IF NOT EXISTS "transfer_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sampled_at" timestamp with time zone NOT NULL,
	"downloaded_bytes" bigint NOT NULL,
	"uploaded_bytes" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_snapshots_sampled_idx" ON "transfer_snapshots" USING btree ("sampled_at");

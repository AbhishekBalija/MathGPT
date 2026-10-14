CREATE TABLE "alert_state" (
	"kind" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"recent" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consecutive" integer DEFAULT 0 NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sent_at" timestamp with time zone,
	CONSTRAINT "alert_state_status_valid" CHECK ("alert_state"."status" in ('ok', 'failing'))
);
--> statement-breakpoint
ALTER TABLE "error_logs" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_team" boolean DEFAULT false NOT NULL;
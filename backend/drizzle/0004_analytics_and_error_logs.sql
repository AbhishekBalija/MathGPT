CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"user_id" uuid,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"error_code" text NOT NULL,
	"error_message" text NOT NULL,
	"problem_text" text NOT NULL,
	"user_id" uuid,
	"processing_time_ms" integer,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_event_name_created_at_idx" ON "analytics_events" USING btree ("event_name","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "error_logs_resolved_created_at_idx" ON "error_logs" USING btree ("resolved","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "error_logs_error_code_idx" ON "error_logs" USING btree ("error_code");--> statement-breakpoint
CREATE INDEX "error_logs_user_id_idx" ON "error_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "error_logs_resolved_by_idx" ON "error_logs" USING btree ("resolved_by");
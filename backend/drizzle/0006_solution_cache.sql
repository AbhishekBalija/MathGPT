CREATE TABLE "solution_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"problem_type" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'unchecked' NOT NULL,
	"check_method" text,
	"checked_by" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solution_cache_status_valid" CHECK ("solution_cache"."status" in ('unchecked', 'shared', 'blocked')),
	CONSTRAINT "solution_cache_check_method_valid" CHECK ("solution_cache"."check_method" is null or "solution_cache"."check_method" in ('code', 'second-model'))
);
--> statement-breakpoint
ALTER TABLE "solutions" ADD COLUMN "cache_key" text;
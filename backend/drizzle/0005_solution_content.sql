ALTER TABLE "solutions" ADD COLUMN "content" jsonb;--> statement-breakpoint
ALTER TABLE "solutions" ADD COLUMN "format_version" integer DEFAULT 1 NOT NULL;
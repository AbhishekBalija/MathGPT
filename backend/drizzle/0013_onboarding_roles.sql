ALTER TABLE "users" DROP CONSTRAINT "users_class_range_valid";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "class_ranges" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "class_range";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "helping";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_valid" CHECK ("users"."role" is null or "users"."role" in ('student', 'parent', 'teacher'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_class_ranges_valid" CHECK ("users"."class_ranges" <@ array['class_1_5', 'class_6_8', 'class_9_10', 'class_11_12', 'college']::text[]);
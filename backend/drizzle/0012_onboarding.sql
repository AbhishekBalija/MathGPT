ALTER TABLE "users" ADD COLUMN "class_range" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "helping" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "board" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "board_state" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "institution" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "class_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_skipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_class_range_valid" CHECK ("users"."class_range" is null or "users"."class_range" in ('class_1_5', 'class_6_8', 'class_9_10', 'class_11_12', 'college'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_board_valid" CHECK ("users"."board" is null or "users"."board" in ('cbse', 'icse', 'state', 'ib', 'cambridge', 'other'));
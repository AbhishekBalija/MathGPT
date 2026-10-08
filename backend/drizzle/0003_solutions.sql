CREATE TABLE "solutions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" text,
	"problem" text NOT NULL,
	"problem_type" text NOT NULL,
	"steps" jsonb NOT NULL,
	"final_answer" text NOT NULL,
	"summary" text NOT NULL,
	"processing_time_ms" integer NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solutions_user_id_created_at_idx" ON "solutions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "solutions_problem_type_idx" ON "solutions" USING btree ("problem_type");
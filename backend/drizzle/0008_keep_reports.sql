ALTER TABLE "solution_reports" DROP CONSTRAINT "solution_reports_solution_id_solutions_id_fk";
--> statement-breakpoint
ALTER TABLE "solution_reports" ALTER COLUMN "solution_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "solution_reports" ADD COLUMN "problem_text" text;--> statement-breakpoint
ALTER TABLE "solution_reports" ADD COLUMN "answer_text" text;--> statement-breakpoint
ALTER TABLE "solution_reports" ADD COLUMN "cache_key" text;--> statement-breakpoint
ALTER TABLE "solution_reports" ADD CONSTRAINT "solution_reports_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE set null ON UPDATE no action;
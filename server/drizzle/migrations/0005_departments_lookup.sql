CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_department_name" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "job_titles" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "pips" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pips" ADD CONSTRAINT "pips_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
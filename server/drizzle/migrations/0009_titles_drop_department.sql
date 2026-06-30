ALTER TABLE "job_titles" DROP CONSTRAINT "job_titles_department_id_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "job_titles" DROP COLUMN "department_id";--> statement-breakpoint
ALTER TABLE "job_titles" DROP COLUMN "department";
CREATE TABLE "job_titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"level" varchar(60),
	"department" varchar(120),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_job_title" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "pip_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pip_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"label" varchar(200) NOT NULL,
	"checkin_date" date,
	"attendees" varchar(300),
	"notes" text,
	"status" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pip_concerns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pip_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"area" varchar(300) NOT NULL,
	"observations" text,
	"expectation" text,
	"previously_raised" varchar(400),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pip_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pip_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" varchar(400) NOT NULL,
	"success_criteria" text,
	"measurement" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pip_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pip_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"role" varchar(24) NOT NULL,
	"signer_name" varchar(200),
	"signed_by_id" uuid,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pip_supports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pip_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"support" varchar(400) NOT NULL,
	"owner" varchar(200),
	"cadence" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid,
	"manager_id" uuid,
	"hr_partner_id" uuid,
	"job_title_id" uuid,
	"team" varchar(200),
	"duration_days" integer DEFAULT 60 NOT NULL,
	"start_date" date,
	"midpoint_date" date,
	"final_review_date" date,
	"purpose" text,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"activated_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"outcome_met" text,
	"outcome_not_met" text,
	"employee_comments" text,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pip_checkins" ADD CONSTRAINT "pip_checkins_pip_id_pips_id_fk" FOREIGN KEY ("pip_id") REFERENCES "public"."pips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pip_concerns" ADD CONSTRAINT "pip_concerns_pip_id_pips_id_fk" FOREIGN KEY ("pip_id") REFERENCES "public"."pips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pip_goals" ADD CONSTRAINT "pip_goals_pip_id_pips_id_fk" FOREIGN KEY ("pip_id") REFERENCES "public"."pips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pip_signatures" ADD CONSTRAINT "pip_signatures_pip_id_pips_id_fk" FOREIGN KEY ("pip_id") REFERENCES "public"."pips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pip_signatures" ADD CONSTRAINT "pip_signatures_signed_by_id_users_id_fk" FOREIGN KEY ("signed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pip_supports" ADD CONSTRAINT "pip_supports_pip_id_pips_id_fk" FOREIGN KEY ("pip_id") REFERENCES "public"."pips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pips" ADD CONSTRAINT "pips_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pips" ADD CONSTRAINT "pips_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pips" ADD CONSTRAINT "pips_hr_partner_id_users_id_fk" FOREIGN KEY ("hr_partner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pips" ADD CONSTRAINT "pips_job_title_id_job_titles_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_titles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pips" ADD CONSTRAINT "pips_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pips" ADD CONSTRAINT "pips_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
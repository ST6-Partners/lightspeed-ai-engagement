-- 0018 Org Screen (Stage 2) — Assessments + Review. Hand-cleaned to match the
-- 0016 convention: only the genuinely-new DDL, fully idempotent. All tables
-- key to users.id (reuse the existing table, consistent with Stage 1). Store
-- comp INPUTS on review_cycles; the dollar rows are derived at render.

-- ---- Assessments ----
CREATE TABLE IF NOT EXISTS "assessment_summaries" (
	"user_id" uuid PRIMARY KEY REFERENCES "public"."users"("id") ON DELETE cascade,
	"ccat_color" varchar(16),
	"epp_color" varchar(16),
	"epp_profile" text,
	"epp_score" numeric,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "assessment_ccat_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"label" text NOT NULL,
	"score" numeric,
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ccat_sections_user" ON "assessment_ccat_sections" USING btree ("user_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "assessment_epp_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"name" text NOT NULL,
	"st6_score" numeric,
	"epp_score" numeric,
	"final_score" numeric,
	"weightage" numeric,
	"color_hex" varchar(9),
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_epp_attrs_user" ON "assessment_epp_attributes" USING btree ("user_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "assessment_insight_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"color" varchar(16),
	"conscious_score" numeric,
	"less_conscious_score" numeric,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_insight_profiles_user" ON "assessment_insight_profiles" USING btree ("user_id");--> statement-breakpoint

-- ---- Review (comp inputs stored; dollars derived at render) ----
CREATE TABLE IF NOT EXISTS "review_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"label" text NOT NULL,
	"status" varchar(16),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"score_total" numeric,
	"score_values" numeric,
	"score_performance" numeric,
	"rank" integer,
	"rank_of" integer,
	"tier" text,
	"start_base" numeric,
	"start_bonus_pct" numeric,
	"merit_base_pct" numeric,
	"has_promotion" boolean DEFAULT false NOT NULL,
	"final_salary_increase" numeric,
	"final_new_ote" numeric
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_review_cycles_user" ON "review_cycles" USING btree ("user_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "review_value_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL REFERENCES "public"."review_cycles"("id") ON DELETE cascade,
	"name" text NOT NULL,
	"score" numeric,
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_review_value_cycle" ON "review_value_details" USING btree ("cycle_id");

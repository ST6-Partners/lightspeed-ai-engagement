CREATE TABLE "exit_surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_name" varchar(200) NOT NULL,
	"subject_role" varchar(200),
	"manager_name" varchar(200),
	"exit_type" varchar(8) DEFAULT 'vol' NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"surprise_employee" integer,
	"surprise_manager" integer,
	"part_a" jsonb,
	"part_b" jsonb,
	"left_on" date,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okr_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"type" varchar(16) NOT NULL,
	"title" varchar(400) NOT NULL,
	"owner" varchar(200),
	"status" varchar(24) DEFAULT 'not_started' NOT NULL,
	"light" varchar(8),
	"due_date" date,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"priorities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"wins" text,
	"blockers" text,
	"mood" integer,
	"pulse_answer" varchar(24),
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_user_week" UNIQUE("user_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "exit_surveys" ADD CONSTRAINT "exit_surveys_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_nodes" ADD CONSTRAINT "okr_nodes_parent_id_okr_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."okr_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_checkins" ADD CONSTRAINT "weekly_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Seed: sample OKR tree (objectives → key results → tasks). Idempotent.
INSERT INTO "okr_nodes" ("id","parent_id","type","title","owner","status","light","due_date","sort_order","description") VALUES
  ('11111111-1111-4111-8111-111111111111', NULL, 'objective', 'Ship AI into the core product', 'Brooke Friedman', 'in_progress', 'yellow', '2026-09-30', 10, 'Embed AI capabilities into the flagship product surfaces customers use daily.'),
  ('22222222-2222-4222-8222-222222222221', NULL, 'objective', 'Build the AI go-to-market motion', 'Josh Poirier', 'in_progress', 'green', '2026-11-30', 20, 'Stand up the sales and marketing motion for AI-native positioning.')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "okr_nodes" ("id","parent_id","type","title","owner","status","light","due_date","sort_order","description") VALUES
  ('11111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', 'key_result', 'AI assist adopted by 60% of weekly actives', 'Charles Harris', 'in_progress', 'yellow', '2026-08-29', 10, 'Drive adoption of inline AI assist across the editor.'),
  ('11111111-1111-4111-8111-111111111115', '11111111-1111-4111-8111-111111111111', 'key_result', 'Reduce AI response latency below 800ms p95', 'Marius Meissner', 'on_hold', 'red', '2026-07-31', 20, 'Cut tail latency so AI feels instant.'),
  ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222221', 'key_result', 'AI-native messaging live across all channels', 'Crystal Fischer', 'complete', 'green', '2026-05-15', 10, 'Refresh site, decks, and outbound around AI-native.')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "okr_nodes" ("id","parent_id","type","title","owner","status","light","sort_order","description") VALUES
  ('11111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111112', 'task', 'Inline assist entry points in editor toolbar', 'Danny Lee', 'complete', NULL, 10, 'Add discoverable AI entry points to the main toolbar.'),
  ('11111111-1111-4111-8111-111111111114', '11111111-1111-4111-8111-111111111112', 'task', 'Onboarding tour highlighting AI assist', 'Vixey Douglas', 'in_progress', NULL, 20, 'First-run tour that surfaces the AI assist feature.')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
-- Seed: sample exit surveys for the HR comparison read. Idempotent.
INSERT INTO "exit_surveys" ("id","subject_name","subject_role","manager_name","exit_type","status","surprise_employee","surprise_manager","left_on") VALUES
  ('33333333-3333-4333-8333-333333333331', 'Jordan Reyes', 'Senior Analyst', 'Pat Doyle', 'vol', 'complete', 2, 5, '2026-06-12'),
  ('33333333-3333-4333-8333-333333333332', 'Andre Olsen', 'Designer', 'Sam Lee', 'vol', 'complete', 4, 4, '2026-05-30'),
  ('33333333-3333-4333-8333-333333333333', 'Riya Tran', 'Engineer', 'Dana Cole', 'invol', 'complete', 5, 2, '2026-06-18')
ON CONFLICT ("id") DO NOTHING;

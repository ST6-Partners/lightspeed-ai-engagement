-- 0016 Org Screen (Stage 1). Hand-cleaned from drizzle-kit generate: only the
-- genuinely-new DDL is kept (the generator re-emitted already-live 0010–0015
-- tables due to stale meta snapshots). Idempotent to match the repo convention.

-- Additive columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leader_badge" varchar(8);--> statement-breakpoint
ALTER TABLE "okr_nodes" ADD COLUMN IF NOT EXISTS "owner_user_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "okr_nodes" ADD CONSTRAINT "okr_nodes_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- Priorities (per-person current-priority pointer)
CREATE TABLE IF NOT EXISTS "priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"week_start" date,
	"item_type" varchar(16) NOT NULL,
	"okr_node_id" uuid REFERENCES "public"."okr_nodes"("id") ON DELETE set null,
	"ktbr_label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_priorities_emp_week" ON "priorities" USING btree ("user_id","week_start");--> statement-breakpoint

-- 9 Box ratings (1..9 numpad-encoded; latest-by-date wins)
CREATE TABLE IF NOT EXISTS "nine_box_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"box" smallint NOT NULL,
	"rated_at" date DEFAULT now() NOT NULL,
	"rated_by" uuid REFERENCES "public"."users"("id") ON DELETE set null,
	"note" text,
	CONSTRAINT "nine_box_box_range" CHECK ("box" between 1 and 9)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ninebox_emp" ON "nine_box_ratings" USING btree ("user_id","rated_at");--> statement-breakpoint

-- Engagement snapshots (headline thriving / flight-risk per person)
CREATE TABLE IF NOT EXISTS "engagement_snapshots" (
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"as_of" date NOT NULL,
	"score" integer,
	"drivers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "engagement_snapshots_user_id_as_of_pk" PRIMARY KEY("user_id","as_of")
);

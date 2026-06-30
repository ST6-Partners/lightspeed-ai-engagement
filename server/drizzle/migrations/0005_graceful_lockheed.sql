CREATE TABLE "commits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekly_plan_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"plan_item_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"category" varchar(20) DEFAULT 'strategic' NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"owner_id" uuid,
	"start_date" date,
	"due_date" date,
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"spirit" text,
	"problem" text,
	"measure" text,
	"target" varchar(255),
	"forecast" text,
	"stoplight_current" varchar(12),
	"stoplight_forecast" varchar(12),
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_item_id" uuid NOT NULL,
	"priority_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_user_priority" UNIQUE("user_id","plan_item_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"wins" text,
	"challenges" text,
	"mood" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_user_week" UNIQUE("user_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "commits" ADD CONSTRAINT "commits_weekly_plan_id_weekly_plans_id_fk" FOREIGN KEY ("weekly_plan_id") REFERENCES "public"."weekly_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commits" ADD CONSTRAINT "commits_plan_item_id_plan_items_id_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."plan_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_parent_id_plan_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_priorities" ADD CONSTRAINT "user_priorities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_priorities" ADD CONSTRAINT "user_priorities_plan_item_id_plan_items_id_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
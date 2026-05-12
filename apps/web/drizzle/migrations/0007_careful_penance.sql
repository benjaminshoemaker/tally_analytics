CREATE TABLE "analytics_task_status_events" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"task_id" varchar(24) NOT NULL,
	"project_id" varchar(20) NOT NULL,
	"user_id" uuid NOT NULL,
	"from_status" varchar(40),
	"to_status" varchar(40) NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(80),
	"reason" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_task_status_events_actor_type_check" CHECK ("analytics_task_status_events"."actor_type" in ('user','agent','system')),
	CONSTRAINT "analytics_task_status_events_to_status_check" CHECK ("analytics_task_status_events"."to_status" in (
        'pending',
        'in_progress',
        'implemented_locally',
        'awaiting_deploy',
        'verified',
        'failed',
        'cancelled',
        'archived',
        'duplicate'
      )),
	CONSTRAINT "analytics_task_status_events_from_status_check" CHECK ("analytics_task_status_events"."from_status" is null or "analytics_task_status_events"."from_status" in (
        'pending',
        'in_progress',
        'implemented_locally',
        'awaiting_deploy',
        'verified',
        'failed',
        'cancelled',
        'archived',
        'duplicate'
      ))
);
--> statement-breakpoint
CREATE TABLE "analytics_tasks" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"project_id" varchar(20) NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(40) DEFAULT 'pending' NOT NULL,
	"task_type" varchar(40) NOT NULL,
	"title" varchar(180) NOT NULL,
	"original_question" text NOT NULL,
	"answer_kind" varchar(40) NOT NULL,
	"answer_summary" text,
	"analytics_gap" text,
	"event_name" varchar(100) NOT NULL,
	"trigger_description" text NOT NULL,
	"properties_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"target_surface" text,
	"implementation_guidance" text,
	"verification_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verification_source" varchar(40) DEFAULT 'production_event' NOT NULL,
	"duplicate_fingerprint" varchar(64),
	"duplicate_of_task_id" varchar(24),
	"local_verification" jsonb,
	"implementation_fingerprint" varchar(64),
	"last_error" text,
	"confirmed_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"implemented_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_tasks_status_check" CHECK ("analytics_tasks"."status" in (
        'pending',
        'in_progress',
        'implemented_locally',
        'awaiting_deploy',
        'verified',
        'failed',
        'cancelled',
        'archived',
        'duplicate'
      )),
	CONSTRAINT "analytics_tasks_task_type_check" CHECK ("analytics_tasks"."task_type" in ('track_completion','track_click','add_event_property')),
	CONSTRAINT "analytics_tasks_answer_kind_check" CHECK ("analytics_tasks"."answer_kind" in ('answered','partial_answer','cannot_answer_yet','unsupported')),
	CONSTRAINT "analytics_tasks_verification_source_check" CHECK ("analytics_tasks"."verification_source" in ('production_event'))
);
--> statement-breakpoint
ALTER TABLE "analytics_task_status_events" ADD CONSTRAINT "analytics_task_status_events_task_id_analytics_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."analytics_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_task_status_events" ADD CONSTRAINT "analytics_task_status_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_task_status_events" ADD CONSTRAINT "analytics_task_status_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_tasks" ADD CONSTRAINT "analytics_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_tasks" ADD CONSTRAINT "analytics_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_analytics_task_status_events_task_id" ON "analytics_task_status_events" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_task_status_events_project_id" ON "analytics_task_status_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_task_status_events_user_id" ON "analytics_task_status_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_task_status_events_created_at" ON "analytics_task_status_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_tasks_active_duplicate_fingerprint_unique" ON "analytics_tasks" USING btree ("project_id","duplicate_fingerprint") WHERE "analytics_tasks"."duplicate_fingerprint" is not null and "analytics_tasks"."status" in (
          'pending',
          'in_progress',
          'implemented_locally',
          'awaiting_deploy',
          'verified',
          'failed',
          'duplicate'
        );--> statement-breakpoint
CREATE INDEX "idx_analytics_tasks_project_id" ON "analytics_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_tasks_user_id" ON "analytics_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_tasks_status" ON "analytics_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_analytics_tasks_created_at" ON "analytics_tasks" USING btree ("created_at");
ALTER TABLE "projects" ADD COLUMN "source" varchar(30) DEFAULT 'github_app' NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "display_name" varchar(255);
--> statement-breakpoint
UPDATE "projects" SET "display_name" = "github_repo_full_name" WHERE "display_name" IS NULL;
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "display_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "github_repo_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "github_repo_full_name" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "github_installation_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mcp_normalized_git_remote" varchar(500);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mcp_repo_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mcp_app_root" varchar(255);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mcp_framework" varchar(50);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mcp_package_manager" varchar(30);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mcp_fingerprint" varchar(64);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_source_check" CHECK ("projects"."source" in ('github_app','mcp_codex'));
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_user_mcp_fingerprint_unique" ON "projects" USING btree ("user_id","mcp_fingerprint") WHERE "projects"."mcp_fingerprint" is not null;
--> statement-breakpoint
CREATE INDEX "idx_projects_source" ON "projects" USING btree ("source");
--> statement-breakpoint
CREATE INDEX "idx_projects_mcp_fingerprint" ON "projects" USING btree ("mcp_fingerprint");
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"client_id" varchar(80) PRIMARY KEY NOT NULL,
	"client_name" varchar(255),
	"redirect_uris" text[] NOT NULL,
	"grant_types" text[],
	"response_types" text[],
	"scope" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_authorization_codes" (
	"code_hash" varchar(64) PRIMARY KEY NOT NULL,
	"client_id" varchar(80) NOT NULL,
	"user_id" uuid NOT NULL,
	"redirect_uri" varchar(500) NOT NULL,
	"code_challenge" varchar(255) NOT NULL,
	"code_challenge_method" varchar(20) NOT NULL,
	"scope" varchar(255) NOT NULL,
	"resource" varchar(500) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_access_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"client_id" varchar(80) NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" varchar(255) NOT NULL,
	"resource" varchar(500) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_refresh_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"client_id" varchar(80) NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" varchar(255) NOT NULL,
	"resource" varchar(500) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_from_hash" varchar(64)
);
--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_oauth_authorization_codes_client_id" ON "oauth_authorization_codes" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "idx_oauth_authorization_codes_user_id" ON "oauth_authorization_codes" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_oauth_authorization_codes_expires_at" ON "oauth_authorization_codes" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "idx_oauth_access_tokens_client_id" ON "oauth_access_tokens" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "idx_oauth_access_tokens_user_id" ON "oauth_access_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_oauth_access_tokens_expires_at" ON "oauth_access_tokens" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "idx_oauth_refresh_tokens_client_id" ON "oauth_refresh_tokens" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "idx_oauth_refresh_tokens_user_id" ON "oauth_refresh_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_oauth_refresh_tokens_expires_at" ON "oauth_refresh_tokens" USING btree ("expires_at");

-- V2 Conversion tracking columns for projects table
-- These columns store conversion configuration and prompt dismissal state

ALTER TABLE "projects" ADD COLUMN "conversion_path" varchar(255);
ALTER TABLE "projects" ADD COLUMN "conversion_label" varchar(100);
ALTER TABLE "projects" ADD COLUMN "conversion_configured_at" timestamp with time zone;
ALTER TABLE "projects" ADD COLUMN "conversion_prompt_dismissed_at" timestamp with time zone;

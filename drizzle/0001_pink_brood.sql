ALTER TABLE "projects" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp with time zone;
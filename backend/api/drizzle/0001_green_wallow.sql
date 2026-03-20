ALTER TABLE "links" ADD COLUMN "anonymous_marker" integer DEFAULT -1 NOT NULL;--> statement-breakpoint
UPDATE "links" SET "anonymous_marker" = 0 WHERE "owner_user_id" IS NOT NULL;--> statement-breakpoint
UPDATE "links" SET "anonymous_marker" = -1 WHERE "owner_user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "full_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text DEFAULT '' NOT NULL;
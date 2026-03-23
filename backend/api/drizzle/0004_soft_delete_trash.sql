ALTER TABLE "links" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "trash_batch_id" uuid;--> statement-breakpoint
DROP INDEX IF EXISTS "links_project_code_owner_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "links_root_code_owner_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "links_project_code_owner_unique" ON "links" USING btree ("project","code","owner_user_id") NULLS NOT DISTINCT WHERE ("links"."project" is not null AND "links"."deleted_at" is null);--> statement-breakpoint
CREATE UNIQUE INDEX "links_root_code_owner_unique" ON "links" USING btree ("code","owner_user_id") NULLS NOT DISTINCT WHERE ("links"."project" is null AND "links"."deleted_at" is null);--> statement-breakpoint
CREATE INDEX "links_trash_owner_idx" ON "links" USING btree ("owner_user_id") WHERE "links"."deleted_at" is not null;

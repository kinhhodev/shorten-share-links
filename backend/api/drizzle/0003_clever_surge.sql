DROP INDEX IF EXISTS "links_project_code_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "links_root_code_unique";--> statement-breakpoint
-- NULLS NOT DISTINCT: coi NULL owner như cùng một giá trị → một dòng ẩn danh / (project,code)
CREATE UNIQUE INDEX "links_project_code_owner_unique" ON "links" USING btree ("project","code","owner_user_id") NULLS NOT DISTINCT WHERE "links"."project" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "links_root_code_owner_unique" ON "links" USING btree ("code","owner_user_id") NULLS NOT DISTINCT WHERE "links"."project" is null;

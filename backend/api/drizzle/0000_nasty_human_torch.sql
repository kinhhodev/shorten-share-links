CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project" text,
	"code" text NOT NULL,
	"long_url" text NOT NULL,
	"owner_user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "links_lookup_idx" ON "links" USING btree ("project","code");--> statement-breakpoint
CREATE INDEX "links_owner_idx" ON "links" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "links_project_code_unique" ON "links" USING btree ("project","code") WHERE "links"."project" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "links_root_code_unique" ON "links" USING btree ("code") WHERE "links"."project" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");
DO $$ BEGIN
 CREATE TYPE "resource_visibility" AS ENUM('private', 'public');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "organization" ("id", "name", "slug", "created_at", "metadata")
VALUES (
  'default-organization',
  'Default Organization',
  'default-organization',
  now(),
  '{"kind":"bootstrap"}'
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "user" (
  "id",
  "name",
  "email",
  "email_verified",
  "created_at",
  "updated_at",
  "role",
  "banned",
  "ban_reason",
  "ban_expires",
  "two_factor_enabled"
)
VALUES (
  'super-admin',
  'Bootstrap Super Admin',
  'bootstrap-super-admin@example.invalid',
  true,
  now(),
  now(),
  'super_admin',
  false,
  null,
  null,
  false
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "dataset" ADD COLUMN IF NOT EXISTS "organization_id" text;--> statement-breakpoint
ALTER TABLE "dataset" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "dataset" ADD COLUMN IF NOT EXISTS "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "geometries" ADD COLUMN IF NOT EXISTS "organization_id" text;--> statement-breakpoint
ALTER TABLE "geometries" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "geometries" ADD COLUMN IF NOT EXISTS "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "organization_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "indicator_category" ADD COLUMN IF NOT EXISTS "organization_id" text;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD COLUMN IF NOT EXISTS "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "indicator" ADD COLUMN IF NOT EXISTS "organization_id" text;--> statement-breakpoint
ALTER TABLE "indicator" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "indicator" ADD COLUMN IF NOT EXISTS "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD COLUMN IF NOT EXISTS "organization_id" text;--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD COLUMN IF NOT EXISTS "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "organization_id" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "dashboard" ADD COLUMN IF NOT EXISTS "organization_id" text;--> statement-breakpoint
ALTER TABLE "dashboard" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "dashboard" ADD COLUMN IF NOT EXISTS "visibility" "resource_visibility";--> statement-breakpoint
UPDATE "user" SET "role" = 'super_admin' WHERE "role" = 'admin';--> statement-breakpoint
UPDATE "member" SET "role" = 'org_viewer' WHERE "role" = 'member' OR "role" IS NULL;--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'org_viewer';--> statement-breakpoint
UPDATE "invitation" SET "role" = 'org_viewer' WHERE "role" = 'member' OR "role" IS NULL;--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "role" SET DEFAULT 'org_viewer';--> statement-breakpoint
UPDATE "dataset"
SET
  "organization_id" = COALESCE("organization_id", 'default-organization'),
  "created_by_user_id" = COALESCE("created_by_user_id", 'super-admin'),
  "visibility" = COALESCE("visibility", 'private'::"resource_visibility")
WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;
--> statement-breakpoint
UPDATE "geometries"
SET
  "organization_id" = COALESCE("organization_id", 'default-organization'),
  "created_by_user_id" = COALESCE("created_by_user_id", 'super-admin'),
  "visibility" = COALESCE("visibility", 'private'::"resource_visibility")
WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;
--> statement-breakpoint
UPDATE "product"
SET
  "organization_id" = COALESCE("organization_id", 'default-organization'),
  "created_by_user_id" = COALESCE("created_by_user_id", 'super-admin'),
  "visibility" = COALESCE("visibility", 'private'::"resource_visibility")
WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;
--> statement-breakpoint
UPDATE "indicator_category"
SET
  "organization_id" = COALESCE("organization_id", 'default-organization'),
  "created_by_user_id" = COALESCE("created_by_user_id", 'super-admin'),
  "visibility" = COALESCE("visibility", 'private'::"resource_visibility")
WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;
--> statement-breakpoint
UPDATE "indicator"
SET
  "organization_id" = COALESCE("organization_id", 'default-organization'),
  "created_by_user_id" = COALESCE("created_by_user_id", 'super-admin'),
  "visibility" = COALESCE("visibility", 'private'::"resource_visibility")
WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;
--> statement-breakpoint
UPDATE "derived_indicator"
SET
  "organization_id" = COALESCE("organization_id", 'default-organization'),
  "created_by_user_id" = COALESCE("created_by_user_id", 'super-admin'),
  "visibility" = COALESCE("visibility", 'private'::"resource_visibility")
WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;
--> statement-breakpoint
UPDATE "report"
SET
  "organization_id" = COALESCE("organization_id", 'default-organization'),
  "created_by_user_id" = COALESCE("created_by_user_id", 'super-admin'),
  "visibility" = COALESCE("visibility", 'private'::"resource_visibility")
WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;
--> statement-breakpoint
UPDATE "dashboard"
SET
  "organization_id" = COALESCE("organization_id", 'default-organization'),
  "created_by_user_id" = COALESCE("created_by_user_id", 'super-admin'),
  "visibility" = COALESCE("visibility", 'private'::"resource_visibility")
WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;
--> statement-breakpoint
ALTER TABLE "dataset" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "geometries" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "geometries" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "geometries" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_category" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_category" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_category" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "derived_indicator" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "derived_indicator" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "derived_indicator" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD CONSTRAINT "indicator_category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD CONSTRAINT "indicator_category_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator" ADD CONSTRAINT "indicator_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator" ADD CONSTRAINT "indicator_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD CONSTRAINT "derived_indicator_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD CONSTRAINT "derived_indicator_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard" ADD CONSTRAINT "dashboard_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard" ADD CONSTRAINT "dashboard_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset" ALTER COLUMN "visibility" SET DEFAULT 'private'::"resource_visibility";--> statement-breakpoint
ALTER TABLE "geometries" ALTER COLUMN "visibility" SET DEFAULT 'private'::"resource_visibility";--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "visibility" SET DEFAULT 'private'::"resource_visibility";--> statement-breakpoint
ALTER TABLE "indicator_category" ALTER COLUMN "visibility" SET DEFAULT 'private'::"resource_visibility";--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "visibility" SET DEFAULT 'private'::"resource_visibility";--> statement-breakpoint
ALTER TABLE "derived_indicator" ALTER COLUMN "visibility" SET DEFAULT 'private'::"resource_visibility";--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "visibility" SET DEFAULT 'private'::"resource_visibility";--> statement-breakpoint
ALTER TABLE "dashboard" ALTER COLUMN "visibility" SET DEFAULT 'private'::"resource_visibility";--> statement-breakpoint
CREATE INDEX "dataset_organization_id_idx" ON "dataset" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dataset_visibility_idx" ON "dataset" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "geometries_organization_id_idx" ON "geometries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "geometries_visibility_idx" ON "geometries" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "product_organization_id_idx" ON "product" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_visibility_idx" ON "product" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "indicator_category_organization_id_idx" ON "indicator_category" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "indicator_category_visibility_idx" ON "indicator_category" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "indicator_organization_id_idx" ON "indicator" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "indicator_visibility_idx" ON "indicator" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "derived_indicator_organization_id_idx" ON "derived_indicator" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "derived_indicator_visibility_idx" ON "derived_indicator" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "report_organization_id_idx" ON "report" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "report_visibility_idx" ON "report" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "dashboard_organization_id_idx" ON "dashboard" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dashboard_visibility_idx" ON "dashboard" USING btree ("visibility");--> statement-breakpoint
CREATE TABLE "audit_log" (
  "id" text PRIMARY KEY NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "actor_user_id" text,
  "actor_role" text,
  "active_organization_id" text,
  "target_organization_id" text,
  "resource_type" text NOT NULL,
  "resource_id" text,
  "action" text NOT NULL,
  "decision" text NOT NULL,
  "request_path" text NOT NULL,
  "request_method" text NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "details" jsonb
);
--> statement-breakpoint
CREATE TABLE "read_log" (
  "id" text PRIMARY KEY NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "actor_user_id" text,
  "actor_role" text,
  "active_organization_id" text,
  "target_organization_id" text,
  "resource_type" text NOT NULL,
  "resource_id" text,
  "action" text NOT NULL,
  "decision" text NOT NULL,
  "request_path" text NOT NULL,
  "request_method" text NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "details" jsonb
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_target_organization_id_organization_id_fk" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_log" ADD CONSTRAINT "read_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_log" ADD CONSTRAINT "read_log_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_log" ADD CONSTRAINT "read_log_target_organization_id_organization_id_fk" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_target_organization_id_idx" ON "audit_log" USING btree ("target_organization_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_user_id_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "read_log_created_at_idx" ON "read_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "read_log_target_organization_id_idx" ON "read_log" USING btree ("target_organization_id");--> statement-breakpoint
CREATE INDEX "read_log_actor_user_id_idx" ON "read_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "read_log_resource_idx" ON "read_log" USING btree ("resource_type","resource_id");

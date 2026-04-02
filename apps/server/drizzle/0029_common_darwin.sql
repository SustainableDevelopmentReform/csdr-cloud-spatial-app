CREATE TYPE "public"."resource_visibility" AS ENUM('private', 'public');--> statement-breakpoint
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
ALTER TABLE "invitation" ALTER COLUMN "role" SET DEFAULT 'org_viewer';--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'org_viewer';--> statement-breakpoint
UPDATE "user" SET "role" = 'super_admin' WHERE "role" = 'admin';--> statement-breakpoint
UPDATE "member" SET "role" = 'org_viewer' WHERE "role" = 'member' OR "role" IS NULL;--> statement-breakpoint
UPDATE "invitation" SET "role" = 'org_viewer' WHERE "role" = 'member' OR "role" IS NULL;--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "dashboard" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "dashboard" ADD COLUMN "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "dataset" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "dataset" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "dataset" ADD COLUMN "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD COLUMN "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "geometries" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "geometries" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "geometries" ADD COLUMN "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "indicator" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "indicator" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "indicator" ADD COLUMN "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "indicator_category" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD COLUMN "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "visibility" "resource_visibility";--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "visibility" "resource_visibility";--> statement-breakpoint
DO $$
DECLARE
	bootstrap_organization_id text := COALESCE(NULLIF(current_setting('csdr.access_control_bootstrap_organization_id', true), ''), 'csdr');
	bootstrap_user_id text := COALESCE(NULLIF(current_setting('csdr.access_control_bootstrap_user_id', true), ''), 'super-admin');
	target_organization_id text;
	target_user_id text;
	has_legacy_resource_data boolean;
BEGIN
	SELECT
		EXISTS (SELECT 1 FROM "dataset")
		OR EXISTS (SELECT 1 FROM "geometries")
		OR EXISTS (SELECT 1 FROM "product")
		OR EXISTS (SELECT 1 FROM "indicator_category")
		OR EXISTS (SELECT 1 FROM "indicator")
		OR EXISTS (SELECT 1 FROM "derived_indicator")
		OR EXISTS (SELECT 1 FROM "report")
		OR EXISTS (SELECT 1 FROM "dashboard")
	INTO has_legacy_resource_data;

	IF NOT has_legacy_resource_data THEN
		RETURN;
	END IF;

	SELECT "organization"."id"
	INTO target_organization_id
	FROM "organization"
	WHERE "organization"."id" = bootstrap_organization_id
	LIMIT 1;

	IF target_organization_id IS NULL THEN
		SELECT "organization"."id"
		INTO target_organization_id
		FROM "organization"
		ORDER BY "organization"."created_at" ASC, "organization"."id" ASC
		LIMIT 1;
	END IF;

	IF target_organization_id IS NULL THEN
		target_organization_id := bootstrap_organization_id;

		INSERT INTO "organization" ("id", "name", "slug", "created_at", "metadata")
		VALUES (
			target_organization_id,
			CASE
				WHEN target_organization_id = 'csdr' THEN 'CSDR'
				ELSE target_organization_id
			END,
			target_organization_id,
			now(),
			'{"kind":"bootstrap"}'
		);
	END IF;

	SELECT "user"."id"
	INTO target_user_id
	FROM "user"
	WHERE "user"."id" = bootstrap_user_id
	LIMIT 1;

	IF target_user_id IS NULL THEN
		SELECT "user"."id"
		INTO target_user_id
		FROM "user"
		WHERE COALESCE("user"."is_anonymous", false) = false
		ORDER BY "user"."created_at" ASC, "user"."id" ASC
		LIMIT 1;
	END IF;

	IF target_user_id IS NULL THEN
		target_user_id := bootstrap_user_id;

		INSERT INTO "user" (
			"id",
			"name",
			"email",
			"email_verified",
			"created_at",
			"updated_at",
			"role",
			"banned",
			"two_factor_enabled",
			"is_anonymous"
		)
		VALUES (
			target_user_id,
			'Bootstrap Super Admin',
			CONCAT('bootstrap-', md5(target_user_id), '@example.invalid'),
			true,
			now(),
			now(),
			'super_admin',
			false,
			false,
			false
		);
	END IF;

	UPDATE "dashboard"
	SET
		"organization_id" = COALESCE("organization_id", target_organization_id),
		"created_by_user_id" = COALESCE("created_by_user_id", target_user_id),
		"visibility" = COALESCE("visibility", 'private'::"resource_visibility")
	WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;

	UPDATE "dataset"
	SET
		"organization_id" = COALESCE("organization_id", target_organization_id),
		"created_by_user_id" = COALESCE("created_by_user_id", target_user_id),
		"visibility" = COALESCE("visibility", 'private'::"resource_visibility")
	WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;

	UPDATE "derived_indicator"
	SET
		"organization_id" = COALESCE("organization_id", target_organization_id),
		"created_by_user_id" = COALESCE("created_by_user_id", target_user_id),
		"visibility" = COALESCE("visibility", 'private'::"resource_visibility")
	WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;

	UPDATE "geometries"
	SET
		"organization_id" = COALESCE("organization_id", target_organization_id),
		"created_by_user_id" = COALESCE("created_by_user_id", target_user_id),
		"visibility" = COALESCE("visibility", 'private'::"resource_visibility")
	WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;

	UPDATE "indicator"
	SET
		"organization_id" = COALESCE("organization_id", target_organization_id),
		"created_by_user_id" = COALESCE("created_by_user_id", target_user_id),
		"visibility" = COALESCE("visibility", 'private'::"resource_visibility")
	WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;

	UPDATE "indicator_category"
	SET
		"organization_id" = COALESCE("organization_id", target_organization_id),
		"created_by_user_id" = COALESCE("created_by_user_id", target_user_id),
		"visibility" = COALESCE("visibility", 'private'::"resource_visibility")
	WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;

	UPDATE "product"
	SET
		"organization_id" = COALESCE("organization_id", target_organization_id),
		"created_by_user_id" = COALESCE("created_by_user_id", target_user_id),
		"visibility" = COALESCE("visibility", 'private'::"resource_visibility")
	WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;

	UPDATE "report"
	SET
		"organization_id" = COALESCE("organization_id", target_organization_id),
		"created_by_user_id" = COALESCE("created_by_user_id", target_user_id),
		"visibility" = COALESCE("visibility", 'private'::"resource_visibility")
	WHERE "organization_id" IS NULL OR "created_by_user_id" IS NULL OR "visibility" IS NULL;

	IF NOT EXISTS (
		SELECT 1
		FROM "member"
		WHERE "member"."organization_id" = target_organization_id
	) THEN
		INSERT INTO "member" (
			"id",
			"organization_id",
			"user_id",
			"role",
			"created_at"
		)
		VALUES (
			CONCAT('bootstrap-member-', md5(CONCAT(target_organization_id, ':', target_user_id))),
			target_organization_id,
			target_user_id,
			'org_admin',
			now()
		);
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "dashboard" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "dataset" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "derived_indicator" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "geometries" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "indicator_category" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "dashboard" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "derived_indicator" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "derived_indicator" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "derived_indicator" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "geometries" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "geometries" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "geometries" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_category" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_category" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_category" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
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
CREATE INDEX "read_log_resource_idx" ON "read_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
ALTER TABLE "dashboard" ADD CONSTRAINT "dashboard_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard" ADD CONSTRAINT "dashboard_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD CONSTRAINT "derived_indicator_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD CONSTRAINT "derived_indicator_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator" ADD CONSTRAINT "indicator_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator" ADD CONSTRAINT "indicator_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD CONSTRAINT "indicator_category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD CONSTRAINT "indicator_category_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dashboard_organization_id_idx" ON "dashboard" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dashboard_visibility_idx" ON "dashboard" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "dataset_organization_id_idx" ON "dataset" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dataset_visibility_idx" ON "dataset" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "derived_indicator_organization_id_idx" ON "derived_indicator" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "derived_indicator_visibility_idx" ON "derived_indicator" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "geometries_organization_id_idx" ON "geometries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "geometries_visibility_idx" ON "geometries" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "indicator_organization_id_idx" ON "indicator" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "indicator_visibility_idx" ON "indicator" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "indicator_category_organization_id_idx" ON "indicator_category" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "indicator_category_visibility_idx" ON "indicator_category" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "product_organization_id_idx" ON "product" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_visibility_idx" ON "product" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "report_organization_id_idx" ON "report" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "report_visibility_idx" ON "report" USING btree ("visibility");

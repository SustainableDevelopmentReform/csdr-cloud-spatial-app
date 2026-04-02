INSERT INTO "organization" ("id", "name", "slug", "created_at", "metadata")
VALUES ('csdr', 'CSDR', 'csdr', now(), '{"kind":"bootstrap"}')
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "slug" = EXCLUDED."slug",
  "metadata" = EXCLUDED."metadata";
--> statement-breakpoint
UPDATE "dataset" SET "organization_id" = 'csdr' WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "geometries" SET "organization_id" = 'csdr' WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "product" SET "organization_id" = 'csdr' WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "indicator_category" SET "organization_id" = 'csdr' WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "indicator" SET "organization_id" = 'csdr' WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "derived_indicator" SET "organization_id" = 'csdr' WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "report" SET "organization_id" = 'csdr' WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "dashboard" SET "organization_id" = 'csdr' WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "invitation" SET "organization_id" = 'csdr' WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "session" SET "active_organization_id" = 'csdr' WHERE "active_organization_id" = 'default-organization';
--> statement-breakpoint
UPDATE "audit_log"
SET
  "active_organization_id" = CASE
    WHEN "active_organization_id" = 'default-organization' THEN 'csdr'
    ELSE "active_organization_id"
  END,
  "target_organization_id" = CASE
    WHEN "target_organization_id" = 'default-organization' THEN 'csdr'
    ELSE "target_organization_id"
  END;
--> statement-breakpoint
UPDATE "read_log"
SET
  "active_organization_id" = CASE
    WHEN "active_organization_id" = 'default-organization' THEN 'csdr'
    ELSE "active_organization_id"
  END,
  "target_organization_id" = CASE
    WHEN "target_organization_id" = 'default-organization' THEN 'csdr'
    ELSE "target_organization_id"
  END;
--> statement-breakpoint
UPDATE "member"
SET "organization_id" = 'csdr'
WHERE
  "organization_id" = 'default-organization'
  AND NOT EXISTS (
    SELECT 1
    FROM "member" AS "existing_member"
    WHERE
      "existing_member"."organization_id" = 'csdr'
      AND "existing_member"."user_id" = "member"."user_id"
  );
--> statement-breakpoint
DELETE FROM "member" WHERE "organization_id" = 'default-organization';
--> statement-breakpoint
INSERT INTO "member" ("id", "organization_id", "user_id", "role", "created_at")
SELECT
  CONCAT('csdr-member-', "user"."id"),
  'csdr',
  "user"."id",
  'org_admin',
  COALESCE("user"."created_at", now())
FROM "user"
LEFT JOIN "member" AS "existing_csdr_member"
  ON "existing_csdr_member"."user_id" = "user"."id"
  AND "existing_csdr_member"."organization_id" = 'csdr'
WHERE
  "existing_csdr_member"."id" IS NULL
  AND COALESCE("user"."is_anonymous", false) = false;
--> statement-breakpoint
DELETE FROM "organization" WHERE "id" = 'default-organization';

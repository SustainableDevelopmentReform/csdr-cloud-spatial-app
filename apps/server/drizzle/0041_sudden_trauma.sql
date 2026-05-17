ALTER TABLE "dataset" DROP CONSTRAINT "dataset_main_run_id_dataset_run_id_fk";
--> statement-breakpoint
ALTER TABLE "geometries" DROP CONSTRAINT "geometries_main_run_id_geometries_run_id_fk";
--> statement-breakpoint
ALTER TABLE "product" DROP CONSTRAINT "product_main_run_id_product_run_id_fk";
--> statement-breakpoint
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_main_run_id_dataset_run_id_fk" FOREIGN KEY ("main_run_id") REFERENCES "public"."dataset_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_main_run_id_geometries_run_id_fk" FOREIGN KEY ("main_run_id") REFERENCES "public"."geometries_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_main_run_id_product_run_id_fk" FOREIGN KEY ("main_run_id") REFERENCES "public"."product_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_pending_org_email_uidx" ON "invitation" USING btree ("organization_id",lower("email")) WHERE "invitation"."status" = 'pending';--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_last_org_admin_member_change()
RETURNS trigger AS $$
DECLARE
  remaining_admin_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role <> 'org_admin' THEN
      RETURN OLD;
    END IF;

    SELECT count(*) INTO remaining_admin_count
    FROM "member"
    WHERE "organization_id" = OLD.organization_id
      AND "role" = 'org_admin'
      AND "id" <> OLD.id;

    IF remaining_admin_count = 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'An organization must keep at least one org admin.';
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.role <> 'org_admin' OR NEW.role = 'org_admin' THEN
      RETURN NEW;
    END IF;

    SELECT count(*) INTO remaining_admin_count
    FROM "member"
    WHERE "organization_id" = OLD.organization_id
      AND "role" = 'org_admin'
      AND "id" <> OLD.id;

    IF remaining_admin_count = 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'An organization must keep at least one org admin.';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER prevent_last_org_admin_member_change_trigger
BEFORE UPDATE OF "role" OR DELETE ON "member"
FOR EACH ROW
EXECUTE FUNCTION prevent_last_org_admin_member_change();

ALTER TABLE "dataset_run" ADD COLUMN "workflow_dag" jsonb;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "workflow_dag" jsonb;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "workflow_dag" jsonb;
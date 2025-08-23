ALTER TABLE "dataset_run" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "geometries_run" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_output" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_run" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "geometry_output" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "product_output" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "variable" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "variable_category" ADD COLUMN "metadata" jsonb;
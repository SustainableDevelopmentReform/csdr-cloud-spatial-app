ALTER TABLE "product" ALTER COLUMN "dataset_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "geometries_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_output" ALTER COLUMN "geometry_output_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_run" ALTER COLUMN "dataset_run_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_run" ALTER COLUMN "geometries_run_id" DROP NOT NULL;
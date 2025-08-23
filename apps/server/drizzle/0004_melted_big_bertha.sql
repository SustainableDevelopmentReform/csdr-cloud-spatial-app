ALTER TABLE "dataset_run" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "product_output" ADD CONSTRAINT "product_output_run_variable_time_point_geometry_output_id_unique" UNIQUE("product_run_id","variable_id","time_point","geometry_output_id");
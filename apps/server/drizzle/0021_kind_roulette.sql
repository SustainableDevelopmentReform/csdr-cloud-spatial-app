ALTER TABLE "product_output" DROP CONSTRAINT "product_output_run_indicator_time_point_geometry_output_id_unique";--> statement-breakpoint
ALTER TABLE "product_output" DROP CONSTRAINT "product_output_indicator_id_indicator_id_fk";
--> statement-breakpoint
ALTER TABLE "product_output" ALTER COLUMN "indicator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_output" ADD COLUMN "derived_indicator_id" text;--> statement-breakpoint
ALTER TABLE "product_output" ADD CONSTRAINT "product_output_derived_indicator_id_derived_indicator_id_fk" FOREIGN KEY ("derived_indicator_id") REFERENCES "public"."derived_indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output" ADD CONSTRAINT "product_output_indicator_id_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output" ADD CONSTRAINT "product_output_run_indicator_time_point_geometry_output_id_unique" UNIQUE("product_run_id","indicator_id","derived_indicator_id","time_point","geometry_output_id");
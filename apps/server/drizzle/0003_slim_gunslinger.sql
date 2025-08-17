CREATE TABLE "product_output_summary" (
	"product_run_id" text PRIMARY KEY NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"output_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_output_summary_variable" (
	"product_run_id" text NOT NULL,
	"variable_id" text NOT NULL,
	"min_value" numeric,
	"max_value" numeric,
	"avg_value" numeric,
	"count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "summary_variable_pk" UNIQUE("product_run_id","variable_id")
);
--> statement-breakpoint
ALTER TABLE "dataset" DROP CONSTRAINT "dataset_slug_unique";--> statement-breakpoint
ALTER TABLE "geometries" DROP CONSTRAINT "geometries_slug_unique";--> statement-breakpoint
ALTER TABLE "organization" DROP CONSTRAINT "organization_slug_unique";--> statement-breakpoint
ALTER TABLE "product" DROP CONSTRAINT "product_slug_unique";--> statement-breakpoint
ALTER TABLE "variable" ALTER COLUMN "unit" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset" ADD COLUMN "main_run_id" text;--> statement-breakpoint
ALTER TABLE "geometries" ADD COLUMN "main_run_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "main_run_id" text;--> statement-breakpoint
ALTER TABLE "product_output_summary" ADD CONSTRAINT "product_output_summary_product_run_id_product_run_id_fk" FOREIGN KEY ("product_run_id") REFERENCES "public"."product_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output_summary_variable" ADD CONSTRAINT "product_output_summary_variable_product_run_id_product_output_summary_product_run_id_fk" FOREIGN KEY ("product_run_id") REFERENCES "public"."product_output_summary"("product_run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output_summary_variable" ADD CONSTRAINT "product_output_summary_variable_variable_id_variable_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_output_summary_start_time_idx" ON "product_output_summary" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "product_output_summary_end_time_idx" ON "product_output_summary" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "product_output_summary_last_updated_idx" ON "product_output_summary" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "summary_variable_product_run_idx" ON "product_output_summary_variable" USING btree ("product_run_id");--> statement-breakpoint
CREATE INDEX "summary_variable_variable_idx" ON "product_output_summary_variable" USING btree ("variable_id");--> statement-breakpoint
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_main_run_id_dataset_run_id_fk" FOREIGN KEY ("main_run_id") REFERENCES "public"."dataset_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_main_run_id_geometries_run_id_fk" FOREIGN KEY ("main_run_id") REFERENCES "public"."geometries_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_main_run_id_product_run_id_fk" FOREIGN KEY ("main_run_id") REFERENCES "public"."product_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dataset_main_run_id_idx" ON "dataset" USING btree ("main_run_id");--> statement-breakpoint
CREATE INDEX "geometries_main_run_id_idx" ON "geometries" USING btree ("main_run_id");--> statement-breakpoint
CREATE INDEX "product_main_run_id_idx" ON "product" USING btree ("main_run_id");--> statement-breakpoint
ALTER TABLE "dataset" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "geometries" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "product" DROP COLUMN "slug";
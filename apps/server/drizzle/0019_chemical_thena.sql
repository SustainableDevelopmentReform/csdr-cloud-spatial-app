ALTER TABLE "variable" RENAME TO "indicator";--> statement-breakpoint
ALTER TABLE "variable_category" RENAME TO "indicator_category";--> statement-breakpoint
ALTER TABLE "product_output_summary_variable" RENAME TO "product_output_summary_indicator";--> statement-breakpoint
ALTER TABLE "product_output" RENAME COLUMN "variable_id" TO "indicator_id";--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" RENAME COLUMN "variable_id" TO "indicator_id";--> statement-breakpoint
ALTER TABLE "product_output" DROP CONSTRAINT "product_output_run_variable_time_point_geometry_output_id_unique";--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" DROP CONSTRAINT "summary_variable_pk";--> statement-breakpoint
ALTER TABLE "product_output" DROP CONSTRAINT "product_output_variable_id_variable_id_fk";
--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" DROP CONSTRAINT "product_output_summary_variable_product_run_id_product_output_summary_product_run_id_fk";
--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" DROP CONSTRAINT "product_output_summary_variable_variable_id_variable_id_fk";
--> statement-breakpoint
ALTER TABLE "indicator" DROP CONSTRAINT "variable_category_id_variable_category_id_fk";
--> statement-breakpoint
ALTER TABLE "indicator_category" DROP CONSTRAINT "variable_category_parent_id_variable_category_id_fk";
--> statement-breakpoint
DROP INDEX "product_output_variable_id_idx";--> statement-breakpoint
DROP INDEX "product_output_run_variable_idx";--> statement-breakpoint
DROP INDEX "summary_variable_product_run_idx";--> statement-breakpoint
DROP INDEX "summary_variable_variable_idx";--> statement-breakpoint
DROP INDEX "variable_category_idx";--> statement-breakpoint
DROP INDEX "variable_name_idx";--> statement-breakpoint
DROP INDEX "variable_category_order_idx";--> statement-breakpoint
DROP INDEX "variable_category_parent_idx";--> statement-breakpoint
DROP INDEX "variable_category_name_idx";--> statement-breakpoint
DROP INDEX "variable_category_parent_order_idx";--> statement-breakpoint
ALTER TABLE "product_output" ADD CONSTRAINT "product_output_indicator_id_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" ADD CONSTRAINT "product_output_summary_indicator_product_run_id_product_output_summary_product_run_id_fk" FOREIGN KEY ("product_run_id") REFERENCES "public"."product_output_summary"("product_run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" ADD CONSTRAINT "product_output_summary_indicator_indicator_id_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator" ADD CONSTRAINT "indicator_category_id_indicator_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."indicator_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD CONSTRAINT "indicator_category_parent_id_indicator_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."indicator_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_output_indicator_id_idx" ON "product_output" USING btree ("indicator_id");--> statement-breakpoint
CREATE INDEX "product_output_run_indicator_idx" ON "product_output" USING btree ("product_run_id","indicator_id");--> statement-breakpoint
CREATE INDEX "summary_indicator_product_run_idx" ON "product_output_summary_indicator" USING btree ("product_run_id");--> statement-breakpoint
CREATE INDEX "summary_indicator_indicator_idx" ON "product_output_summary_indicator" USING btree ("indicator_id");--> statement-breakpoint
CREATE INDEX "indicator_category_idx" ON "indicator" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "indicator_name_idx" ON "indicator" USING btree ("name");--> statement-breakpoint
CREATE INDEX "indicator_category_order_idx" ON "indicator" USING btree ("category_id","display_order");--> statement-breakpoint
CREATE INDEX "indicator_category_parent_idx" ON "indicator_category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "indicator_category_name_idx" ON "indicator_category" USING btree ("name");--> statement-breakpoint
CREATE INDEX "indicator_category_parent_order_idx" ON "indicator_category" USING btree ("parent_id","display_order");--> statement-breakpoint
ALTER TABLE "product_output" ADD CONSTRAINT "product_output_run_indicator_time_point_geometry_output_id_unique" UNIQUE("product_run_id","indicator_id","time_point","geometry_output_id");--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" ADD CONSTRAINT "summary_indicator_pk" UNIQUE("product_run_id","indicator_id");
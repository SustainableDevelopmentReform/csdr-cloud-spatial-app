ALTER TABLE "dashboard" ADD COLUMN "bounds" geometry(Polygon,4326);--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "bounds" geometry(Polygon,4326);--> statement-breakpoint
ALTER TABLE "product_output_summary" ADD COLUMN "bounds" geometry(Polygon,4326);--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "bounds" geometry(Polygon,4326);--> statement-breakpoint
CREATE INDEX "dashboard_bounds_gist_idx" ON "dashboard" USING gist ("bounds");--> statement-breakpoint
CREATE INDEX "dataset_run_bounds_gist_idx" ON "dataset_run" USING gist ("bounds");--> statement-breakpoint
CREATE INDEX "product_output_summary_bounds_gist_idx" ON "product_output_summary" USING gist ("bounds");--> statement-breakpoint
CREATE INDEX "report_bounds_gist_idx" ON "report" USING gist ("bounds");
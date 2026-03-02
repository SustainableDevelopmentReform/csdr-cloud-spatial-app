CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "dashboard_search_trgm_idx" ON "dashboard" USING gin ("name" gin_trgm_ops, "description" gin_trgm_ops);

--> statement-breakpoint
CREATE INDEX "dataset_search_trgm_idx" ON "dataset" USING gin ("name" gin_trgm_ops, "description" gin_trgm_ops);

--> statement-breakpoint
CREATE INDEX "dataset_run_search_trgm_idx" ON "dataset_run" USING gin ("name" gin_trgm_ops, "description" gin_trgm_ops);

--> statement-breakpoint
CREATE INDEX "derived_indicator_search_trgm_idx" ON "derived_indicator" USING gin (
  "id" gin_trgm_ops,
  "name" gin_trgm_ops,
  "description" gin_trgm_ops
);

--> statement-breakpoint
CREATE INDEX "geometries_search_trgm_idx" ON "geometries" USING gin ("name" gin_trgm_ops, "description" gin_trgm_ops);

--> statement-breakpoint
CREATE INDEX "geometries_run_search_trgm_idx" ON "geometries_run" USING gin ("name" gin_trgm_ops, "description" gin_trgm_ops);

--> statement-breakpoint
CREATE INDEX "indicator_search_trgm_idx" ON "indicator" USING gin (
  "id" gin_trgm_ops,
  "name" gin_trgm_ops,
  "description" gin_trgm_ops
);

--> statement-breakpoint
CREATE INDEX "product_search_trgm_idx" ON "product" USING gin (
  "id" gin_trgm_ops,
  "name" gin_trgm_ops,
  "description" gin_trgm_ops
);

--> statement-breakpoint
CREATE INDEX "product_output_run_created_at_idx" ON "product_output" USING btree ("product_run_id", "created_at");

--> statement-breakpoint
CREATE INDEX "product_run_search_trgm_idx" ON "product_run" USING gin ("name" gin_trgm_ops, "description" gin_trgm_ops);

--> statement-breakpoint
CREATE INDEX "product_run_product_created_at_idx" ON "product_run" USING btree ("product_id", "created_at");

--> statement-breakpoint
CREATE INDEX "report_search_trgm_idx" ON "report" USING gin ("name" gin_trgm_ops, "description" gin_trgm_ops);

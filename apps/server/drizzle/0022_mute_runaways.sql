ALTER TABLE "product_output_summary_indicator" DROP CONSTRAINT "summary_indicator_pk";--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" ALTER COLUMN "indicator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" ADD COLUMN "derived_indicator_id" text;--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" ADD CONSTRAINT "product_output_summary_indicator_derived_indicator_id_derived_indicator_id_fk" FOREIGN KEY ("derived_indicator_id") REFERENCES "public"."derived_indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "summary_indicator_derived_indicator_idx" ON "product_output_summary_indicator" USING btree ("derived_indicator_id");--> statement-breakpoint
ALTER TABLE "product_output_summary_indicator" ADD CONSTRAINT "summary_indicator_pk" UNIQUE("product_run_id","indicator_id","derived_indicator_id");
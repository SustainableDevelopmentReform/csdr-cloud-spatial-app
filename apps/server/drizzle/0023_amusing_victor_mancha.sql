CREATE TABLE "product_output_dependency" (
	"derived_product_output_id" text NOT NULL,
	"dependency_product_output_id" text NOT NULL,
	CONSTRAINT "product_output_dependency_derived_product_output_id_dependency_product_output_id_pk" PRIMARY KEY("derived_product_output_id","dependency_product_output_id")
);
--> statement-breakpoint
CREATE TABLE "product_run_assigned_derived_indicator" (
	"product_run_id" text NOT NULL,
	"derived_indicator_id" text NOT NULL,
	CONSTRAINT "product_run_assigned_derived_indicator_pk" UNIQUE("product_run_id","derived_indicator_id")
);
--> statement-breakpoint
ALTER TABLE "product_output_dependency" ADD CONSTRAINT "product_output_dependency_derived_product_output_id_product_output_id_fk" FOREIGN KEY ("derived_product_output_id") REFERENCES "public"."product_output"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output_dependency" ADD CONSTRAINT "product_output_dependency_dependency_product_output_id_product_output_id_fk" FOREIGN KEY ("dependency_product_output_id") REFERENCES "public"."product_output"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_run_assigned_derived_indicator" ADD CONSTRAINT "product_run_assigned_derived_indicator_product_run_id_product_run_id_fk" FOREIGN KEY ("product_run_id") REFERENCES "public"."product_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_run_assigned_derived_indicator" ADD CONSTRAINT "product_run_assigned_derived_indicator_derived_indicator_id_derived_indicator_id_fk" FOREIGN KEY ("derived_indicator_id") REFERENCES "public"."derived_indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_output_dependency_derived_product_output_idx" ON "product_output_dependency" USING btree ("derived_product_output_id");--> statement-breakpoint
CREATE INDEX "product_output_dependency_dependency_product_output_idx" ON "product_output_dependency" USING btree ("dependency_product_output_id");--> statement-breakpoint
CREATE INDEX "product_run_assigned_derived_indicator_product_run_idx" ON "product_run_assigned_derived_indicator" USING btree ("product_run_id");--> statement-breakpoint
CREATE INDEX "product_run_assigned_derived_indicator_derived_indicator_idx" ON "product_run_assigned_derived_indicator" USING btree ("derived_indicator_id");
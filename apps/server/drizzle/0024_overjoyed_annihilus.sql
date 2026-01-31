CREATE TABLE "assigned_derived_indicator_dep" (
	"assigned_derived_indicator_id" text NOT NULL,
	"indicator_id" text NOT NULL,
	"source_product_run_id" text NOT NULL,
	CONSTRAINT "assigned_derived_indicator_dep_assigned_derived_indicator_id_indicator_id_pk" PRIMARY KEY("assigned_derived_indicator_id","indicator_id")
);
--> statement-breakpoint
ALTER TABLE "product_run_assigned_derived_indicator" DROP CONSTRAINT "product_run_assigned_derived_indicator_pk";--> statement-breakpoint
ALTER TABLE "product_run_assigned_derived_indicator" ADD COLUMN "id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "assigned_derived_indicator_dep" ADD CONSTRAINT "assigned_derived_indicator_dep_assigned_derived_indicator_id_product_run_assigned_derived_indicator_id_fk" FOREIGN KEY ("assigned_derived_indicator_id") REFERENCES "public"."product_run_assigned_derived_indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_derived_indicator_dep" ADD CONSTRAINT "assigned_derived_indicator_dep_indicator_id_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_derived_indicator_dep" ADD CONSTRAINT "assigned_derived_indicator_dep_source_product_run_id_product_run_id_fk" FOREIGN KEY ("source_product_run_id") REFERENCES "public"."product_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assigned_di_dep_assigned_idx" ON "assigned_derived_indicator_dep" USING btree ("assigned_derived_indicator_id");--> statement-breakpoint
CREATE INDEX "assigned_di_dep_indicator_idx" ON "assigned_derived_indicator_dep" USING btree ("indicator_id");--> statement-breakpoint
CREATE INDEX "assigned_di_dep_source_run_idx" ON "assigned_derived_indicator_dep" USING btree ("source_product_run_id");--> statement-breakpoint
ALTER TABLE "product_run_assigned_derived_indicator" ADD CONSTRAINT "product_run_assigned_derived_indicator_unique" UNIQUE("product_run_id","derived_indicator_id");
CREATE TABLE "dashboard_indicator_usage" (
	"dashboard_id" text NOT NULL,
	"product_run_id" text NOT NULL,
	"indicator_id" text,
	"derived_indicator_id" text,
	CONSTRAINT "dashboard_indicator_usage_indicator_xor_chk" CHECK ((
        ("indicator_id" is not null and "derived_indicator_id" is null)
        or
        ("indicator_id" is null and "derived_indicator_id" is not null)
      ))
);
--> statement-breakpoint
CREATE TABLE "report_indicator_usage" (
	"report_id" text NOT NULL,
	"product_run_id" text NOT NULL,
	"indicator_id" text,
	"derived_indicator_id" text,
	CONSTRAINT "report_indicator_usage_indicator_xor_chk" CHECK ((
        ("indicator_id" is not null and "derived_indicator_id" is null)
        or
        ("indicator_id" is null and "derived_indicator_id" is not null)
      ))
);
--> statement-breakpoint
ALTER TABLE "dashboard_indicator_usage" ADD CONSTRAINT "dashboard_indicator_usage_dashboard_id_dashboard_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboard"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_indicator_usage" ADD CONSTRAINT "dashboard_indicator_usage_product_run_id_product_run_id_fk" FOREIGN KEY ("product_run_id") REFERENCES "public"."product_run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_indicator_usage" ADD CONSTRAINT "dashboard_indicator_usage_indicator_id_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_indicator_usage" ADD CONSTRAINT "dashboard_indicator_usage_derived_indicator_id_derived_indicator_id_fk" FOREIGN KEY ("derived_indicator_id") REFERENCES "public"."derived_indicator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_indicator_usage" ADD CONSTRAINT "report_indicator_usage_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_indicator_usage" ADD CONSTRAINT "report_indicator_usage_product_run_id_product_run_id_fk" FOREIGN KEY ("product_run_id") REFERENCES "public"."product_run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_indicator_usage" ADD CONSTRAINT "report_indicator_usage_indicator_id_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_indicator_usage" ADD CONSTRAINT "report_indicator_usage_derived_indicator_id_derived_indicator_id_fk" FOREIGN KEY ("derived_indicator_id") REFERENCES "public"."derived_indicator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dashboard_indicator_usage_dashboard_idx" ON "dashboard_indicator_usage" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "dashboard_indicator_usage_product_run_idx" ON "dashboard_indicator_usage" USING btree ("product_run_id");--> statement-breakpoint
CREATE INDEX "dashboard_indicator_usage_indicator_idx" ON "dashboard_indicator_usage" USING btree ("indicator_id");--> statement-breakpoint
CREATE INDEX "dashboard_indicator_usage_derived_indicator_idx" ON "dashboard_indicator_usage" USING btree ("derived_indicator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_indicator_usage_measured_uidx" ON "dashboard_indicator_usage" USING btree ("dashboard_id","product_run_id","indicator_id") WHERE "dashboard_indicator_usage"."indicator_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_indicator_usage_derived_uidx" ON "dashboard_indicator_usage" USING btree ("dashboard_id","product_run_id","derived_indicator_id") WHERE "dashboard_indicator_usage"."derived_indicator_id" is not null;--> statement-breakpoint
CREATE INDEX "report_indicator_usage_report_idx" ON "report_indicator_usage" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_indicator_usage_product_run_idx" ON "report_indicator_usage" USING btree ("product_run_id");--> statement-breakpoint
CREATE INDEX "report_indicator_usage_indicator_idx" ON "report_indicator_usage" USING btree ("indicator_id");--> statement-breakpoint
CREATE INDEX "report_indicator_usage_derived_indicator_idx" ON "report_indicator_usage" USING btree ("derived_indicator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_indicator_usage_measured_uidx" ON "report_indicator_usage" USING btree ("report_id","product_run_id","indicator_id") WHERE "report_indicator_usage"."indicator_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "report_indicator_usage_derived_uidx" ON "report_indicator_usage" USING btree ("report_id","product_run_id","derived_indicator_id") WHERE "report_indicator_usage"."derived_indicator_id" is not null;
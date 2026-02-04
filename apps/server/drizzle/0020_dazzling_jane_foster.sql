CREATE TABLE "derived_indicator" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"unit" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"category_id" text,
	"expression" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "derived_indicator_to_indicator" (
	"derived_indicator_id" text NOT NULL,
	"indicator_id" text NOT NULL,
	CONSTRAINT "derived_indicator_to_indicator_derived_indicator_id_indicator_id_pk" PRIMARY KEY("derived_indicator_id","indicator_id")
);
--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD CONSTRAINT "derived_indicator_category_id_indicator_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."indicator_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derived_indicator_to_indicator" ADD CONSTRAINT "derived_indicator_to_indicator_derived_indicator_id_derived_indicator_id_fk" FOREIGN KEY ("derived_indicator_id") REFERENCES "public"."derived_indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derived_indicator_to_indicator" ADD CONSTRAINT "derived_indicator_to_indicator_indicator_id_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "derived_indicator_category_idx" ON "derived_indicator" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "derived_indicator_name_idx" ON "derived_indicator" USING btree ("name");--> statement-breakpoint
CREATE INDEX "derived_indicator_category_order_idx" ON "derived_indicator" USING btree ("category_id","display_order");
ALTER TABLE "geometry_output" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "geometry_output" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_output" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "product_output" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "product_output" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
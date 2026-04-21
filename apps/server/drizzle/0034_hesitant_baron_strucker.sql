ALTER TABLE "dashboard" DROP CONSTRAINT "dashboard_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "dataset" DROP CONSTRAINT "dataset_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "derived_indicator" DROP CONSTRAINT "derived_indicator_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "geometries" DROP CONSTRAINT "geometries_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "indicator" DROP CONSTRAINT "indicator_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "indicator_category" DROP CONSTRAINT "indicator_category_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "product" DROP CONSTRAINT "product_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "report" DROP CONSTRAINT "report_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "report" DROP CONSTRAINT "report_published_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "dashboard" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "derived_indicator" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "geometries" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_category" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard" ADD CONSTRAINT "dashboard_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derived_indicator" ADD CONSTRAINT "derived_indicator_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator" ADD CONSTRAINT "indicator_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_category" ADD CONSTRAINT "indicator_category_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_published_by_user_id_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
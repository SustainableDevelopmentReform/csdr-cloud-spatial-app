ALTER TABLE "variable" DROP CONSTRAINT "variable_name_category_unique";--> statement-breakpoint
ALTER TABLE "variable" ALTER COLUMN "category_id" DROP NOT NULL;
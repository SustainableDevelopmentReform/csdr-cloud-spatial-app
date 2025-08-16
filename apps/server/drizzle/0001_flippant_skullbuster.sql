CREATE TYPE "public"."time_precision" AS ENUM('hour', 'day', 'month', 'year');--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "time_precision" time_precision NOT NULL;--> statement-breakpoint
ALTER TABLE "product_output" ADD COLUMN "time_point" timestamp NOT NULL;
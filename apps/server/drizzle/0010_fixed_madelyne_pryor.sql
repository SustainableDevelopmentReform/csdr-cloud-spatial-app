CREATE TYPE "public"."dataset_run_data_type" AS ENUM('parquet', 'geoparquet', 'stac-geoparquet', 'zarr');--> statement-breakpoint
CREATE TYPE "public"."geometries_run_data_type" AS ENUM('geoparquet');--> statement-breakpoint
CREATE TYPE "public"."product_run_data_type" AS ENUM('parquet');--> statement-breakpoint
ALTER TABLE "dataset" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "dataset" ADD COLUMN "source_metadata_url" text;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "image_code" text;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "image_tag" text;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "provenance_json" jsonb;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "provenance_url" text;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "data_url" text;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "data_size" integer;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "data_etag" text;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD COLUMN "data_type" "dataset_run_data_type";--> statement-breakpoint
ALTER TABLE "geometries" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "geometries" ADD COLUMN "source_metadata_url" text;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "image_code" text;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "image_tag" text;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "provenance_json" jsonb;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "provenance_url" text;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "data_url" text;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "data_size" integer;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "data_etag" text;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD COLUMN "data_type" "geometries_run_data_type";--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "image_code" text;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "image_tag" text;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "provenance_json" jsonb;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "provenance_url" text;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "data_url" text;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "data_size" integer;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "data_etag" text;--> statement-breakpoint
ALTER TABLE "product_run" ADD COLUMN "data_type" "product_run_data_type";
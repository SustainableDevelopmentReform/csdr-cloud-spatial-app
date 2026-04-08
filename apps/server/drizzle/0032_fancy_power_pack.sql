ALTER TABLE "report" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "published_by_user_id" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "published_pdf_key" text;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_published_by_user_id_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_published_at_idx" ON "report" USING btree ("published_at");

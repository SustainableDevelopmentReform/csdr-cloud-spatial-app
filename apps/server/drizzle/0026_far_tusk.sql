CREATE TYPE "public"."workflow_status" AS ENUM('Started', 'Succeeded', 'Failed', 'Error');--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "workflow_status" NOT NULL,
	"message" text,
	"input_parameters" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_workflows_user_id" ON "workflows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workflows_id_user_id" ON "workflows" USING btree ("id","user_id");
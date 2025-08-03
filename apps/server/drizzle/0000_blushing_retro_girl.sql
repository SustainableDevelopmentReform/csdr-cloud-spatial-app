CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dataset" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dataset_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dataset_run" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"parameters" jsonb,
	"dataset_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geometries" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "geometries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "geometries_run" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"parameters" jsonb,
	"geometries_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geometry_output" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"geometries_run_id" text NOT NULL,
	"name" text NOT NULL,
	"properties" jsonb,
	"geometry" jsonb NOT NULL,
	CONSTRAINT "geometry_name_per_run" UNIQUE("geometries_run_id","name")
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"dataset_id" text NOT NULL,
	"geometries_id" text NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_output" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"product_run_id" text NOT NULL,
	"geometry_output_id" text NOT NULL,
	"value" numeric NOT NULL,
	"variable_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_run" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"parameters" jsonb,
	"product_id" text NOT NULL,
	"dataset_run_id" text NOT NULL,
	"geometries_run_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_anonymous" boolean,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	"two_factor_enabled" boolean,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "variable" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" text,
	"display_order" integer DEFAULT 0,
	"category_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "variable_name_category_unique" UNIQUE("name","category_id")
);
--> statement-breakpoint
CREATE TABLE "variable_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_id" text,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset_run" ADD CONSTRAINT "dataset_run_dataset_id_dataset_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."dataset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries_run" ADD CONSTRAINT "geometries_run_geometries_id_geometries_id_fk" FOREIGN KEY ("geometries_id") REFERENCES "public"."geometries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometry_output" ADD CONSTRAINT "geometry_output_geometries_run_id_geometries_run_id_fk" FOREIGN KEY ("geometries_run_id") REFERENCES "public"."geometries_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_dataset_id_dataset_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."dataset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_geometries_id_geometries_id_fk" FOREIGN KEY ("geometries_id") REFERENCES "public"."geometries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output" ADD CONSTRAINT "product_output_product_run_id_product_run_id_fk" FOREIGN KEY ("product_run_id") REFERENCES "public"."product_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output" ADD CONSTRAINT "product_output_geometry_output_id_geometry_output_id_fk" FOREIGN KEY ("geometry_output_id") REFERENCES "public"."geometry_output"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_output" ADD CONSTRAINT "product_output_variable_id_variable_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."variable"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_run" ADD CONSTRAINT "product_run_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_run" ADD CONSTRAINT "product_run_dataset_run_id_dataset_run_id_fk" FOREIGN KEY ("dataset_run_id") REFERENCES "public"."dataset_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_run" ADD CONSTRAINT "product_run_geometries_run_id_geometries_run_id_fk" FOREIGN KEY ("geometries_run_id") REFERENCES "public"."geometries_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable" ADD CONSTRAINT "variable_category_id_variable_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."variable_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable_category" ADD CONSTRAINT "variable_category_parent_id_variable_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."variable_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dataset_name_idx" ON "dataset" USING btree ("name");--> statement-breakpoint
CREATE INDEX "dataset_created_at_idx" ON "dataset" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "dataset_run_dataset_idx" ON "dataset_run" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "dataset_run_created_at_idx" ON "dataset_run" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "geometries_name_idx" ON "geometries" USING btree ("name");--> statement-breakpoint
CREATE INDEX "geometries_created_at_idx" ON "geometries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "geometries_run_geometries_idx" ON "geometries_run" USING btree ("geometries_id");--> statement-breakpoint
CREATE INDEX "geometries_run_created_at_idx" ON "geometries_run" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "geometry_geometries_run_idx" ON "geometry_output" USING btree ("geometries_run_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_organization_id_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_name_idx" ON "product" USING btree ("name");--> statement-breakpoint
CREATE INDEX "product_dataset_id_idx" ON "product" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "product_geometries_id_idx" ON "product" USING btree ("geometries_id");--> statement-breakpoint
CREATE INDEX "product_created_at_idx" ON "product" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_output_product_run_idx" ON "product_output" USING btree ("product_run_id");--> statement-breakpoint
CREATE INDEX "product_output_created_at_idx" ON "product_output" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_output_geometry_output_id_idx" ON "product_output" USING btree ("geometry_output_id");--> statement-breakpoint
CREATE INDEX "product_output_variable_id_idx" ON "product_output" USING btree ("variable_id");--> statement-breakpoint
CREATE INDEX "product_output_run_variable_idx" ON "product_output" USING btree ("product_run_id","variable_id");--> statement-breakpoint
CREATE INDEX "product_run_dataset_idx" ON "product_run" USING btree ("dataset_run_id");--> statement-breakpoint
CREATE INDEX "product_run_geometries_idx" ON "product_run" USING btree ("geometries_run_id");--> statement-breakpoint
CREATE INDEX "product_run_created_at_idx" ON "product_run" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "two_factor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "variable_category_idx" ON "variable" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "variable_name_idx" ON "variable" USING btree ("name");--> statement-breakpoint
CREATE INDEX "variable_category_order_idx" ON "variable" USING btree ("category_id","display_order");--> statement-breakpoint
CREATE INDEX "variable_category_parent_idx" ON "variable_category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "variable_category_name_idx" ON "variable_category" USING btree ("name");--> statement-breakpoint
CREATE INDEX "variable_category_parent_order_idx" ON "variable_category" USING btree ("parent_id","display_order");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
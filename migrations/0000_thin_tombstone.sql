CREATE TABLE "analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"photo_id" integer NOT NULL,
	"summary" text NOT NULL,
	"overall_score" integer NOT NULL,
	"tags" text[] NOT NULL,
	"category_scores" jsonb NOT NULL,
	"analysis" jsonb NOT NULL,
	"focus_point" text NOT NULL,
	"persona" text NOT NULL,
	"detail_level" text NOT NULL,
	"language" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"original_filename" text NOT NULL,
	"display_image_path" text NOT NULL,
	"analysis_image_path" text NOT NULL,
	"exif_data" jsonb,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
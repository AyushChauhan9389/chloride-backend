ALTER TABLE "shortened_urls" ADD COLUMN "expires_in" integer;--> statement-breakpoint
ALTER TABLE "shortened_urls" ADD COLUMN "presigned_at" timestamp;
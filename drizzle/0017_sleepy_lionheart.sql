CREATE TYPE "public"."bank_account_status" AS ENUM('unverified', 'verified', 'failed');--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_code" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_account_status" "bank_account_status" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_account_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "bank_account_validation_message" text;
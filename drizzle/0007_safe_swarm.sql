ALTER TABLE "customer_addresses" ALTER COLUMN "province_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "street_name" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "house_number" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "rt" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "rw" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "province_id" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "regency_id" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "district_id" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "village_id" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "village_name" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "district_name" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "regency_name" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "longitude" numeric(10, 7);
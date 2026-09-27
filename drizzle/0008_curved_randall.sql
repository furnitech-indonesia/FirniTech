DROP INDEX "shipping_tenant_city_uniq";--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD COLUMN "regency_id" text;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_tenant_regency_uniq" ON "shipping_rates" USING btree ("tenant_id","regency_id") WHERE "shipping_rates"."regency_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_one_default_uniq" ON "shipping_rates" USING btree ("tenant_id") WHERE "shipping_rates"."is_default" = true;
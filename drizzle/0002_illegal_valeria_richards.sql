ALTER TABLE "orders" ADD COLUMN "customer_address_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_address_id_customer_addresses_id_fk" FOREIGN KEY ("customer_address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "address_default_per_phone_uniq" ON "customer_addresses" USING btree ("tenant_id","customer_phone") WHERE "customer_addresses"."is_default" = true;--> statement-breakpoint
CREATE INDEX "order_customer_addr_idx" ON "orders" USING btree ("customer_address_id");
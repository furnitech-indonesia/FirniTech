ALTER TYPE "public"."user_role" ADD VALUE 'kurir';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "assigned_courier_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_courier_id_users_id_fk" FOREIGN KEY ("assigned_courier_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_courier_idx" ON "orders" USING btree ("assigned_courier_id");
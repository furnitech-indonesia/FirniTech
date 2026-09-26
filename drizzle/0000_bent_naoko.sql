CREATE TYPE "public"."billing_period" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."integration_service" AS ENUM('midtrans', 'iris', 'cloudflare', 'fonnte', 'firebase', 'supabase');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('whatsapp', 'push');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_dp', 'in_production', 'quality_control', 'ready_to_ship', 'shipped', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'dp_paid', 'fully_paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_slot" AS ENUM('morning', 'evening');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('queued', 'processing', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."progress_stage" AS ENUM('bahan_dipotong', 'perakitan', 'finishing', 'qc', 'packing');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('basic', 'pro', 'max');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'owner', 'admin_penjualan', 'tukang');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"custom_domain" text,
	"custom_domain_verified" boolean DEFAULT false NOT NULL,
	"bank_name" text,
	"bank_account_number" text,
	"bank_account_name" text,
	"plan" "subscription_plan" DEFAULT 'basic' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'active' NOT NULL,
	"subscription_expires_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"email" text,
	"full_name" text NOT NULL,
	"phone" text,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
	"unit" text NOT NULL,
	"min_stock_alert" numeric(12, 3) DEFAULT '5' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"length_cm" integer NOT NULL,
	"width_cm" integer NOT NULL,
	"height_cm" integer NOT NULL,
	"wood_type" text NOT NULL,
	"finishing_type" text NOT NULL,
	"base_price" bigint NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_phone" text NOT NULL,
	"recipient_name" text NOT NULL,
	"address_line" text NOT NULL,
	"city_name" text NOT NULL,
	"province_name" text NOT NULL,
	"postal_code" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"city_name" text NOT NULL,
	"province_name" text NOT NULL,
	"rate_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"custom_specs" jsonb,
	"price" bigint NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_code" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_address" text NOT NULL,
	"destination_city" text NOT NULL,
	"items_subtotal" bigint NOT NULL,
	"shipping_fee" bigint NOT NULL,
	"total_amount" bigint NOT NULL,
	"midtrans_mdr_fee" bigint DEFAULT 0 NOT NULL,
	"platform_service_fee" bigint DEFAULT 0 NOT NULL,
	"net_tenant_amount" bigint DEFAULT 0 NOT NULL,
	"dp_amount" bigint DEFAULT 0 NOT NULL,
	"midtrans_order_id" text,
	"snap_token" text,
	"transaction_id" text,
	"paid_at" timestamp with time zone,
	"order_status" "order_status" DEFAULT 'pending_dp' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"assigned_carpenter_id" uuid,
	"cargo_name" text,
	"tracking_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"carpenter_id" uuid,
	"carpenter_name" text NOT NULL,
	"stage" "progress_stage" NOT NULL,
	"photo_url" text NOT NULL,
	"notes" text,
	"wa_notification_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" uuid NOT NULL,
	"order_id" uuid,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"bank_name" text NOT NULL,
	"bank_account_number" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"iris_reference_id" text,
	"status" "payout_status" DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"slot" "payout_slot" NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"executed_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"service" "integration_service" NOT NULL,
	"action" text NOT NULL,
	"status" "integration_status" NOT NULL,
	"request_meta" jsonb,
	"response_meta" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"period_start" date NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saas_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan" "subscription_plan" NOT NULL,
	"period" "billing_period" NOT NULL,
	"amount" bigint NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"midtrans_order_id" text,
	"transaction_id" text,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_carpenter_id_users_id_fk" FOREIGN KEY ("assigned_carpenter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_progress" ADD CONSTRAINT "production_progress_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_progress" ADD CONSTRAINT "production_progress_carpenter_id_users_id_fk" FOREIGN KEY ("carpenter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_payout_id_payout_logs_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payout_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_logs" ADD CONSTRAINT "payout_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_audit_logs" ADD CONSTRAINT "integration_audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_usage" ADD CONSTRAINT "notification_usage_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saas_invoices" ADD CONSTRAINT "saas_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_domain_idx" ON "tenants" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "user_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "material_tenant_idx" ON "materials" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "product_tenant_idx" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_tenant_slug_idx" ON "products" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "address_tenant_phone_idx" ON "customer_addresses" USING btree ("tenant_id","customer_phone");--> statement-breakpoint
CREATE INDEX "shipping_tenant_city_idx" ON "shipping_rates" USING btree ("tenant_id","city_name");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_tenant_city_uniq" ON "shipping_rates" USING btree ("tenant_id",lower("city_name"));--> statement-breakpoint
CREATE INDEX "order_item_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_tenant_idx" ON "orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "order_tenant_status_idx" ON "orders" USING btree ("tenant_id","order_status");--> statement-breakpoint
CREATE UNIQUE INDEX "order_code_idx" ON "orders" USING btree ("order_code");--> statement-breakpoint
CREATE UNIQUE INDEX "order_midtrans_idx" ON "orders" USING btree ("midtrans_order_id");--> statement-breakpoint
CREATE INDEX "progress_order_idx" ON "production_progress" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "progress_carpenter_idx" ON "production_progress" USING btree ("carpenter_id");--> statement-breakpoint
CREATE INDEX "payout_item_payout_idx" ON "payout_items" USING btree ("payout_id");--> statement-breakpoint
CREATE INDEX "payout_item_order_idx" ON "payout_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payout_tenant_idx" ON "payout_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payout_slot_status_idx" ON "payout_logs" USING btree ("slot","status");--> statement-breakpoint
CREATE INDEX "audit_tenant_created_idx" ON "integration_audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_service_idx" ON "integration_audit_logs" USING btree ("service","status");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_usage_uniq" ON "notification_usage" USING btree ("tenant_id","channel","period_start");--> statement-breakpoint
CREATE INDEX "saas_invoice_tenant_idx" ON "saas_invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "saas_invoice_status_idx" ON "saas_invoices" USING btree ("status","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "saas_invoice_midtrans_idx" ON "saas_invoices" USING btree ("midtrans_order_id");
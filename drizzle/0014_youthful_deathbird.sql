CREATE TABLE "delivery_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"courier_id" uuid NOT NULL,
	"photo_path" text NOT NULL,
	"signature_path" text NOT NULL,
	"signer_name" text NOT NULL,
	"notes" text,
	"cod_amount" bigint,
	"cod_proof_path" text,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_courier_id_users_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_proof_order_uniq" ON "delivery_proofs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "delivery_proof_courier_idx" ON "delivery_proofs" USING btree ("courier_id");--> statement-breakpoint
CREATE INDEX "delivery_proof_tenant_idx" ON "delivery_proofs" USING btree ("tenant_id");
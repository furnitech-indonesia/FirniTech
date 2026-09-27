CREATE TABLE "tenant_bank_accounts" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"bank_code" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"status" "bank_account_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"validation_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_bank_accounts" ADD CONSTRAINT "tenant_bank_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
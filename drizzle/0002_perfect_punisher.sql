CREATE TABLE "app_advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app" varchar(50) DEFAULT 'uber' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"date" varchar(10) NOT NULL,
	"month" varchar(7) NOT NULL,
	"payment_destination" varchar(50) DEFAULT 'Mercado Pago' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"month" varchar(7) NOT NULL,
	"theoretical_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"real_cash" numeric(12, 2) DEFAULT '0' NOT NULL,
	"real_bank" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_real" numeric(12, 2) DEFAULT '0' NOT NULL,
	"difference" numeric(12, 2) DEFAULT '0' NOT NULL,
	"adjustment_type" varchar(50) DEFAULT 'none' NOT NULL,
	"adjustment_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "due_day" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "app_advances" ADD CONSTRAINT "app_advances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
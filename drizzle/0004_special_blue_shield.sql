CREATE TABLE "food_budget_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	"budget_type" varchar(50) DEFAULT 'hybrid' NOT NULL,
	"monthly_budget" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_shared" boolean DEFAULT true NOT NULL,
	"user_share_pct" numeric(5, 2) DEFAULT '60.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"household_id" uuid,
	"month" varchar(7) NOT NULL,
	"store_name" varchar(150) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" varchar(10) NOT NULL,
	"payment_method" varchar(50) DEFAULT 'Efectivo' NOT NULL,
	"is_shared" boolean DEFAULT true NOT NULL,
	"user_share_pct" numeric(5, 2) DEFAULT '60.00' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_budget_settings" ADD CONSTRAINT "food_budget_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_expenses" ADD CONSTRAINT "food_expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_expenses" ADD CONSTRAINT "food_expenses_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "food_budget_user_month_idx" ON "food_budget_settings" USING btree ("user_id","month");
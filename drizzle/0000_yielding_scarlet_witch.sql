CREATE TABLE "daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"gross_income" numeric(12, 2) DEFAULT '0' NOT NULL,
	"app_breakdown" json DEFAULT '{}'::json,
	"fuel_expense" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_expense" numeric(12, 2) DEFAULT '0' NOT NULL,
	"odometer_km" integer DEFAULT 0 NOT NULL,
	"minutes_worked" integer DEFAULT 0 NOT NULL,
	"trips_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"type" varchar(50) DEFAULT 'fixed' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"installment_count" integer DEFAULT 1 NOT NULL,
	"installment_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"start_month" varchar(7) NOT NULL,
	"end_month" varchar(7),
	"is_shared" boolean DEFAULT false NOT NULL,
	"user_share_pct" numeric(5, 2) DEFAULT '100' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'Efectivo' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"maintenance_id" uuid,
	"maintenance_name" varchar(255) NOT NULL,
	"service_date" varchar(10) NOT NULL,
	"service_km" integer DEFAULT 0 NOT NULL,
	"cost_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"workshop_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"driver_type" varchar(50) DEFAULT 'owner' NOT NULL,
	"active_apps" json DEFAULT '["uber","cabify","didi"]'::json,
	"module_driver" boolean DEFAULT true NOT NULL,
	"module_expenses" boolean DEFAULT true NOT NULL,
	"module_vehicle" boolean DEFAULT true NOT NULL,
	"theme_preference" varchar(20) DEFAULT 'dark' NOT NULL,
	"telegram_chat_id" varchar(100),
	"telegram_alert_days" integer DEFAULT 5,
	"telegram_enabled" boolean DEFAULT false NOT NULL,
	"subscription_status" varchar(50) DEFAULT 'trial' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_maintenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"tracking_type" varchar(50) DEFAULT 'hybrid' NOT NULL,
	"interval_km" integer DEFAULT 10000 NOT NULL,
	"interval_months" integer DEFAULT 12 NOT NULL,
	"fixed_due_month" integer,
	"fixed_due_day" integer DEFAULT 30,
	"last_service_km" integer DEFAULT 0 NOT NULL,
	"last_service_date" varchar(10),
	"next_due_date" varchar(10),
	"estimated_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"category" varchar(100) DEFAULT 'Motor / Service' NOT NULL,
	"priority" varchar(50) DEFAULT 'normal' NOT NULL,
	"is_document" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_maintenance_id_vehicle_maintenance_id_fk" FOREIGN KEY ("maintenance_id") REFERENCES "public"."vehicle_maintenance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_maintenance" ADD CONSTRAINT "vehicle_maintenance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_logs_user_date_idx" ON "daily_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_key_idx" ON "user_settings" USING btree ("user_id","key");
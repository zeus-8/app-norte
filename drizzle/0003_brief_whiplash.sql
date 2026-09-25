ALTER TABLE "app_advances" ADD COLUMN "expense_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_reconciliations" ADD COLUMN "real_apps" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_advances" ADD CONSTRAINT "app_advances_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE set null ON UPDATE no action;
-- ==============================================================================
-- AUTOGASTOS SAAS - SCRIPT SQL COMPLETO PARA SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Instrucciones para REHACER / RESETEAR de cero:
-- 1. Abre tu proyecto en Supabase (https://supabase.com/dashboard).
-- 2. En el menú izquierdo, ve a "SQL Editor" y haz clic en "New query".
-- 3. Pega este script completo y haz clic en "Run" (ejecutar).
-- 
-- Este script realiza un DROP en cascada de todas las tablas existentes y las 
-- vuelve a crear con todas sus columnas, claves foráneas, índices y datos iniciales.
-- ==============================================================================

-- 0. ELIMINACIÓN LIMPIA (DROP EN CASCADA PARA REHACER DE CERO)
DROP TABLE IF EXISTS "cash_reconciliations" CASCADE;
DROP TABLE IF EXISTS "app_advances" CASCADE;
DROP TABLE IF EXISTS "expense_payments" CASCADE;
DROP TABLE IF EXISTS "expenses" CASCADE;
DROP TABLE IF EXISTS "maintenance_history" CASCADE;
DROP TABLE IF EXISTS "vehicle_maintenance" CASCADE;
DROP TABLE IF EXISTS "daily_logs" CASCADE;
DROP TABLE IF EXISTS "household_members" CASCADE;
DROP TABLE IF EXISTS "households" CASCADE;
DROP TABLE IF EXISTS "user_settings" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Habilitar extensión pgcrypto para generación de UUIDs si no está activa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA: users (SaaS, Perfiles, Choferes y Feature Flags)
CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "name" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'user' NOT NULL, -- 'admin' | 'user'
    "google_id" varchar(255),
    "avatar_url" varchar(500),
    "driver_type" varchar(50) DEFAULT 'owner' NOT NULL, -- 'owner' (auto propio) | 'renter' (alquilado)
    "active_apps" json DEFAULT '["uber","cabify","didi"]'::json,
    "module_driver" boolean DEFAULT true NOT NULL,
    "module_expenses" boolean DEFAULT true NOT NULL,
    "module_vehicle" boolean DEFAULT true NOT NULL,
    "theme_preference" varchar(20) DEFAULT 'dark' NOT NULL,
    "telegram_chat_id" varchar(100),
    "telegram_alert_days" integer DEFAULT 5,
    "telegram_enabled" boolean DEFAULT false NOT NULL,
    "subscription_status" varchar(50) DEFAULT 'trial' NOT NULL, -- 'trial' | 'active' | 'suspended'
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE ("email")
);

-- 2. TABLA: households (Hogar Compartido / Parejas)
CREATE TABLE IF NOT EXISTS "households" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 3. TABLA: household_members (Miembros y División Porcentual 60/40)
CREATE TABLE IF NOT EXISTS "household_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "default_share_pct" numeric(5, 2) DEFAULT '50.00' NOT NULL,
    "status" varchar(50) DEFAULT 'pending' NOT NULL, -- 'accepted' | 'pending'
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 4. TABLA: daily_logs (Jornadas Diarias Multiapp)
CREATE TABLE IF NOT EXISTS "daily_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "date" varchar(10) NOT NULL, -- 'YYYY-MM-DD'
    "gross_income" numeric(12, 2) DEFAULT '0' NOT NULL,
    "app_breakdown" json DEFAULT '{}'::json,
    "fuel_expense" numeric(12, 2) DEFAULT '0' NOT NULL,
    "other_expense" numeric(12, 2) DEFAULT '0' NOT NULL,
    "odometer_km" integer DEFAULT 0 NOT NULL,
    "minutes_worked" integer DEFAULT 0 NOT NULL, -- Minutos exactos (ej. 347 para 5h 47m)
    "trips_count" integer DEFAULT 0 NOT NULL,
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 5. TABLA: vehicle_maintenance (VTV, GNC, Patente y Services Preventivos)
CREATE TABLE IF NOT EXISTS "vehicle_maintenance" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "tracking_type" varchar(50) DEFAULT 'hybrid' NOT NULL, -- 'km' | 'time' | 'hybrid'
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

-- 6. TABLA: maintenance_history (Historial de Services Mecánicos)
CREATE TABLE IF NOT EXISTS "maintenance_history" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "maintenance_id" uuid REFERENCES "vehicle_maintenance"("id") ON DELETE CASCADE,
    "maintenance_name" varchar(255) NOT NULL,
    "service_date" varchar(10) NOT NULL,
    "service_km" integer DEFAULT 0 NOT NULL,
    "cost_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
    "workshop_notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 7. TABLA: expenses (Gastos Fijos, Compras en Cuotas y Hogar)
CREATE TABLE IF NOT EXISTS "expenses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "household_id" uuid REFERENCES "households"("id") ON DELETE SET NULL,
    "name" varchar(255) NOT NULL,
    "category" varchar(100) NOT NULL,
    "type" varchar(50) DEFAULT 'fixed' NOT NULL, -- 'fixed' | 'one_time' | 'installment'
    "total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
    "installment_count" integer DEFAULT 1 NOT NULL,
    "installment_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
    "start_month" varchar(7) NOT NULL, -- 'YYYY-MM'
    "end_month" varchar(7),
    "due_day" integer DEFAULT 5,
    "is_shared" boolean DEFAULT false NOT NULL,
    "user_share_pct" numeric(5, 2) DEFAULT '100' NOT NULL,
    "payment_method" varchar(50) DEFAULT 'Efectivo' NOT NULL,
    "status" varchar(50) DEFAULT 'active' NOT NULL, -- 'active' | 'paid' | 'cancelled'
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 8. TABLA: expense_payments (Checklist de Pagos Mensuales / Flujo de Caja)
CREATE TABLE IF NOT EXISTS "expense_payments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "expense_id" uuid NOT NULL REFERENCES "expenses"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "month" varchar(7) NOT NULL, -- 'YYYY-MM'
    "is_paid" boolean DEFAULT false NOT NULL,
    "paid_at" timestamp,
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 9. TABLA: user_settings (Configuraciones Personalizadas por Usuario)
CREATE TABLE IF NOT EXISTS "user_settings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "key" varchar(100) NOT NULL,
    "value" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 10. TABLA: app_advances (Adelantos y Retiros Anticipados de Apps de Movilidad)
CREATE TABLE IF NOT EXISTS "app_advances" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "app" varchar(50) DEFAULT 'uber' NOT NULL,
    "amount" numeric(12, 2) DEFAULT '0' NOT NULL,
    "date" varchar(10) NOT NULL,
    "month" varchar(7) NOT NULL,
    "payment_destination" varchar(50) DEFAULT 'Mercado Pago' NOT NULL,
    "expense_id" uuid REFERENCES "expenses"("id") ON DELETE SET NULL,
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 11. TABLA: cash_reconciliations (Arqueos / Blanqueos y Conciliaciones de Caja)
CREATE TABLE IF NOT EXISTS "cash_reconciliations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "date" varchar(10) NOT NULL,
    "month" varchar(7) NOT NULL,
    "theoretical_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
    "real_cash" numeric(12, 2) DEFAULT '0' NOT NULL,
    "real_bank" numeric(12, 2) DEFAULT '0' NOT NULL,
    "real_apps" numeric(12, 2) DEFAULT '0' NOT NULL,
    "total_real" numeric(12, 2) DEFAULT '0' NOT NULL,
    "difference" numeric(12, 2) DEFAULT '0' NOT NULL,
    "adjustment_type" varchar(50) DEFAULT 'none' NOT NULL, -- 'none' | 'unrecorded_expense' | 'savings_transfer' | 'direct_adjustment'
    "adjustment_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO Y UNICIDAD
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "daily_logs_user_date_idx" ON "daily_logs" ("user_id", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "expense_payments_user_month_idx" ON "expense_payments" ("expense_id", "user_id", "month");
CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_key_idx" ON "user_settings" ("user_id", "key");
CREATE INDEX IF NOT EXISTS "app_advances_user_month_idx" ON "app_advances" ("user_id", "month");
CREATE INDEX IF NOT EXISTS "cash_reconciliations_user_month_idx" ON "cash_reconciliations" ("user_id", "month");

-- ==============================================================================
-- USUARIOS INICIALES (SEED BÁSICO)
-- ==============================================================================
-- 1. Administrador: admin@autogastos.com / admin123
-- 2. Chofer Demo:   juan@chofer.com / juan123
INSERT INTO "users" (
    "id", 
    "email", 
    "password_hash", 
    "name", 
    "role", 
    "driver_type", 
    "active_apps", 
    "module_driver", 
    "module_expenses", 
    "module_vehicle", 
    "theme_preference", 
    "subscription_status"
) VALUES 
(
    'a0000000-0000-0000-0000-000000000001', 
    'admin@autogastos.com', 
    '$2a$10$QJbsqu0wFBwEnIE8/Kz7MOdTLJiQEEd0lBKAXvFBamdAaGnPGENi2', 
    'Administrador General', 
    'admin', 
    'owner', 
    '["uber","cabify","didi","rappi","pedidosya","indrive"]'::json, 
    true, 
    true, 
    true, 
    'dark', 
    'active'
),
(
    'a0000000-0000-0000-0000-000000000002', 
    'juan@chofer.com', 
    '$2a$10$xC7HqMClMHLhLR0KTnqmvOyWYnJTi1JFNnhMDX3ENovWwlI8JO2me', 
    'Juan Chofer', 
    'user', 
    'owner', 
    '["uber","cabify","didi"]'::json, 
    true, 
    true, 
    true, 
    'dark', 
    'active'
)
ON CONFLICT ("email") DO NOTHING;

-- 3. Odómetro base de Juan Chofer
INSERT INTO "user_settings" ("id", "user_id", "key", "value")
VALUES (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'current_odometer', '145000')
ON CONFLICT ("user_id", "key") DO NOTHING;

-- 4. Catálogo de Mantenimiento Vehicular de Juan
INSERT INTO "vehicle_maintenance" (
    "id", "user_id", "name", "tracking_type", "interval_km", "interval_months", 
    "fixed_due_month", "fixed_due_day", "last_service_km", "last_service_date", 
    "estimated_cost", "category", "priority", "is_document", "notes"
) VALUES
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Oblea GNC (Permiso Anual)', 'time', 0, 12, 11, 30, 0, '2025-11-25', 28000, 'Documentación / GNC', 'high', true, 'Renovación anual obligatoria según placa'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'VTV (Verificación Técnica Vehicular)', 'time', 0, 12, 11, 30, 0, '2025-11-25', 44000, 'Documentación / Legal', 'high', true, 'Vence cada Noviembre por terminación de patente'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Prueba Hidráulica GNC (5 Años)', 'time', 0, 60, null, 30, 0, '2023-04-10', 130000, 'Documentación / GNC', 'normal', true, 'Prueba de cilindros de GNC cada 5 años'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Impuesto de Patente Automotor', 'time', 0, 2, null, 10, 0, '2026-07-10', 38000, 'Impuestos / Patente', 'high', true, 'Impuesto bimestral automotor'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Cambio de Aceite y Filtros', 'hybrid', 10000, 12, null, 30, 140000, '2026-05-10', 95000, 'Motor / Service', 'high', false, 'Aceite sintético + filtros (cada 10.000 km o 1 año)'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Juego de Cubiertas (Neumáticos)', 'hybrid', 50000, 60, null, 30, 115000, '2023-06-01', 360000, 'Neumáticos', 'normal', false, '4 cubiertas nuevas cada 50.000 km o 5 años'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Correa de Distribución y Bomba', 'hybrid', 50000, 48, null, 30, 110000, '2024-03-15', 180000, 'Motor / Distribución', 'high', false, 'Kit completo de distribución + bomba de agua'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Batería', 'hybrid', 60000, 24, null, 30, 125000, '2025-01-20', 110000, 'Eléctrico', 'normal', false, 'Batería 12V 65Ah'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Bujías y Cables / Encendido', 'hybrid', 40000, 24, null, 30, 120000, '2025-03-01', 55000, 'Encendido', 'normal', false, 'Bujías calibradas para GNC'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Pastillas de Freno Delanteras', 'km', 25000, 24, null, 30, 130000, '2025-08-01', 65000, 'Frenos', 'high', false, 'Discos y pastillas'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Alineación y Balanceo', 'km', 10000, 6, null, 30, 142000, '2026-06-15', 35000, 'Neumáticos / Chasis', 'normal', false, 'Rotación y balanceo')
ON CONFLICT DO NOTHING;

-- 5. Gastos Fijos y Compras en Cuotas de Ejemplo
INSERT INTO "expenses" (
    "id", "user_id", "name", "category", "type", "total_amount", "installment_count", 
    "installment_amount", "start_month", "end_month", "due_day", "is_shared", 
    "user_share_pct", "payment_method", "status", "notes"
) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Alquiler', 'Hogar', 'fixed', 820000, 1, 820000, '2026-01', null, 5, true, 60, 'Transferencia', 'active', 'Alquiler compartido'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Comida / Supermercado', 'Hogar', 'fixed', 600000, 1, 600000, '2026-01', null, 5, true, 60, 'Efectivo', 'active', 'Comida mensual'),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Luz (Electricidad)', 'Hogar', 'fixed', 32500, 1, 32500, '2026-01', null, 10, true, 60, 'Transferencia', 'active', 'Servicio eléctrico'),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Gas del Hogar', 'Hogar', 'fixed', 24500, 1, 24500, '2026-01', null, 12, true, 60, 'Transferencia', 'active', 'Servicio de gas'),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Seguro Auto', 'Auto', 'fixed', 95000, 1, 95000, '2026-01', null, 15, false, 100, 'Débito', 'active', 'Seguro chofer'),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'GPS Auto / Rastreo', 'Auto', 'fixed', 23200, 1, 23200, '2026-01', null, 20, false, 100, 'Débito', 'active', 'Rastreo satelital'),
('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'Celular Plan', 'Personal', 'fixed', 20000, 1, 20000, '2026-01', null, 22, false, 100, 'Débito', 'active', 'Línea de trabajo'),
('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Lavadora', 'Tarjeta MASTER', 'installment', 379525, 12, 31627.08, '2025-12', '2026-11', 10, false, 100, 'MASTER', 'active', '12 cuotas fijas'),
('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'Televisor', 'Tarjeta MASTER', 'installment', 612000, 12, 51000, '2025-12', '2026-11', 10, false, 100, 'MASTER', 'active', '12 cuotas TV'),
('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Celular Cuotas', 'Tarjeta VISA', 'installment', 70000, 12, 5833.33, '2025-12', '2026-11', 12, false, 100, 'VISA', 'active', '12 cuotas')
ON CONFLICT DO NOTHING;

-- 6. Checklist de Pagos del Mes de Ejemplo
INSERT INTO "expense_payments" ("id", "expense_id", "user_id", "month", "is_paid", "paid_at", "notes")
VALUES
(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', to_char(now(), 'YYYY-MM'), true, now(), 'Alquiler pagado'),
(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', to_char(now(), 'YYYY-MM'), true, now(), 'Seguro debitado')
ON CONFLICT ("expense_id", "user_id", "month") DO NOTHING;

-- 7. Jornadas Multiapp de Ejemplo (Mes Corriente)
INSERT INTO "daily_logs" (
    "id", "user_id", "date", "gross_income", "app_breakdown", "fuel_expense", 
    "other_expense", "odometer_km", "minutes_worked", "trips_count", "notes"
) VALUES
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', to_char(now() - interval '3 days', 'YYYY-MM-DD'), 54000, '{"uber": 32000, "cabify": 22000}'::json, 11000, 1500, 144200, 480, 16, 'Mañana movida en Uber y Cabify'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', to_char(now() - interval '2 days', 'YYYY-MM-DD'), 49500, '{"uber": 28000, "didi": 21500}'::json, 9800, 0, 144380, 450, 14, 'Tarde tranquila'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', to_char(now() - interval '1 day', 'YYYY-MM-DD'), 63000, '{"uber": 38000, "cabify": 25000}'::json, 12500, 2000, 144600, 547, 19, 'Viernes fuerte: 9h 07m'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', to_char(now(), 'YYYY-MM-DD'), 58500, '{"uber": 35000, "didi": 23500}'::json, 11200, 0, 144820, 511, 18, 'Sábado movido: 8h 31m')
ON CONFLICT ("user_id", "date") DO NOTHING;

-- 8. Adelanto de App de Prueba
INSERT INTO "app_advances" ("id", "user_id", "app", "amount", "date", "month", "payment_destination", "notes")
VALUES (
    gen_random_uuid(), 
    'a0000000-0000-0000-0000-000000000002', 
    'uber', 
    40000, 
    to_char(now(), 'YYYY-MM-DD'), 
    to_char(now(), 'YYYY-MM'), 
    'Mercado Pago', 
    'Cobro anticipado Flash para emergencias'
);

-- 9. Arqueo y Conciliación de Caja de Prueba
INSERT INTO "cash_reconciliations" (
    "id", "user_id", "date", "month", "theoretical_balance", "real_cash", 
    "real_bank", "total_real", "difference", "adjustment_type", "adjustment_amount", "notes"
) VALUES (
    gen_random_uuid(), 
    'a0000000-0000-0000-0000-000000000002', 
    to_char(now(), 'YYYY-MM-DD'), 
    to_char(now(), 'YYYY-MM'), 
    110000, 
    60000, 
    50000, 
    110000, 
    0, 
    'none', 
    0, 
    'Arqueo de fin de semana: caja cuadrada al 100%'
);

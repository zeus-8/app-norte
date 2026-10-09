-- Migración: Módulo de Préstamos
-- Ejecutar en Supabase SQL Editor

-- Tabla de préstamos
CREATE TABLE IF NOT EXISTS loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lender_name VARCHAR(255) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  start_date VARCHAR(10) NOT NULL,
  scheduled_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  scheduled_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla de pagos de préstamos
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  date VARCHAR(10) NOT NULL,
  month VARCHAR(7) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS loans_user_id_idx ON loans(user_id);
CREATE INDEX IF NOT EXISTS loans_status_idx ON loans(status);
CREATE INDEX IF NOT EXISTS loan_payments_loan_id_idx ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS loan_payments_user_id_idx ON loan_payments(user_id);
CREATE INDEX IF NOT EXISTS loan_payments_month_idx ON loan_payments(month);

-- RLS (Row Level Security) — habilitar si usás Supabase Auth
-- ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

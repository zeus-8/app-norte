import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import pg from 'pg';
import { execSync } from 'child_process';

const { Pool } = pg;

async function resetDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL no está definida en .env.local');
    process.exit(1);
  }

  console.log('🔄 Iniciando reinicio completo de base de datos...');
  const pool = new Pool({ connectionString });

  try {
    console.log('🗑️ Eliminando tablas existentes (DROP CASCADE)...');
    await pool.query(`
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
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);
    console.log('✅ Tablas anteriores eliminadas.');
  } catch (err) {
    console.error('❌ Error al eliminar tablas:', err.message);
    throw err;
  } finally {
    await pool.end();
  }

  console.log('\n📦 Aplicando migraciones de esquema...');
  execSync('node src/db/migrate.js', { stdio: 'inherit' });

  console.log('\n🌱 Ejecutando seeders de datos iniciales...');
  execSync('node src/db/seed.js', { stdio: 'inherit' });

  console.log('\n✨ ¡Base de datos reiniciada y poblada con éxito al 100%!');
}

resetDatabase().catch((err) => {
  console.error('❌ Error en reinicio de BD:', err);
  process.exit(1);
});

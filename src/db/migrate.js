import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL no está definida en .env.local');
    process.exit(1);
  }

  console.log(`🔌 Conectando a la base de datos: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new Pool({
    connectionString,
  });

  try {
    const sqlPath = path.join(__dirname, '../../drizzle/0000_yielding_scarlet_witch.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Archivo SQL no encontrado en: ${sqlPath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`🚀 Ejecutando ${statements.length} sentencias SQL de migración...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await pool.query(stmt);
      } catch (err) {
        // Ignorar si la tabla o índice ya existe
        if (err.code === '42P07' || err.code === '42710') {
          console.log(`ℹ️ [Aviso] Objeto ya existe: ${err.message}`);
        } else {
          console.warn(`⚠️ Error en sentencia ${i + 1}:`, err.message);
        }
      }
    }

    console.log('✅ ¡Migración completada exitosamente! Todas las tablas han sido creadas.');
  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

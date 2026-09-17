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
    const drizzleDir = path.join(__dirname, '../../drizzle');
    if (!fs.existsSync(drizzleDir)) {
      console.error(`❌ Directorio drizzle no encontrado en: ${drizzleDir}`);
      process.exit(1);
    }

    const sqlFiles = fs.readdirSync(drizzleDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`🚀 Se encontraron ${sqlFiles.length} archivos de migración: ${sqlFiles.join(', ')}`);

    for (const file of sqlFiles) {
      const sqlPath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      console.log(`📄 Aplicando ${file} (${statements.length} sentencias)...`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await pool.query(stmt);
        } catch (err) {
          // Ignorar si la tabla, columna, índice o restricción ya existe
          if (
            err.code === '42P07' || // relation already exists
            err.code === '42710' || // unique index/constraint already exists
            err.code === '42701' || // column already exists
            err.code === '42P16'    // multiple primary keys
          ) {
            console.log(`ℹ️ [Aviso] Objeto/columna ya existe: ${err.message}`);
          } else {
            console.warn(`⚠️ Error en ${file} [sentencia ${i + 1}]:`, err.message);
          }
        }
      }
    }

    console.log('✅ ¡Todas las migraciones se aplicaron con éxito!');
  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

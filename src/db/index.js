import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/norte2';

// Determinamos si estamos usando Neon Serverless (Cloudflare / Edge) o PostgreSQL estándar (Node.js / Local)
const isNeon = connectionString.includes('neon.tech') || process.env.USE_NEON_SERVERLESS === 'true';

const globalForDb = globalThis;

let dbInstance;

if (isNeon) {
  const sql = neon(connectionString);
  dbInstance = drizzleNeon(sql, { schema });
} else {
  // En desarrollo con Node.js / Next.js, reutilizar el pool global para evitar agotar conexiones
  if (!globalForDb.pgPool) {
    const isRemote = connectionString.includes('supabase.co') || 
                     connectionString.includes('pooler.supabase.com') ||
                     connectionString.includes('sslmode=') ||
                     connectionString.includes('.com') ||
                     process.env.NODE_ENV === 'production';

    globalForDb.pgPool = new Pool({
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  if (!globalForDb.drizzleDb) {
    globalForDb.drizzleDb = drizzlePg(globalForDb.pgPool, { schema });
  }

  dbInstance = globalForDb.drizzleDb;
}

export const db = dbInstance;
export { schema };

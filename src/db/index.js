import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/gastos_db';

// Determinamos si estamos usando Neon Serverless (Cloudflare / Edge) o PostgreSQL estándar (Node.js / Local)
const isNeon = connectionString.includes('neon.tech') || process.env.USE_NEON_SERVERLESS === 'true';

let dbInstance;

if (isNeon) {
  const sql = neon(connectionString);
  dbInstance = drizzleNeon(sql, { schema });
} else {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  dbInstance = drizzlePg(pool, { schema });
}

export const db = dbInstance;
export { schema };

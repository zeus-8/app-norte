import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import * as schema from './schema.js';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const { Pool } = pg.default ?? pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ [DB Warning]: DATABASE_URL no está definida en process.env. Usando fallback local.');
}

const finalConnectionString = connectionString || 'postgres://postgres:root@localhost:5432/norte2';

const isRemote =
  finalConnectionString.includes('supabase') ||
  finalConnectionString.includes('.com') ||
  finalConnectionString.includes('sslmode=');

const globalForDb = globalThis;

if (!globalForDb._pgPool) {
  globalForDb._pgPool = new Pool({
    connectionString: finalConnectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

export const db = globalForDb._drizzleDb ?? (globalForDb._drizzleDb = drizzle(globalForDb._pgPool, { schema }));
export { schema };

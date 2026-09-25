import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/norte2';

// Detectamos si estamos en Cloudflare Workers (Edge Runtime)
// En CF Workers: no hay `process.versions.node`, pero sí globalThis.caches o EdgeRuntime
const isCloudflareWorker =
  typeof globalThis.EdgeRuntime !== 'undefined' ||
  (typeof globalThis.caches !== 'undefined' && typeof process === 'undefined') ||
  process.env.NEXT_RUNTIME === 'edge' ||
  process.env.CF_WORKER === 'true';

const globalForDb = globalThis;

let dbInstance;

if (isCloudflareWorker) {
  // ── Cloudflare Workers ─────────────────────────────────────────────────────
  // pg (TCP) no funciona en CF Workers por IPv6 y restricciones de socket.
  // @neondatabase/serverless Pool usa WebSockets sobre HTTPS → funciona perfectamente
  // con cualquier PostgreSQL incluyendo Supabase (Session Mode puerto 5432).
  const { Pool: NeonPool } = await import('@neondatabase/serverless');
  const { drizzle: drizzleNeon } = await import('drizzle-orm/neon-serverless');

  if (!globalForDb._cfPool) {
    globalForDb._cfPool = new NeonPool({ connectionString });
  }
  dbInstance = drizzleNeon(globalForDb._cfPool, { schema });
} else {
  // ── Node.js (dev local / next start) ──────────────────────────────────────
  // pg Pool estándar con TCP. Reutilizamos el pool global para evitar
  // agotar conexiones durante Hot Reload en desarrollo.
  if (!globalForDb._pgPool) {
    const pg = await import('pg');
    const { Pool } = pg.default ?? pg;

    const isRemote =
      connectionString.includes('supabase') ||
      connectionString.includes('.com') ||
      connectionString.includes('sslmode=');

    globalForDb._pgPool = new Pool({
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  if (!globalForDb._drizzleDb) {
    const { drizzle: drizzlePg } = await import('drizzle-orm/node-postgres');
    globalForDb._drizzleDb = drizzlePg(globalForDb._pgPool, { schema });
  }

  dbInstance = globalForDb._drizzleDb;
}

export const db = dbInstance;
export { schema };

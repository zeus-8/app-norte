import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import * as schema from './schema.js';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const { Pool } = pg.default ?? pg;

const globalForDb = globalThis;

if (!globalForDb._dbPools) {
  globalForDb._dbPools = new Map();
  globalForDb._drizzleInstances = new Map();
}

/**
 * Obtiene la cadena de conexión activa según el entorno:
 * - Cloudflare Workers: env.HYPERDRIVE.connectionString
 * - Local / Scripts / Build: process.env.DATABASE_URL
 */
export function getConnectionString() {
  try {
    const ctx = getCloudflareContext();
    if (ctx?.env?.HYPERDRIVE?.connectionString) {
      return {
        connectionString: ctx.env.HYPERDRIVE.connectionString,
        isHyperdrive: true,
      };
    }
  } catch {
    // Fuera de Cloudflare (ej. desarrollo local, scripts, build time)
  }

  const localUrl = process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/norte2';
  return {
    connectionString: localUrl,
    isHyperdrive: false,
  };
}

/**
 * Obtiene o inicializa la instancia de Drizzle para la conexión actual
 */
export function getDbInstance() {
  const { connectionString, isHyperdrive } = getConnectionString();

  if (globalForDb._drizzleInstances.has(connectionString)) {
    return globalForDb._drizzleInstances.get(connectionString);
  }

  const isRemote =
    !isHyperdrive &&
    (connectionString.includes('supabase') ||
      connectionString.includes('.com') ||
      connectionString.includes('sslmode='));

  const pool = new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    max: isHyperdrive ? 5 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const drizzleDb = drizzle(pool, { schema });

  globalForDb._dbPools.set(connectionString, pool);
  globalForDb._drizzleInstances.set(connectionString, drizzleDb);

  return drizzleDb;
}

// Proxy transparente para que todo el código existente (`db.query`, `db.select`, etc.) funcione directamente
export const db = new Proxy({}, {
  get(target, prop, receiver) {
    const instance = getDbInstance();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

export { schema };


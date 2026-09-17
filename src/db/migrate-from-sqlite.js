import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { db } from './index.js';
import { users, dailyLogs, vehicleMaintenance, maintenanceHistory, expenses, userSettings } from './schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Intentar cargar better-sqlite3 desde app-norte o desde app-gastos
let Database;
try {
  Database = require('better-sqlite3');
} catch {
  try {
    const fallbackPath = path.resolve(__dirname, '../../../app-gastos/node_modules/better-sqlite3');
    Database = require(fallbackPath);
  } catch (err) {
    console.error('❌ No se pudo cargar better-sqlite3:', err.message);
    process.exit(1);
  }
}

async function migrateFromSqlite() {
  const sqliteDbPath = path.resolve(__dirname, '../../../app-gastos/gastos.db');
  console.log(`📦 Abriendo base de datos SQLite en: ${sqliteDbPath}`);

  let sqliteDb;
  try {
    sqliteDb = new Database(sqliteDbPath, { readonly: true });
  } catch (err) {
    console.error(`❌ Error al abrir SQLite (${sqliteDbPath}):`, err.message);
    process.exit(1);
  }

  // 1. Obtener usuario destino en PostgreSQL (Juan Chofer o primer usuario)
  console.log('👤 Buscando usuario destino en PostgreSQL...');
  let targetUser = await db.query.users.findFirst({
    where: eq(users.email, 'juan@chofer.com'),
  });

  if (!targetUser) {
    targetUser = await db.query.users.findFirst({
      where: eq(users.role, 'user'),
    });
  }

  if (!targetUser) {
    targetUser = await db.query.users.findFirst();
  }

  if (!targetUser) {
    console.error('❌ No se encontró ningún usuario en PostgreSQL para asociar los datos migrados.');
    console.error('👉 Ejecuta primero "npm run db:seed" para crear el usuario juan@chofer.com');
    process.exit(1);
  }

  const userId = targetUser.id;
  console.log(`✅ Usuario destino seleccionado: ${targetUser.name} (${targetUser.email}) [ID: ${userId}]`);

  // 2. Limpiar registros previos del usuario para evitar duplicados en la migración
  console.log('🧹 Limpiando registros existentes del usuario antes de la importación...');
  await db.delete(dailyLogs).where(eq(dailyLogs.userId, userId));
  await db.delete(maintenanceHistory).where(eq(maintenanceHistory.userId, userId));
  await db.delete(vehicleMaintenance).where(eq(vehicleMaintenance.userId, userId));
  await db.delete(expenses).where(eq(expenses.userId, userId));
  await db.delete(userSettings).where(eq(userSettings.userId, userId));

  // 3. Migrar app_settings -> user_settings
  console.log('\n⚙️ 1. Migrando configuraciones y odómetro...');
  let settingsCount = 0;
  try {
    const rawSettings = sqliteDb.prepare('SELECT key, value FROM app_settings').all();
    for (const row of rawSettings) {
      await db.insert(userSettings).values({
        userId,
        key: row.key,
        value: String(row.value),
      });
      settingsCount++;
    }
    console.log(`✅ ${settingsCount} configuraciones migradas.`);
  } catch (err) {
    console.warn(`⚠️ Aviso en app_settings: ${err.message}`);
  }

  // 4. Migrar daily_logs -> daily_logs
  console.log('\n🚗 2. Migrando jornadas de trabajo (daily_logs)...');
  let logsCount = 0;
  try {
    const rawLogs = sqliteDb.prepare('SELECT * FROM daily_logs ORDER BY date ASC').all();
    for (const row of rawLogs) {
      const grossIncome = Number(row.gross_income) || 0;
      const hoursWorked = Number(row.hours_worked) || 0;
      const minutesWorked = Math.round(hoursWorked * 60);

      await db.insert(dailyLogs).values({
        userId,
        date: row.date,
        grossIncome: String(grossIncome),
        appBreakdown: { uber: grossIncome }, // Mapeo a la nueva estructura multiapp
        fuelExpense: String(Number(row.fuel_expense) || 0),
        otherExpense: String(Number(row.other_expense) || 0),
        odometerKm: parseInt(row.odometer_km, 10) || 0,
        minutesWorked,
        tripsCount: parseInt(row.trips_count, 10) || 0,
        notes: row.notes || null,
      });
      logsCount++;
    }
    console.log(`✅ ${logsCount} jornadas diarias migradas con conversión exacta a minutos (${logsCount} registros).`);
  } catch (err) {
    console.warn(`⚠️ Error al migrar daily_logs: ${err.message}`);
  }

  // 5. Migrar vehicle_maintenance -> vehicle_maintenance
  console.log('\n🔧 3. Migrando catálogo de mantenimiento vehicular...');
  let maintenanceCount = 0;
  const maintenanceMap = new Map(); // Para vincular historial

  try {
    const rawMaintenance = sqliteDb.prepare('SELECT * FROM vehicle_maintenance').all();
    for (const row of rawMaintenance) {
      const [inserted] = await db.insert(vehicleMaintenance).values({
        userId,
        name: row.name,
        trackingType: row.tracking_type || (row.is_document ? 'time' : 'hybrid'),
        intervalKm: parseInt(row.interval_km, 10) || 0,
        intervalMonths: parseInt(row.interval_months, 10) || 12,
        fixedDueMonth: row.fixed_due_month ? parseInt(row.fixed_due_month, 10) : null,
        fixedDueDay: row.fixed_due_day ? parseInt(row.fixed_due_day, 10) : 30,
        lastServiceKm: parseInt(row.last_service_km, 10) || 0,
        lastServiceDate: row.last_service_date || null,
        nextDueDate: row.next_due_date || null,
        estimatedCost: String(Number(row.estimated_cost) || 0),
        category: row.category || 'Motor / Service',
        priority: row.priority || 'normal',
        isDocument: Boolean(row.is_document),
        notes: row.notes || null,
      }).returning();

      maintenanceMap.set(row.id, inserted.id);
      maintenanceCount++;
    }
    console.log(`✅ ${maintenanceCount} ítems de mantenimiento vehicular migrados.`);
  } catch (err) {
    console.warn(`⚠️ Error al migrar vehicle_maintenance: ${err.message}`);
  }

  // 6. Migrar maintenance_history -> maintenance_history
  console.log('\n📜 4. Migrando historial de services...');
  let historyCount = 0;
  try {
    const rawHistory = sqliteDb.prepare('SELECT * FROM maintenance_history').all();
    for (const row of rawHistory) {
      const newMaintenanceId = row.maintenance_id ? maintenanceMap.get(row.maintenance_id) : null;
      await db.insert(maintenanceHistory).values({
        userId,
        maintenanceId: newMaintenanceId || null,
        maintenanceName: row.maintenance_name,
        serviceDate: row.service_date,
        serviceKm: parseInt(row.service_km, 10) || 0,
        costPaid: String(Number(row.cost_paid) || 0),
        workshopNotes: row.workshop_notes || null,
      });
      historyCount++;
    }
    console.log(`✅ ${historyCount} registros de historial de services migrados.`);
  } catch (err) {
    console.warn(`⚠️ Error al migrar maintenance_history: ${err.message}`);
  }

  // 7. Migrar expenses -> expenses
  console.log('\n💳 5. Migrando gastos fijos, compras en cuotas y gastos compartidos...');
  let expensesCount = 0;
  try {
    const rawExpenses = sqliteDb.prepare('SELECT * FROM expenses').all();
    for (const row of rawExpenses) {
      const userSharePct = row.juan_share_pct !== undefined && row.juan_share_pct !== null
        ? Number(row.juan_share_pct)
        : (row.user_share_pct !== undefined ? Number(row.user_share_pct) : 100);

      await db.insert(expenses).values({
        userId,
        name: row.name,
        category: row.category,
        type: row.type || 'fixed',
        totalAmount: String(Number(row.total_amount) || 0),
        installmentCount: parseInt(row.installment_count, 10) || 1,
        installmentAmount: String(Number(row.installment_amount) || 0),
        startMonth: row.start_month,
        endMonth: row.end_month || null,
        isShared: Boolean(row.is_shared),
        userSharePct: String(userSharePct),
        paymentMethod: row.payment_method || 'Efectivo',
        status: row.status || 'active',
        notes: row.notes || null,
      });
      expensesCount++;
    }
    console.log(`✅ ${expensesCount} gastos y cuotas migrados.`);
  } catch (err) {
    console.warn(`⚠️ Error al migrar expenses: ${err.message}`);
  }

  sqliteDb.close();

  console.log('\n🎉 ==============================================');
  console.log('✨ MIGRACIÓN DE SQLITE A POSTGRESQL COMPLETADA');
  console.log('==============================================');
  console.log(`👤 Usuario: ${targetUser.name} (${targetUser.email})`);
  console.log(`🚗 Jornadas de Trabajo: ${logsCount}`);
  console.log(`🔧 Mantenimientos: ${maintenanceCount}`);
  console.log(`📜 Historial de Services: ${historyCount}`);
  console.log(`💳 Gastos & Cuotas: ${expensesCount}`);
  console.log(`⚙️ Configuraciones: ${settingsCount}`);
  console.log('==============================================\n');

  process.exit(0);
}

migrateFromSqlite().catch(err => {
  console.error('❌ Error fatal en migración desde SQLite:', err);
  process.exit(1);
});

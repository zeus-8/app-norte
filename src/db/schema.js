import { pgTable, uuid, varchar, text, boolean, integer, numeric, json, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. USUARIOS & MULTI-TENANCY (SaaS)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('user').notNull(), // 'admin' | 'user'
  
  // Preferencias operativas de movilidad
  driverType: varchar('driver_type', { length: 50 }).default('owner').notNull(), // 'owner' (auto propio) | 'renter' (auto alquilado)
  activeApps: json('active_apps').$type().default(['uber', 'cabify', 'didi']), // ['uber', 'cabify', 'didi', 'rappi', 'pedidosya', 'indrive']
  
  // Feature Flags por suscriptor (habilitados por Admin)
  moduleDriver: boolean('module_driver').default(true).notNull(),     // Módulo Jornadas Apps
  moduleExpenses: boolean('module_expenses').default(true).notNull(), // Módulo Gastos & Cuotas
  moduleVehicle: boolean('module_vehicle').default(true).notNull(),   // Módulo Mantenimiento Vehicular
  
  // Apariencia
  themePreference: varchar('theme_preference', { length: 20 }).default('dark').notNull(), // 'dark' | 'light' | 'system'
  
  // Configuración de Notificaciones Telegram
  telegramChatId: varchar('telegram_chat_id', { length: 100 }),
  telegramAlertDays: integer('telegram_alert_days').default(5),
  telegramEnabled: boolean('telegram_enabled').default(false).notNull(),
  
  // Estado de suscripción
  subscriptionStatus: varchar('subscription_status', { length: 50 }).default('trial').notNull(), // 'trial' | 'active' | 'suspended' | 'expired'
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. JORNADAS DIARIAS MULTIAPP (Uber, Cabify, DiDi, Rappi, etc.)
export const dailyLogs = pgTable('daily_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: varchar('date', { length: 10 }).notNull(), // 'YYYY-MM-DD'
  grossIncome: numeric('gross_income', { precision: 12, scale: 2 }).default('0').notNull(),
  appBreakdown: json('app_breakdown').$type().default({}), // ej: { uber: 35000, cabify: 22000, didi: 0, rappi: 0 }
  fuelExpense: numeric('fuel_expense', { precision: 12, scale: 2 }).default('0').notNull(),
  otherExpense: numeric('other_expense', { precision: 12, scale: 2 }).default('0').notNull(),
  odometerKm: integer('odometer_km').default(0).notNull(),
  minutesWorked: integer('minutes_worked').default(0).notNull(), // Ej: 347 minutos = 5h 47m
  tripsCount: integer('trips_count').default(0).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  userDateIdx: uniqueIndex('daily_logs_user_date_idx').on(t.userId, t.date),
}));

// 3. MANTENIMIENTO VEHICULAR Y DOCUMENTACIÓN (Km, Tiempo, Híbrido)
export const vehicleMaintenance = pgTable('vehicle_maintenance', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  trackingType: varchar('tracking_type', { length: 50 }).default('hybrid').notNull(), // 'km' | 'time' | 'hybrid'
  intervalKm: integer('interval_km').default(10000).notNull(),
  intervalMonths: integer('interval_months').default(12).notNull(),
  fixedDueMonth: integer('fixed_due_month'), // 1 a 12 (ej. 11 para Noviembre según patente)
  fixedDueDay: integer('fixed_due_day').default(30),
  lastServiceKm: integer('last_service_km').default(0).notNull(),
  lastServiceDate: varchar('last_service_date', { length: 10 }), // 'YYYY-MM-DD'
  nextDueDate: varchar('next_due_date', { length: 10 }),         // 'YYYY-MM-DD'
  estimatedCost: numeric('estimated_cost', { precision: 12, scale: 2 }).default('0').notNull(),
  category: varchar('category', { length: 100 }).default('Motor / Service').notNull(),
  priority: varchar('priority', { length: 50 }).default('normal').notNull(), // 'high' | 'normal' | 'low'
  isDocument: boolean('is_document').default(false).notNull(), // 1 si es VTV, GNC, Patente; 0 si es mecánico
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. HISTORIAL DE SERVICES REALIZADOS
export const maintenanceHistory = pgTable('maintenance_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  maintenanceId: uuid('maintenance_id').references(() => vehicleMaintenance.id, { onDelete: 'cascade' }),
  maintenanceName: varchar('maintenance_name', { length: 255 }).notNull(),
  serviceDate: varchar('service_date', { length: 10 }).notNull(), // 'YYYY-MM-DD'
  serviceKm: integer('service_km').default(0).notNull(),
  costPaid: numeric('cost_paid', { precision: 12, scale: 2 }).default('0').notNull(),
  workshopNotes: text('workshop_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. GASTOS Y CUOTAS SIN INTERÉS PROYECTADAS
export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).default('fixed').notNull(), // 'fixed' | 'one_time' | 'installment'
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  installmentCount: integer('installment_count').default(1).notNull(),
  installmentAmount: numeric('installment_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  startMonth: varchar('start_month', { length: 7 }).notNull(), // 'YYYY-MM'
  endMonth: varchar('end_month', { length: 7 }),               // 'YYYY-MM'
  isShared: boolean('is_shared').default(false).notNull(),
  userSharePct: numeric('user_share_pct', { precision: 5, scale: 2 }).default('100').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).default('Efectivo').notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(), // 'active' | 'paid' | 'cancelled'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. AJUSTES PERSONALIZADOS POR USUARIO
export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  userKeyIdx: uniqueIndex('user_settings_user_key_idx').on(t.userId, t.key),
}));

// RELACIONES DRIZZLE ORM
export const usersRelations = relations(users, ({ many }) => ({
  dailyLogs: many(dailyLogs),
  vehicleMaintenance: many(vehicleMaintenance),
  maintenanceHistory: many(maintenanceHistory),
  expenses: many(expenses),
  userSettings: many(userSettings),
}));

export const dailyLogsRelations = relations(dailyLogs, ({ one }) => ({
  user: one(users, {
    fields: [dailyLogs.userId],
    references: [users.id],
  }),
}));

export const vehicleMaintenanceRelations = relations(vehicleMaintenance, ({ one, many }) => ({
  user: one(users, {
    fields: [vehicleMaintenance.userId],
    references: [users.id],
  }),
  history: many(maintenanceHistory),
}));

export const maintenanceHistoryRelations = relations(maintenanceHistory, ({ one }) => ({
  user: one(users, {
    fields: [maintenanceHistory.userId],
    references: [users.id],
  }),
  maintenance: one(vehicleMaintenance, {
    fields: [maintenanceHistory.maintenanceId],
    references: [vehicleMaintenance.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

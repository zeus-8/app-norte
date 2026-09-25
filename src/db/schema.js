import { pgTable, uuid, varchar, text, boolean, integer, numeric, json, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. USUARIOS & MULTI-TENANCY (SaaS)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('user').notNull(), // 'admin' | 'user'
  
  // Perfil Google OAuth (si aplica)
  googleId: varchar('google_id', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),

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

// 2. HOGAR COMPARTIDO / GRUPO FAMILIAR (Household)
export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(), // Ej: "Hogar Juan & Yeli"
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. MIEMBROS DEL HOGAR Y PORCENTAJES DE DIVISIÓN
export const householdMembers = pgTable('household_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  defaultSharePct: numeric('default_share_pct', { precision: 5, scale: 2 }).default('50.00').notNull(), // Ej: 60.00 Juan / 40.00 Yeli
  status: varchar('status', { length: 50 }).default('pending').notNull(), // 'accepted' | 'pending'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. JORNADAS DIARIAS MULTIAPP (Uber, Cabify, DiDi, Rappi, etc.)
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

// 5. MANTENIMIENTO VEHICULAR Y DOCUMENTACIÓN (Km, Tiempo, Híbrido)
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

// 6. HISTORIAL DE SERVICES REALIZADOS
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

// 7. GASTOS Y CUOTAS SIN INTERÉS (Personales o Compartidos del Hogar)
export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Creador
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'set null' }), // NULL si es 100% personal
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).default('fixed').notNull(), // 'fixed' | 'one_time' | 'installment'
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  installmentCount: integer('installment_count').default(1).notNull(),
  installmentAmount: numeric('installment_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  startMonth: varchar('start_month', { length: 7 }).notNull(), // 'YYYY-MM'
  endMonth: varchar('end_month', { length: 7 }),               // 'YYYY-MM' (null si es indefinido)
  dueDay: integer('due_day').default(5),                       // Día habitual de pago (1 a 31)
  isShared: boolean('is_shared').default(false).notNull(),
  userSharePct: numeric('user_share_pct', { precision: 5, scale: 2 }).default('100').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).default('Efectivo').notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(), // 'active' | 'paid' | 'cancelled'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. CHECKLIST DE PAGOS MENSUALES (Tildar "Pagado en este mes")
export const expensePayments = pgTable('expense_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  expenseId: uuid('expense_id').references(() => expenses.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  month: varchar('month', { length: 7 }).notNull(), // 'YYYY-MM'
  isPaid: boolean('is_paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  expenseUserMonthIdx: uniqueIndex('expense_payments_user_month_idx').on(t.expenseId, t.userId, t.month),
}));

// 9. AJUSTES PERSONALIZADOS POR USUARIO
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

// 10. ADELANTOS Y RETIROS ANTICIPADOS DE APPS (Uber, Cabify, DiDi)
export const appAdvances = pgTable('app_advances', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  app: varchar('app', { length: 50 }).default('uber').notNull(), // 'uber' | 'cabify' | 'didi' | 'general'
  amount: numeric('amount', { precision: 12, scale: 2 }).default('0').notNull(),
  date: varchar('date', { length: 10 }).notNull(), // 'YYYY-MM-DD'
  month: varchar('month', { length: 7 }).notNull(), // 'YYYY-MM'
  destination: varchar('payment_destination', { length: 50 }).default('Mercado Pago').notNull(), // 'Mercado Pago' | 'Banco' | 'Efectivo'
  expenseId: uuid('expense_id').references(() => expenses.id, { onDelete: 'set null' }), // Gasto del mes al que se imputa (opcional)
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 11. ARQUEOS Y CONCILIACIONES DE CAJA (Realidad vs Sistema)
export const cashReconciliations = pgTable('cash_reconciliations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: varchar('date', { length: 10 }).notNull(), // 'YYYY-MM-DD'
  month: varchar('month', { length: 7 }).notNull(), // 'YYYY-MM'
  theoreticalBalance: numeric('theoretical_balance', { precision: 12, scale: 2 }).default('0').notNull(),
  realCash: numeric('real_cash', { precision: 12, scale: 2 }).default('0').notNull(),
  realBank: numeric('real_bank', { precision: 12, scale: 2 }).default('0').notNull(),
  realApps: numeric('real_apps', { precision: 12, scale: 2 }).default('0').notNull(), // Acumulado pendiente en apps (Uber, Cabify...)
  totalReal: numeric('total_real', { precision: 12, scale: 2 }).default('0').notNull(),
  difference: numeric('difference', { precision: 12, scale: 2 }).default('0').notNull(),
  adjustmentType: varchar('adjustment_type', { length: 50 }).default('none').notNull(), // 'none' | 'unrecorded_expense' | 'savings_transfer' | 'direct_adjustment'
  adjustmentAmount: numeric('adjustment_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RELACIONES DRIZZLE ORM
export const usersRelations = relations(users, ({ many }) => ({
  dailyLogs: many(dailyLogs),
  vehicleMaintenance: many(vehicleMaintenance),
  maintenanceHistory: many(maintenanceHistory),
  expenses: many(expenses),
  userSettings: many(userSettings),
  householdsCreated: many(households),
  householdMemberships: many(householdMembers),
  expensePayments: many(expensePayments),
  appAdvances: many(appAdvances),
  cashReconciliations: many(cashReconciliations),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
  creator: one(users, {
    fields: [households.createdBy],
    references: [users.id],
  }),
  members: many(householdMembers),
  expenses: many(expenses),
}));

export const householdMembersRelations = relations(householdMembers, ({ one }) => ({
  household: one(households, {
    fields: [householdMembers.householdId],
    references: [households.id],
  }),
  user: one(users, {
    fields: [householdMembers.userId],
    references: [users.id],
  }),
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

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
  household: one(households, {
    fields: [expenses.householdId],
    references: [households.id],
  }),
  payments: many(expensePayments),
  advances: many(appAdvances),
}));

export const expensePaymentsRelations = relations(expensePayments, ({ one }) => ({
  expense: one(expenses, {
    fields: [expensePayments.expenseId],
    references: [expenses.id],
  }),
  user: one(users, {
    fields: [expensePayments.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const appAdvancesRelations = relations(appAdvances, ({ one }) => ({
  user: one(users, {
    fields: [appAdvances.userId],
    references: [users.id],
  }),
  expense: one(expenses, {
    fields: [appAdvances.expenseId],
    references: [expenses.id],
  }),
}));

export const cashReconciliationsRelations = relations(cashReconciliations, ({ one }) => ({
  user: one(users, {
    fields: [cashReconciliations.userId],
    references: [users.id],
  }),
}));

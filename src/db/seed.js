import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './index.js';
import { users, vehicleMaintenance, expenses, dailyLogs, userSettings } from './schema.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Iniciando carga de datos iniciales (Seed)...');

  // 1. Crear Usuario Administrador (Dueño de la plataforma)
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, 'admin@autogastos.com'),
  });

  let adminUser = existingAdmin;
  if (!adminUser) {
    const [created] = await db.insert(users).values({
      email: 'admin@autogastos.com',
      passwordHash: adminPasswordHash,
      name: 'Administrador General',
      role: 'admin',
      driverType: 'owner',
      activeApps: ['uber', 'cabify', 'didi', 'rappi', 'pedidosya', 'indrive'],
      moduleDriver: true,
      moduleExpenses: true,
      moduleVehicle: true,
      themePreference: 'dark',
      subscriptionStatus: 'active',
    }).returning();
    adminUser = created;
    console.log('✅ Usuario Administrador creado: admin@autogastos.com / admin123');
  }

  // 2. Crear Usuario Chofer de Prueba (Juan - Dueño de Auto)
  const userPasswordHash = await bcrypt.hash('juan123', 10);
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, 'juan@chofer.com'),
  });

  let demoUser = existingUser;
  if (!demoUser) {
    const [created] = await db.insert(users).values({
      email: 'juan@chofer.com',
      passwordHash: userPasswordHash,
      name: 'Juan Chofer',
      role: 'user',
      driverType: 'owner',
      activeApps: ['uber', 'cabify', 'didi'],
      moduleDriver: true,
      moduleExpenses: true,
      moduleVehicle: true,
      themePreference: 'dark',
      telegramAlertDays: 5,
      telegramEnabled: false,
      subscriptionStatus: 'active',
    }).returning();
    demoUser = created;
    console.log('✅ Usuario Chofer Demo creado: juan@chofer.com / juan123');
  }

  const userId = demoUser.id;

  // 3. Odómetro base del usuario
  await db.insert(userSettings).values({
    userId,
    key: 'current_odometer',
    value: '145000',
  }).onConflictDoNothing();

  // 4. Catálogo Inicial de Mantenimiento Vehicular (Normativa Argentina y GNC)
  const defaultMaintenance = [
    { name: 'Oblea GNC (Permiso Anual)', trackingType: 'time', intervalKm: 0, intervalMonths: 12, fixedDueMonth: 11, fixedDueDay: 30, lastServiceKm: 0, lastServiceDate: '2025-11-25', estimatedCost: '28000', category: 'Documentación / GNC', priority: 'high', isDocument: true, notes: 'Renovación anual obligatoria según placa' },
    { name: 'VTV (Verificación Técnica Vehicular)', trackingType: 'time', intervalKm: 0, intervalMonths: 12, fixedDueMonth: 11, fixedDueDay: 30, lastServiceKm: 0, lastServiceDate: '2025-11-25', estimatedCost: '44000', category: 'Documentación / Legal', priority: 'high', isDocument: true, notes: 'Vence cada Noviembre por terminación de patente' },
    { name: 'Prueba Hidráulica GNC (5 Años)', trackingType: 'time', intervalKm: 0, intervalMonths: 60, fixedDueMonth: null, fixedDueDay: 30, lastServiceKm: 0, lastServiceDate: '2023-04-10', estimatedCost: '130000', category: 'Documentación / GNC', priority: 'normal', isDocument: true, notes: 'Prueba de cilindros de GNC cada 5 años' },
    { name: 'Impuesto de Patente Automotor', trackingType: 'time', intervalKm: 0, intervalMonths: 2, fixedDueMonth: null, fixedDueDay: 10, lastServiceKm: 0, lastServiceDate: '2026-07-10', estimatedCost: '38000', category: 'Impuestos / Patente', priority: 'high', isDocument: true, notes: 'Impuesto bimestral automotor' },
    { name: 'Cambio de Aceite y Filtros', trackingType: 'hybrid', intervalKm: 10000, intervalMonths: 12, lastServiceKm: 140000, lastServiceDate: '2026-05-10', estimatedCost: '95000', category: 'Motor / Service', priority: 'high', isDocument: false, notes: 'Aceite sintético + filtros (cada 10.000 km o 1 año)' },
    { name: 'Juego de Cubiertas (Neumáticos)', trackingType: 'hybrid', intervalKm: 50000, intervalMonths: 60, lastServiceKm: 115000, lastServiceDate: '2023-06-01', estimatedCost: '360000', category: 'Neumáticos', priority: 'normal', isDocument: false, notes: '4 cubiertas nuevas cada 50.000 km o 5 años' },
    { name: 'Correa de Distribución y Bomba', trackingType: 'hybrid', intervalKm: 50000, intervalMonths: 48, lastServiceKm: 110000, lastServiceDate: '2024-03-15', estimatedCost: '180000', category: 'Motor / Distribución', priority: 'high', isDocument: false, notes: 'Kit completo de distribución + bomba de agua' },
    { name: 'Batería', trackingType: 'hybrid', intervalKm: 60000, intervalMonths: 24, lastServiceKm: 125000, lastServiceDate: '2025-01-20', estimatedCost: '110000', category: 'Eléctrico', priority: 'normal', isDocument: false, notes: 'Batería 12V 65Ah' },
    { name: 'Bujías y Cables / Encendido', trackingType: 'hybrid', intervalKm: 40000, intervalMonths: 24, lastServiceKm: 120000, lastServiceDate: '2025-03-01', estimatedCost: '55000', category: 'Encendido', priority: 'normal', isDocument: false, notes: 'Bujías calibradas para GNC' },
    { name: 'Pastillas de Freno Delanteras', trackingType: 'km', intervalKm: 25000, intervalMonths: 24, lastServiceKm: 130000, lastServiceDate: '2025-08-01', estimatedCost: '65000', category: 'Frenos', priority: 'high', isDocument: false, notes: 'Discos y pastillas' },
    { name: 'Alineación y Balanceo', trackingType: 'km', intervalKm: 10000, intervalMonths: 6, lastServiceKm: 142000, lastServiceDate: '2026-06-15', estimatedCost: '35000', category: 'Neumáticos / Chasis', priority: 'normal', isDocument: false, notes: 'Rotación y balanceo' },
  ];

  for (const item of defaultMaintenance) {
    await db.insert(vehicleMaintenance).values({
      userId,
      ...item,
    });
  }
  console.log('✅ Catálogo de mantenimientos cargado');

  // 5. Gastos fijos y compras en cuotas iniciales
  const defaultExpenses = [
    { name: 'Alquiler', category: 'Hogar', type: 'fixed', totalAmount: '820000', installmentCount: 1, installmentAmount: '820000', startMonth: '2026-01', isShared: true, userSharePct: '60', paymentMethod: 'Transferencia', notes: 'Alquiler compartido' },
    { name: 'Comida / Supermercado', category: 'Hogar', type: 'fixed', totalAmount: '600000', installmentCount: 1, installmentAmount: '600000', startMonth: '2026-01', isShared: true, userSharePct: '60', paymentMethod: 'Efectivo', notes: 'Comida mensual' },
    { name: 'Luz (Electricidad)', category: 'Hogar', type: 'fixed', totalAmount: '32500', installmentCount: 1, installmentAmount: '32500', startMonth: '2026-01', isShared: true, userSharePct: '60', paymentMethod: 'Transferencia', notes: 'Servicio eléctrico' },
    { name: 'Gas del Hogar', category: 'Hogar', type: 'fixed', totalAmount: '24500', installmentCount: 1, installmentAmount: '24500', startMonth: '2026-01', isShared: true, userSharePct: '60', paymentMethod: 'Transferencia', notes: 'Servicio de gas' },
    { name: 'Seguro Auto', category: 'Auto', type: 'fixed', totalAmount: '95000', installmentCount: 1, installmentAmount: '95000', startMonth: '2026-01', isShared: false, userSharePct: '100', paymentMethod: 'Débito', notes: 'Seguro chofer' },
    { name: 'GPS Auto / Rastreo', category: 'Auto', type: 'fixed', totalAmount: '23200', installmentCount: 1, installmentAmount: '23200', startMonth: '2026-01', isShared: false, userSharePct: '100', paymentMethod: 'Débito', notes: 'Rastreo satelital' },
    { name: 'Celular Plan', category: 'Personal', type: 'fixed', totalAmount: '20000', installmentCount: 1, installmentAmount: '20000', startMonth: '2026-01', isShared: false, userSharePct: '100', paymentMethod: 'Débito', notes: 'Línea de trabajo' },
    // Cuotas de tarjetas
    { name: 'Lavadora', category: 'Tarjeta MASTER', type: 'installment', totalAmount: '379525', installmentCount: 12, installmentAmount: '31627.08', startMonth: '2025-12', endMonth: '2026-11', isShared: false, userSharePct: '100', paymentMethod: 'MASTER', notes: '12 cuotas fijas' },
    { name: 'Televisor', category: 'Tarjeta MASTER', type: 'installment', totalAmount: '612000', installmentCount: 12, installmentAmount: '51000', startMonth: '2025-12', endMonth: '2026-11', isShared: false, userSharePct: '100', paymentMethod: 'MASTER', notes: '12 cuotas TV' },
    { name: 'Celular Cuotas', category: 'Tarjeta VISA', type: 'installment', totalAmount: '70000', installmentCount: 12, installmentAmount: '5833.33', startMonth: '2025-12', endMonth: '2026-11', isShared: false, userSharePct: '100', paymentMethod: 'VISA', notes: '12 cuotas' },
  ];

  for (const exp of defaultExpenses) {
    await db.insert(expenses).values({
      userId,
      ...exp,
    });
  }
  console.log('✅ Gastos y compras en cuotas cargados');

  // 6. Jornadas Multiapp de ejemplo con horas y minutos exactos
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const sampleLogs = [
    { date: `${year}-${month}-08`, grossIncome: '54000', appBreakdown: { uber: 32000, cabify: 22000 }, fuelExpense: '11000', otherExpense: '1500', odometerKm: 144200, minutesWorked: 480, tripsCount: 16, notes: 'Mañana movida en Uber y Cabify' },
    { date: `${year}-${month}-09`, grossIncome: '49500', appBreakdown: { uber: 28000, didi: 21500 }, fuelExpense: '9800', otherExpense: '0', odometerKm: 144380, minutesWorked: 450, tripsCount: 14, notes: 'Tarde tranquila' },
    { date: `${year}-${month}-10`, grossIncome: '63000', appBreakdown: { uber: 38000, cabify: 25000 }, fuelExpense: '12500', otherExpense: '2000', odometerKm: 144600, minutesWorked: 547, tripsCount: 19, notes: 'Viernes fuerte: 9h 07m' },
    { date: `${year}-${month}-11`, grossIncome: '58500', appBreakdown: { uber: 35000, didi: 23500 }, fuelExpense: '11200', otherExpense: '0', odometerKm: 144820, minutesWorked: 511, tripsCount: 18, notes: 'Sábado movido: 8h 31m' },
  ];

  for (const log of sampleLogs) {
    await db.insert(dailyLogs).values({
      userId,
      ...log,
    });
  }
  console.log('✅ Jornadas multiapp de ejemplo cargadas');

  console.log('✨ Seed completado con éxito!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});

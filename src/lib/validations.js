import { z } from 'zod';

// 1. Validación de Login
export const loginSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es obligatorio').email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// 2. Validación de Registro de Usuario
export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().min(1, 'El correo electrónico es obligatorio').email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  driverType: z.enum(['owner', 'renter'], {
    errorMap: () => ({ message: 'Selecciona si conduces auto propio o alquilado' }),
  }).default('owner'),
  activeApps: z.array(z.string()).min(1, 'Selecciona al menos una aplicación de trabajo').default(['uber']),
});

// 3. Validación de Jornada Multiapp (Horas + Minutos exactos)
export const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD (ej. 2026-03-15)'),
  grossIncome: z.coerce.number().min(0, 'El ingreso bruto no puede ser negativo'),
  appBreakdown: z.record(z.coerce.number()).optional().default({}),
  fuelExpense: z.coerce.number().min(0, 'El gasto en combustible no puede ser negativo').default(0),
  otherExpense: z.coerce.number().min(0, 'Otros gastos no pueden ser negativos').default(0),
  odometerKm: z.coerce.number().int().min(0, 'El odómetro debe ser un número entero mayor o igual a 0'),
  hoursWorked: z.coerce.number().int().min(0, 'Las horas no pueden ser negativas').default(0),
  minutesWorked: z.coerce.number().int().min(0, 'Los minutos deben ser entre 0 y 59').max(59, 'Los minutos deben ser entre 0 y 59').default(0),
  tripsCount: z.coerce.number().int().min(0, 'La cantidad de viajes no puede ser negativa').default(0),
  notes: z.string().optional().default(''),
});

// 4. Validación de Gasto y Compra en Cuotas
export const expenseSchema = z.object({
  name: z.string().min(2, 'El nombre del gasto debe tener al menos 2 caracteres'),
  category: z.string().min(1, 'Selecciona una categoría para el gasto'),
  type: z.enum(['fixed', 'one_time', 'installment'], {
    errorMap: () => ({ message: 'Tipo de gasto inválido (Fijo, Único o en Cuotas)' }),
  }),
  totalAmount: z.coerce.number().gt(0, 'El monto total debe ser mayor a $0'),
  installmentCount: z.coerce.number().int().min(1, 'La cantidad de cuotas debe ser al menos 1').default(1),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, 'El mes de inicio debe tener formato AAAA-MM (ej. 2026-03)'),
  householdId: z.string().uuid().nullable().optional(),
  isShared: z.boolean().default(false),
  userSharePct: z.coerce.number().min(1, 'El porcentaje debe ser entre 1% y 100%').max(100, 'El porcentaje máximo es 100%').default(100),
  paymentMethod: z.string().min(1, 'Selecciona un medio de pago'),
  notes: z.string().optional().default(''),
});

// 5. Validación de Mantenimiento / Trámite Vehicular
export const vehicleMaintenanceSchema = z.object({
  name: z.string().min(2, 'El nombre del servicio debe tener al menos 2 caracteres'),
  trackingType: z.enum(['km', 'time', 'hybrid'], {
    errorMap: () => ({ message: 'Selecciona cómo medir este servicio (Por Km, Por Tiempo o Híbrido)' }),
  }),
  intervalKm: z.coerce.number().int().min(0, 'El intervalo en km debe ser mayor o igual a 0').default(0),
  intervalMonths: z.coerce.number().int().min(0, 'El intervalo en meses debe ser mayor o igual a 0').default(12),
  fixedDueMonth: z.coerce.number().int().min(1).max(12).nullable().optional(),
  fixedDueDay: z.coerce.number().int().min(1).max(31).default(30),
  lastServiceKm: z.coerce.number().int().min(0).default(0),
  lastServiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha del último service debe ser AAAA-MM-DD').optional().nullable(),
  estimatedCost: z.coerce.number().gt(0, 'El costo estimado debe ser mayor a $0'),
  category: z.string().min(1, 'Selecciona una categoría'),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  isDocument: z.boolean().default(false),
  notes: z.string().optional().default(''),
});

// 6. Validación de Registro de Service Realizado
export const serviceDoneSchema = z.object({
  maintenanceId: z.string().uuid('ID de mantenimiento inválido'),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe ser AAAA-MM-DD'),
  serviceKm: z.coerce.number().int().min(0, 'El kilometraje debe ser mayor o igual a 0'),
  costPaid: z.coerce.number().min(0, 'El costo pagado debe ser mayor o igual a 0'),
  workshopNotes: z.string().optional().default(''),
});

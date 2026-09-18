import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users, vehicleMaintenance, userSettings } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth.js';
import { registerSchema } from '@/lib/validations.js';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validación con Zod
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Datos de registro inválidos';
      return NextResponse.json({ error: firstError, details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, password, driverType, activeApps } = validation.data;
    const cleanEmail = email.toLowerCase().trim();

    // Comprobar si ya existe el correo
    const existing = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una cuenta registrada con este correo electrónico' }, { status: 400 });
    }

    // Hashear password y crear usuario
    const passwordHash = await hashPassword(password);
    const [newUser] = await db.insert(users).values({
      name,
      email: cleanEmail,
      passwordHash,
      role: 'user',
      driverType: driverType || 'owner',
      activeApps: activeApps || ['uber'],
      moduleDriver: true,
      moduleExpenses: true,
      moduleVehicle: true,
      themePreference: 'dark',
      subscriptionStatus: 'trial',
    }).returning();

    // Crear catálogo base de mantenimiento para Argentina si el auto es propio
    if (newUser.driverType === 'owner') {
      const defaultMaintenance = [
        { name: 'Oblea GNC (Permiso Anual)', trackingType: 'time', intervalKm: 0, intervalMonths: 12, fixedDueMonth: 11, fixedDueDay: 30, lastServiceKm: 0, lastServiceDate: '2025-11-25', estimatedCost: '28000', category: 'Documentación / GNC', priority: 'high', isDocument: true, notes: 'Renovación anual obligatoria' },
        { name: 'VTV (Verificación Técnica Vehicular)', trackingType: 'time', intervalKm: 0, intervalMonths: 12, fixedDueMonth: 11, fixedDueDay: 30, lastServiceKm: 0, lastServiceDate: '2025-11-25', estimatedCost: '44000', category: 'Documentación / Legal', priority: 'high', isDocument: true, notes: 'Vence cada Noviembre por patente' },
        { name: 'Impuesto de Patente Automotor', trackingType: 'time', intervalKm: 0, intervalMonths: 2, fixedDueMonth: null, fixedDueDay: 10, lastServiceKm: 0, lastServiceDate: '2026-07-10', estimatedCost: '38000', category: 'Impuestos / Patente', priority: 'high', isDocument: true, notes: 'Impuesto bimestral' },
        { name: 'Cambio de Aceite y Filtros', trackingType: 'hybrid', intervalKm: 10000, intervalMonths: 12, lastServiceKm: 140000, lastServiceDate: '2026-05-10', estimatedCost: '95000', category: 'Motor / Service', priority: 'high', isDocument: false, notes: 'Aceite + filtros cada 10.000 km o 1 año' },
        { name: 'Pastillas de Freno', trackingType: 'km', intervalKm: 25000, intervalMonths: 24, lastServiceKm: 130000, lastServiceDate: '2025-08-01', estimatedCost: '65000', category: 'Frenos', priority: 'high', isDocument: false, notes: 'Control de pastillas y discos' },
        { name: 'Alineación y Balanceo', trackingType: 'km', intervalKm: 10000, intervalMonths: 6, lastServiceKm: 142000, lastServiceDate: '2026-06-15', estimatedCost: '35000', category: 'Neumáticos / Chasis', priority: 'normal', isDocument: false, notes: 'Rotación y alineación' },
      ];

      for (const item of defaultMaintenance) {
        await db.insert(vehicleMaintenance).values({
          userId: newUser.id,
          ...item,
        });
      }
    }

    // Configurar odómetro base
    await db.insert(userSettings).values({
      userId: newUser.id,
      key: 'current_odometer',
      value: '145000',
    });

    // Generar sesión JWT
    const token = await createSessionToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });

    await setSessionCookie(token);

    const { passwordHash: _, ...userSafe } = newUser;
    return NextResponse.json({ success: true, user: userSafe });
  } catch (error) {
    console.error('Error en register:', error);
    return NextResponse.json({ error: 'Error interno del servidor al registrar usuario' }, { status: 500 });
  }
}

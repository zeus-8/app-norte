import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { vehicleMaintenance, maintenanceHistory, userSettings } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { serviceDoneSchema } from '@/lib/validations.js';

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = params;
    const body = await request.json();
    const validation = serviceDoneSchema.safeParse({ ...body, maintenanceId: id });
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Datos del service inválidos';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { serviceDate, serviceKm, costPaid, workshopNotes } = validation.data;

    const maint = await db.query.vehicleMaintenance.findFirst({
      where: and(eq(vehicleMaintenance.id, id), eq(vehicleMaintenance.userId, user.id)),
    });

    if (!maint) {
      return NextResponse.json({ error: 'Mantenimiento no encontrado' }, { status: 404 });
    }

    // Actualizar servicio
    await db.update(vehicleMaintenance).set({
      lastServiceKm: serviceKm,
      lastServiceDate: serviceDate,
      updatedAt: new Date(),
    }).where(eq(vehicleMaintenance.id, id));

    // Guardar en historial
    await db.insert(maintenanceHistory).values({
      userId: user.id,
      maintenanceId: id,
      maintenanceName: maint.name,
      serviceDate,
      serviceKm,
      costPaid: String(costPaid),
      workshopNotes,
    });

    // Actualizar odómetro en settings si es mayor
    if (serviceKm > 0) {
      const currentOdoSetting = await db.query.userSettings.findFirst({
        where: and(eq(userSettings.userId, user.id), eq(userSettings.key, 'current_odometer')),
      });
      const currentOdo = currentOdoSetting ? parseInt(currentOdoSetting.value, 10) : 0;
      if (serviceKm > currentOdo) {
        await db.insert(userSettings).values({
          userId: user.id,
          key: 'current_odometer',
          value: String(serviceKm),
        }).onConflictDoUpdate({
          target: [userSettings.userId, userSettings.key],
          set: { value: String(serviceKm), updatedAt: new Date() },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Service registrado exitosamente' });
  } catch (error) {
    console.error('Error registrando service done:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

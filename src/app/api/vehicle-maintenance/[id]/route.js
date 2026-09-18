import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { vehicleMaintenance } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { vehicleMaintenanceSchema } from '@/lib/validations.js';

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const validation = vehicleMaintenanceSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Datos inválidos';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, trackingType, intervalKm, intervalMonths, fixedDueMonth, fixedDueDay, lastServiceKm, lastServiceDate, estimatedCost, category, priority, isDocument, notes } = validation.data;

    await db.update(vehicleMaintenance).set({
      name,
      trackingType: isDocument ? 'time' : trackingType,
      intervalKm,
      intervalMonths,
      fixedDueMonth: fixedDueMonth || null,
      fixedDueDay: fixedDueDay || 30,
      lastServiceKm,
      lastServiceDate,
      estimatedCost: String(estimatedCost),
      category,
      priority,
      isDocument,
      notes,
      updatedAt: new Date(),
    }).where(and(eq(vehicleMaintenance.id, id), eq(vehicleMaintenance.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    await db.delete(vehicleMaintenance).where(and(eq(vehicleMaintenance.id, id), eq(vehicleMaintenance.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

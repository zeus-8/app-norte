import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users } from '@/db/schema.js';
import { getCurrentUser, hashPassword } from '@/lib/auth.js';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.role !== undefined) updates.role = body.role;
    if (body.driverType !== undefined) updates.driverType = body.driverType;
    if (body.subscriptionStatus !== undefined) updates.subscriptionStatus = body.subscriptionStatus;
    if (body.moduleDriver !== undefined) updates.moduleDriver = Boolean(body.moduleDriver);
    if (body.moduleExpenses !== undefined) updates.moduleExpenses = Boolean(body.moduleExpenses);
    if (body.moduleVehicle !== undefined) updates.moduleVehicle = Boolean(body.moduleVehicle);
    if (body.telegramEnabled !== undefined) updates.telegramEnabled = Boolean(body.telegramEnabled);
    if (body.newPassword) {
      updates.passwordHash = await hashPassword(body.newPassword);
    }
    updates.updatedAt = new Date();

    await db.update(users).set(updates).where(eq(users.id, id));

    return NextResponse.json({ success: true, message: 'Usuario actualizado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;
    if (id === currentUser.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta de administrador' }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserFromSession, getCurrentUser } from '@/lib/auth.js';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        driverType: users.driverType,
        activeApps: users.activeApps,
        moduleDriver: users.moduleDriver,
        moduleExpenses: users.moduleExpenses,
        moduleVehicle: users.moduleVehicle,
        themePreference: users.themePreference,
        telegramChatId: users.telegramChatId,
        telegramAlertDays: users.telegramAlertDays,
        telegramEnabled: users.telegramEnabled,
        subscriptionStatus: users.subscriptionStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      user,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'AutoGastosBot',
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      driverType,
      activeApps,
      themePreference,
      telegramChatId,
      telegramAlertDays,
      telegramEnabled,
      currentPassword,
      newPassword,
    } = body;

    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (driverType !== undefined && ['owner', 'renter'].includes(driverType)) {
      updateData.driverType = driverType;
    }
    if (activeApps !== undefined && Array.isArray(activeApps)) {
      updateData.activeApps = activeApps;
    }
    if (themePreference !== undefined && ['dark', 'light', 'system'].includes(themePreference)) {
      updateData.themePreference = themePreference;
    }
    if (telegramChatId !== undefined) {
      updateData.telegramChatId = telegramChatId ? telegramChatId.trim() : null;
    }
    if (telegramAlertDays !== undefined) {
      updateData.telegramAlertDays = Math.max(1, Math.min(15, parseInt(telegramAlertDays, 10) || 5));
    }
    if (telegramEnabled !== undefined) {
      updateData.telegramEnabled = Boolean(telegramEnabled);
    }

    // Cambio de contraseña si se provee
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Debes ingresar tu contraseña actual para cambiarla' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }

      // Validar contraseña actual
      const [currentUserDb] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, sessionUser.id))
        .limit(1);

      const isValid = await bcrypt.compare(currentPassword, currentUserDb.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'La contraseña actual no es correcta' }, { status: 400 });
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, sessionUser.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        driverType: users.driverType,
        activeApps: users.activeApps,
        moduleDriver: users.moduleDriver,
        moduleExpenses: users.moduleExpenses,
        moduleVehicle: users.moduleVehicle,
        themePreference: users.themePreference,
        telegramChatId: users.telegramChatId,
        telegramAlertDays: users.telegramAlertDays,
        telegramEnabled: users.telegramEnabled,
        subscriptionStatus: users.subscriptionStatus,
      });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Perfil y configuración actualizados correctamente'
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

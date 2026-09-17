import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth.js';
import { sendTelegramMessage, formatMonthlyFinancialReport } from '@/lib/telegram.js';
import { getUserFinancialSummary, getUserVehicleAlerts } from '@/lib/summary.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Permitir pasar un chatId opcional en el body si el usuario aún no guardó los cambios
    let chatId = user.telegramChatId;
    try {
      const body = await request.json();
      if (body?.telegramChatId) {
        chatId = body.telegramChatId.trim();
      }
    } catch {
      // Body vacío, usa el de la BD
    }

    if (!chatId) {
      return NextResponse.json({
        error: 'No tenés un Chat ID de Telegram configurado. Ingresá tu Chat ID o abrí el bot desde el enlace para vincularte.'
      }, { status: 400 });
    }

    // Generar resumen del mes en curso y alertas
    const currentMonth = new Date().toISOString().slice(0, 7);
    const summary = await getUserFinancialSummary(user.id, currentMonth);
    const vehicleAlerts = await getUserVehicleAlerts(user.id);

    const messageText = formatMonthlyFinancialReport(user, summary, vehicleAlerts, summary.daysRemaining);
    const result = await sendTelegramMessage(chatId, messageText);

    if (!result.success) {
      return NextResponse.json({
        error: `Error al enviar mensaje a Telegram: ${result.error}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      simulated: Boolean(result.simulated),
      message: result.simulated
        ? 'Notificación simulada en consola con éxito (configura TELEGRAM_BOT_TOKEN en .env.local para envíos reales).'
        : '¡Mensaje de prueba enviado exitosamente a tu Telegram!'
    });
  } catch (error) {
    console.error('Error en prueba de Telegram:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

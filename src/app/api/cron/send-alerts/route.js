import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users } from '@/db/schema.js';
import { eq, and, isNotNull, ne } from 'drizzle-orm';
import { sendTelegramMessage, formatMonthlyFinancialReport } from '@/lib/telegram.js';
import { getUserFinancialSummary, getUserVehicleAlerts } from '@/lib/summary.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return handleSendAlerts(request);
}

export async function POST(request) {
  return handleSendAlerts(request);
}

async function handleSendAlerts(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const querySecret = searchParams.get('secret');

    // Validación de seguridad si CRON_SECRET está configurado
    if (cronSecret) {
      const isBearerValid = authHeader === `Bearer ${cronSecret}`;
      const isQueryValid = querySecret === cronSecret;
      if (!isBearerValid && !isQueryValid) {
        return NextResponse.json({ error: 'No autorizado para ejecutar cron' }, { status: 401 });
      }
    }

    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = today.getDate();
    const daysRemaining = Math.max(0, daysInMonth - currentDay);

    // Buscar usuarios activos con Telegram habilitado y Chat ID cargado
    const eligibleUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.telegramEnabled, true),
          isNotNull(users.telegramChatId),
          ne(users.subscriptionStatus, 'suspended')
        )
      );

    const results = {
      timestamp: new Date().toISOString(),
      currentMonth,
      daysInMonth,
      currentDay,
      daysRemaining,
      totalChecked: eligibleUsers.length,
      dispatched: 0,
      skippedDueToDays: 0,
      errors: 0,
      details: [],
    };

    for (const user of eligibleUsers) {
      const userAlertDays = user.telegramAlertDays || 5;

      // Verificar si estamos dentro de la ventana de aviso configurada por el usuario
      // (ej. faltan 5 días o menos para el cierre de mes)
      if (daysRemaining > userAlertDays) {
        results.skippedDueToDays++;
        results.details.push({
          userId: user.id,
          name: user.name,
          status: 'skipped',
          reason: `Faltan ${daysRemaining} días, alerta configurada a ${userAlertDays} días`,
        });
        continue;
      }

      try {
        const summary = await getUserFinancialSummary(user.id, currentMonth);
        const vehicleAlerts = await getUserVehicleAlerts(user.id);
        const messageText = formatMonthlyFinancialReport(user, summary, vehicleAlerts, daysRemaining);

        const sendResult = await sendTelegramMessage(user.telegramChatId, messageText);

        if (sendResult.success) {
          results.dispatched++;
          results.details.push({
            userId: user.id,
            name: user.name,
            chatId: user.telegramChatId,
            status: 'sent',
            simulated: Boolean(sendResult.simulated),
          });
        } else {
          results.errors++;
          results.details.push({
            userId: user.id,
            name: user.name,
            status: 'failed',
            error: sendResult.error,
          });
        }
      } catch (err) {
        results.errors++;
        results.details.push({
          userId: user.id,
          name: user.name,
          status: 'error',
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Procesamiento de cron completado: ${results.dispatched} enviados, ${results.skippedDueToDays} omitidos por fecha.`,
      results,
    });
  } catch (error) {
    console.error('Error en ejecución de cron de alertas:', error);
    return NextResponse.json({ error: 'Error interno en cron', details: error.message }, { status: 500 });
  }
}

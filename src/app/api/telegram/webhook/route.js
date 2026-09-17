import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { sendTelegramMessage, formatMonthlyFinancialReport } from '@/lib/telegram.js';
import { getUserFinancialSummary, getUserVehicleAlerts } from '@/lib/summary.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const update = await request.json();

    if (!update || !update.message) {
      return NextResponse.json({ ok: true });
    }

    const msg = update.message;
    const chatId = msg.chat?.id;
    const text = (msg.text || '').trim();

    if (!chatId || !text) {
      return NextResponse.json({ ok: true });
    }

    // 1. Comando /start o /start <token>
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const token = parts[1]?.trim();

      if (token) {
        // Buscar si el token es un ID de usuario o email
        let targetUser = null;
        try {
          const [foundById] = await db
            .select()
            .from(users)
            .where(eq(users.id, token))
            .limit(1);
          targetUser = foundById;
        } catch {
          // Token no era UUID válido
        }

        if (!targetUser) {
          const [foundByEmail] = await db
            .select()
            .from(users)
            .where(eq(users.email, token.toLowerCase()))
            .limit(1);
          targetUser = foundByEmail;
        }

        if (targetUser) {
          // Vincular cuenta
          await db
            .update(users)
            .set({
              telegramChatId: String(chatId),
              telegramEnabled: true,
              updatedAt: new Date(),
            })
            .where(eq(users.id, targetUser.id));

          const welcomeMsg = `🎉 <b>¡Cuenta vinculada exitosamente, ${targetUser.name}!</b>\n\n` +
            `Tu usuario de <b>AutoGastos</b> (${targetUser.email}) ahora está conectado a este chat.\n\n` +
            `🔔 Recibirás automáticamente tu resumen de cierre de mes y alertas de mantenimiento.\n\n` +
            `💡 <i>Comandos disponibles:</i>\n` +
            `• /resumen - Ver tu estado financiero en tiempo real\n` +
            `• /chatid - Ver tu Chat ID\n` +
            `• /ayuda - Guía de comandos`;

          await sendTelegramMessage(chatId, welcomeMsg);
          return NextResponse.json({ ok: true });
        }
      }

      // Si no hubo token o no se encontró usuario
      const promptMsg = `👋 <b>¡Hola! Bienvenido al Bot Oficial de AutoGastos.</b>\n\n` +
        `Tu Chat ID de Telegram es: <code>${chatId}</code>\n\n` +
        `Para vincular tu cuenta con tus finanzas:\n` +
        `1. Ingresá a tu panel en <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://autogastos.app'}/settings">AutoGastos > Configuración</a>\n` +
        `2. Pegá tu Chat ID: <code>${chatId}</code> y activá las notificaciones.\n\n` +
        `¡Y listo! Ya podrás recibir tus reportes diarios y alertas automáticas.`;

      await sendTelegramMessage(chatId, promptMsg);
      return NextResponse.json({ ok: true });
    }

    // 2. Comando /resumen o /estado
    if (text === '/resumen' || text === '/estado') {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegramChatId, String(chatId)))
        .limit(1);

      if (!user) {
        await sendTelegramMessage(chatId, `⚠️ No encontramos ninguna cuenta vinculada a este Telegram.\n\nTu Chat ID es <code>${chatId}</code>. Vinculalo desde <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://autogastos.app'}/settings">Configuración</a>.`);
        return NextResponse.json({ ok: true });
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const summary = await getUserFinancialSummary(user.id, currentMonth);
      const vehicleAlerts = await getUserVehicleAlerts(user.id);
      const reportMsg = formatMonthlyFinancialReport(user, summary, vehicleAlerts, summary.daysRemaining);

      await sendTelegramMessage(chatId, reportMsg);
      return NextResponse.json({ ok: true });
    }

    // 3. Comando /chatid
    if (text === '/chatid' || text === '/id') {
      await sendTelegramMessage(chatId, `🆔 Tu Chat ID de Telegram es: <code>${chatId}</code>`);
      return NextResponse.json({ ok: true });
    }

    // 4. Comando /ayuda o default
    if (text === '/ayuda' || text === '/help') {
      const helpMsg = `🤖 <b>Comandos de AutoGastos Bot:</b>\n\n` +
        `• <b>/resumen</b> - Obtener tu balance financiero del mes y alertas mecánicas al instante.\n` +
        `• <b>/chatid</b> - Mostrar tu Chat ID para configuración manual.\n` +
        `• <b>/ayuda</b> - Ver esta ayuda.\n\n` +
        `🌐 Accedé a la plataforma web: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://autogastos.app'}">autogastos.app</a>`;

      await sendTelegramMessage(chatId, helpMsg);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook de Telegram:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

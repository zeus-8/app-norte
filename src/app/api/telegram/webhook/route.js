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

    const lowerText = text.toLowerCase();

    // 1. Comando /start o /start <token>
    if (lowerText.startsWith('/start') || lowerText.startsWith('start')) {
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
            `• /jornada - Registrar tu día de trabajo\n` +
            `• /pagos - Ver checklist de gastos\n` +
            `• /chatid - Ver tu Chat ID`;

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
    if (lowerText === '/resumen' || lowerText === 'resumen' || lowerText === '/estado' || lowerText === 'estado') {
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

    // 3. Comando /jornada (Cargar jornada diaria por Telegram)
    if (lowerText.startsWith('/jornada') || lowerText.startsWith('jornada')) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegramChatId, String(chatId)))
        .limit(1);

      if (!user) {
        await sendTelegramMessage(chatId, `⚠️ Primero vinculá tu cuenta de AutoGastos con el comando /start o desde Configuración.`);
        return NextResponse.json({ ok: true });
      }

      const paramsText = text.replace(/^\/?jornada/i, '').trim();

      if (!paramsText) {
        const guideMsg = `📝 <b>¿Cómo registrar tu jornada diaria por Telegram?</b>\n\n` +
          `Escribí <code>/jornada</code> seguido de tus datos. Por ejemplo:\n\n` +
          `• <b>Simple:</b> <code>/jornada 55000 nafta 10000 5h 30m 18 viajes</code>\n` +
          `• <b>Multiapp:</b> <code>/jornada uber 35000 cabify 20000 gnc 8000 6h odo 146500</code>\n` +
          `• <b>Mínimo:</b> <code>/jornada 45000</code>\n\n` +
          `El sistema registrará automáticamente tu día y calculará tu ganancia neta y $/hora.`;
        await sendTelegramMessage(chatId, guideMsg);
        return NextResponse.json({ ok: true });
      }

      // Parser inteligente de parámetros
      const lower = paramsText.toLowerCase();
      
      // Fecha de hoy en Argentina
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

      let grossIncome = 0;
      let fuelExpense = 0;
      let otherExpense = 0;
      let hours = 0;
      let minutes = 0;
      let tripsCount = 0;
      let odometerKm = 0;
      const appBreakdown = {};

      // Detectar apps específicas (uber, cabify, didi, rappi, pedidosya, indrive)
      const appMatches = [...lower.matchAll(/(uber|cabify|didi|rappi|pedidosya|indrive)\s*[:=]?\s*(\d+[\.\d]*)/gi)];
      if (appMatches.length > 0) {
        appMatches.forEach(m => {
          const appName = m[1].toLowerCase();
          const amount = parseFloat(m[2]) || 0;
          appBreakdown[appName] = amount;
          grossIncome += amount;
        });
      }

      // Combustible / Nafta / GNC
      const fuelMatch = lower.match(/(?:nafta|gnc|combustible|gas)\s*[:=]?\s*(\d+[\.\d]*)/i);
      if (fuelMatch) {
        fuelExpense = parseFloat(fuelMatch[1]) || 0;
      }

      // Otros gastos
      const otherMatch = lower.match(/(?:otros|peaje|peajes|lavado|gasto)\s*[:=]?\s*(\d+[\.\d]*)/i);
      if (otherMatch) {
        otherExpense = parseFloat(otherMatch[1]) || 0;
      }

      // Horas y Minutos (ej. 5h 30m, 5h30, 5h, 30m)
      const hoursMatch = lower.match(/(\d+)\s*h(?:oras)?/i);
      if (hoursMatch) {
        hours = parseInt(hoursMatch[1], 10) || 0;
      }
      const minsMatch = lower.match(/(\d+)\s*m(?:in|inutos)?/i);
      if (minsMatch) {
        minutes = parseInt(minsMatch[1], 10) || 0;
      }

      // Cantidad de viajes (ej. 18 viajes, 18v)
      const tripsMatch = lower.match(/(\d+)\s*(?:viajes|viaje|v\b)/i) || lower.match(/(?:viajes|viaje)\s*[:=]?\s*(\d+)/i);
      if (tripsMatch) {
        tripsCount = parseInt(tripsMatch[1], 10) || 0;
      }

      // Odómetro (ej. odo 146500, km 146500)
      const odoMatch = lower.match(/(?:odo|odometro|km)\s*[:=]?\s*(\d{4,7})/i);
      if (odoMatch) {
        odometerKm = parseInt(odoMatch[1], 10) || 0;
      }

      // Si no se detectaron apps específicas, tomar el primer número como ingreso bruto
      if (grossIncome === 0) {
        const numbers = paramsText.match(/\b\d{3,9}\b/g);
        if (numbers && numbers.length > 0) {
          grossIncome = parseFloat(numbers[0]) || 0;
        }
      }

      const totalMinutes = (hours * 60) + minutes;
      const netIncome = Math.max(0, grossIncome - fuelExpense - otherExpense);
      const hourlyRate = totalMinutes > 0 ? Math.round(netIncome / (totalMinutes / 60)) : 0;

      // Guardar o actualizar en base de datos PostgreSQL
      const { dailyLogs, userSettings } = await import('@/db/schema.js');
      const { and } = await import('drizzle-orm');

      const [existingLog] = await db
        .select()
        .from(dailyLogs)
        .where(and(eq(dailyLogs.userId, user.id), eq(dailyLogs.date, today)))
        .limit(1);

      if (existingLog) {
        await db
          .update(dailyLogs)
          .set({
            grossIncome: String(grossIncome || existingLog.grossIncome),
            appBreakdown: Object.keys(appBreakdown).length > 0 ? appBreakdown : existingLog.appBreakdown,
            fuelExpense: String(fuelExpense || existingLog.fuelExpense),
            otherExpense: String(otherExpense || existingLog.otherExpense),
            minutesWorked: totalMinutes || existingLog.minutesWorked,
            tripsCount: tripsCount || existingLog.tripsCount,
            odometerKm: odometerKm || existingLog.odometerKm,
            updatedAt: new Date(),
          })
          .where(eq(dailyLogs.id, existingLog.id));
      } else {
        await db.insert(dailyLogs).values({
          userId: user.id,
          date: today,
          grossIncome: String(grossIncome),
          appBreakdown,
          fuelExpense: String(fuelExpense),
          otherExpense: String(otherExpense),
          minutesWorked: totalMinutes,
          tripsCount,
          odometerKm,
        });
      }

      // Actualizar odómetro en ajustes si se ingresó
      if (odometerKm > 0) {
        const [existingOdo] = await db
          .select()
          .from(userSettings)
          .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, 'current_odometer')))
          .limit(1);

        if (existingOdo) {
          await db.update(userSettings).set({ value: String(odometerKm), updatedAt: new Date() }).where(eq(userSettings.id, existingOdo.id));
        } else {
          await db.insert(userSettings).values({ userId: user.id, key: 'current_odometer', value: String(odometerKm) });
        }
      }

      let confirmMsg = `✅ <b>¡Jornada registrada con éxito!</b>\n`;
      confirmMsg += `📅 <b>Fecha:</b> ${today}\n`;
      confirmMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      confirmMsg += `• <b>Facturado Bruto:</b> $${grossIncome.toLocaleString('es-AR')}\n`;
      if (fuelExpense > 0) confirmMsg += `• <b>Combustible:</b> -$${fuelExpense.toLocaleString('es-AR')}\n`;
      if (otherExpense > 0) confirmMsg += `• <b>Otros Gastos:</b> -$${otherExpense.toLocaleString('es-AR')}\n`;
      confirmMsg += `• 💵 <b>Ganancia Neta:</b> <b>$${netIncome.toLocaleString('es-AR')}</b>\n`;
      if (totalMinutes > 0) {
        confirmMsg += `• ⏱️ <b>Tiempo:</b> ${hours}h ${minutes}m (${hourlyRate > 0 ? `$${hourlyRate.toLocaleString('es-AR')}/hora` : ''})\n`;
      }
      if (tripsCount > 0) confirmMsg += `• 🚘 <b>Viajes:</b> ${tripsCount}\n`;
      if (odometerKm > 0) confirmMsg += `• 📍 <b>Odómetro:</b> ${odometerKm.toLocaleString('es-AR')} km\n`;
      confirmMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      confirmMsg += `📲 <i>Ya puedes ver tu balance actualizado en la web o con /resumen</i>`;

      await sendTelegramMessage(chatId, confirmMsg);
      return NextResponse.json({ ok: true });
    }

    // 4. Comando /pagos o /checklist
    if (text === '/pagos' || text === '/checklist' || text === '/gastos') {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegramChatId, String(chatId)))
        .limit(1);

      if (!user) {
        await sendTelegramMessage(chatId, `⚠️ Primero vinculá tu cuenta con /start.`);
        return NextResponse.json({ ok: true });
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const summary = await getUserFinancialSummary(user.id, currentMonth);
      const breakdown = summary.expensesBreakdown || [];

      let listMsg = `📋 <b>Checklist de Pagos del Mes (${currentMonth})</b>\n`;
      listMsg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (breakdown.length === 0) {
        listMsg += `No tienes gastos cargados para este mes.\n`;
      } else {
        breakdown.forEach(item => {
          const check = item.isPaid ? '✅' : '⏳';
          const statusTxt = item.isPaid ? '<b>PAGADO</b>' : '<b>PENDIENTE</b>';
          const dueTxt = item.dueDay ? `(Vence día ${item.dueDay})` : '';
          listMsg += `${check} ${item.name}: $${Math.round(item.userShareAmount).toLocaleString('es-AR')} — ${statusTxt} ${dueTxt}\n`;
        });
      }

      listMsg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      listMsg += `• <b>Total Obligaciones:</b> $${summary.totalObligations.toLocaleString('es-AR')}\n`;
      listMsg += `• ✅ <b>Cancelado:</b> $${summary.totalPaidObligations.toLocaleString('es-AR')}\n`;
      listMsg += `• ⏳ <b>Pendiente:</b> $${summary.totalPendingObligations.toLocaleString('es-AR')}\n`;

      await sendTelegramMessage(chatId, listMsg);
      return NextResponse.json({ ok: true });
    }

    // 5. Comando /chatid
    if (text === '/chatid' || text === '/id') {
      await sendTelegramMessage(chatId, `🆔 Tu Chat ID de Telegram es: <code>${chatId}</code>`);
      return NextResponse.json({ ok: true });
    }

    // 6. Comando /ayuda o default
    if (text === '/ayuda' || text === '/help') {
      const helpMsg = `🤖 <b>Comandos disponibles en AutoGastos Bot:</b>\n\n` +
        `• <b>/resumen</b> - Consultar tu balance financiero del mes y alertas al instante.\n` +
        `• <b>/jornada ...</b> - Registrar tu jornada de trabajo en segundos (ej. <code>/jornada 50000 nafta 10000 5h 30m</code>).\n` +
        `• <b>/pagos</b> - Ver el checklist de gastos pagados vs pendientes del mes.\n` +
        `• <b>/chatid</b> - Mostrar tu Chat ID de Telegram.\n\n` +
        `🌐 Abrir panel: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://autogastos.app'}">autogastos.app</a>`;

      await sendTelegramMessage(chatId, helpMsg);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook de Telegram:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

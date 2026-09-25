import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { sendTelegramMessage, formatMonthlyFinancialReport } from '@/lib/telegram.js';
import { getUserFinancialSummary, getUserVehicleAlerts } from '@/lib/summary.js';
import { syncUserOdometer } from '@/lib/odometer.js';

export const dynamic = 'force-dynamic';

// ==============================================================================
// PARSER INTELIGENTE DE JORNADAS MULTIAPP (Soporte Multilínea y Línea Única)
// ==============================================================================
function parseJornadaInput(paramsText, defaultApp = 'uber') {
  let grossIncome = 0;
  let fuelExpense = 0;
  let otherExpense = 0;
  let hours = 0;
  let minutes = 0;
  let tripsCount = 0;
  let odometerKm = 0;
  let notes = '';
  const appBreakdown = {};

  // 1. Extraer notas u observaciones primero (para no interferir con los números)
  const notesMatch = paramsText.match(/(?:^|\n|\b)(?:notas?|obs|observaci[oó]n|comentarios?)\s*[:=]?\s*(.*)$/im);
  if (notesMatch) {
    notes = notesMatch[1].trim();
  }

  // 2. Extraer fecha personalizada si se especificó (ej. fecha: 2026-09-23, fecha: ayer, o palabra "ayer")
  let targetDate = null;
  const dateMatch = paramsText.match(/(?:^|\n|\b)(?:fecha|dia|date)\s*[:=]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|ayer|today|hoy)\b/i) ||
                    paramsText.match(/(?:^|\s)(ayer)\b/i);
  if (dateMatch) {
    const val = (dateMatch[1] || '').toLowerCase();
    if (val === 'ayer') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      targetDate = d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    } else if (val === 'hoy' || val === 'today') {
      targetDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    } else if (val.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
      targetDate = val;
    }
  }

  // Quitar la línea o bloque de notas y fecha para analizar los datos numéricos
  let cleanText = notesMatch ? paramsText.replace(notesMatch[0], '') : paramsText;
  if (dateMatch) {
    cleanText = cleanText.replace(dateMatch[0], '');
  }
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const l = line.toLowerCase();

    // Detección de Apps y Viajes Particulares (ej. uber: 67000 o particular: 25000)
    const appMatches = [...l.matchAll(/(uber|cabify|didi|particular|privado|remis|rappi|pedidosya|indrive)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/gi)];
    if (appMatches.length > 0) {
      for (const m of appMatches) {
        let appName = m[1].toLowerCase();
        if (appName === 'privado' || appName === 'remis') appName = 'particular';
        const amt = parseFloat(m[2].replace(',', '.')) || 0;
        appBreakdown[appName] = (appBreakdown[appName] || 0) + amt;
        grossIncome += amt;
      }
    }

    // Combustible (ej. nafta: 16000 o 16000 nafta o gnc: 8000)
    const fuelMatch = l.match(/(?:nafta|gnc|combustible|gas)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) ||
                      l.match(/(\d+(?:[.,]\d+)?)\s*(?:nafta|gnc|combustible|gas)\b/i);
    if (fuelMatch) {
      fuelExpense = parseFloat(fuelMatch[1].replace(',', '.')) || 0;
    }

    // Otros gastos (ej. otros: 2000 o peaje: 2000)
    const otherMatch = l.match(/(?:otros?|peajes?|lavados?|gastos?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) ||
                       l.match(/(\d+(?:[.,]\d+)?)\s*(?:otros?|peajes?|lavados?)\b/i);
    if (otherMatch) {
      otherExpense = parseFloat(otherMatch[1].replace(',', '.')) || 0;
    }

    // Horas (Prefix: horas: 6, hora: 6, hs: 6, h: 6 | Suffix: 6h, 6hs, 6 horas)
    const hPre = l.match(/(?:^|\s)(?:horas?|hs?|h)\s*[:=]?\s*(\d+)\b/i);
    const hSuf = l.match(/\b(\d+)\s*(?:horas?|hs?|h)(?:\s|$|[,;])/i);
    if (hPre) hours = parseInt(hPre[1], 10) || 0;
    else if (hSuf) hours = parseInt(hSuf[1], 10) || 0;

    // Minutos (Prefix: min: 30, minutos: 30, m: 30 | Suffix: 30m, 30min, 30 minutos)
    const mPre = l.match(/(?:^|\s)(?:minutos?|mins?|m)\s*[:=]?\s*(\d+)\b/i);
    const mSuf = l.match(/\b(\d+)\s*(?:minutos?|mins?|m)(?:\s|$|[,;])/i);
    if (mPre) minutes = parseInt(mPre[1], 10) || 0;
    else if (mSuf) minutes = parseInt(mSuf[1], 10) || 0;

    // Cantidad de viajes (Prefix: viajes: 22, v: 22 | Suffix: 22 viajes, 22v)
    const tPre = l.match(/(?:^|\s)(?:viajes?|v)\s*[:=]?\s*(\d+)\b/i);
    const tSuf = l.match(/\b(\d+)\s*(?:viajes?|v)\b/i);
    if (tPre) tripsCount = parseInt(tPre[1], 10) || 0;
    else if (tSuf) tripsCount = parseInt(tSuf[1], 10) || 0;

    // Odómetro (Prefix: odo: 190136, odómetro: 190.136, km: 190136, kilometros: 190136 | Suffix: 190136 km, 190.136 kms, 190136 odo)
    const oPre = l.match(/(?:^|\s)(?:odo|od[oó]metro|km|kms|kil[oó]metros?|kilometraje)\s*[:=]?\s*(\d+(?:[.,]\d{3})*|\d+)\b/i);
    const oSuf = l.match(/\b(\d+(?:[.,]\d{3})*|\d+)\s*(?:km|kms|odo|od[oó]metro|kil[oó]metros?)\b/i);
    if (oPre) {
      odometerKm = parseInt(oPre[1].replace(/[.,]/g, ''), 10) || 0;
    } else if (oSuf) {
      odometerKm = parseInt(oSuf[1].replace(/[.,]/g, ''), 10) || 0;
    }
  }

  // Si no se indicaron apps, buscar si hay un total directo
  if (grossIncome === 0) {
    const totalMatch = cleanText.match(/(?:total|bruto|ingreso)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    if (totalMatch) {
      grossIncome = parseFloat(totalMatch[1].replace(',', '.')) || 0;
    } else {
      const allNumbers = [...cleanText.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1], 10));
      const usedNumbers = [fuelExpense, otherExpense, odometerKm, tripsCount, hours, minutes];
      for (const num of allNumbers) {
        if (!usedNumbers.includes(num) && num > 100) {
          grossIncome = num;
          break;
        }
      }
    }
  }

  // Si hubo ingreso bruto pero no se especificó app particular, imputar a la app predeterminada (por defecto uber)
  if (grossIncome > 0 && Object.keys(appBreakdown).length === 0) {
    appBreakdown[defaultApp || 'uber'] = grossIncome;
  }

  return {
    grossIncome,
    fuelExpense,
    otherExpense,
    hours,
    minutes,
    tripsCount,
    odometerKm,
    notes,
    appBreakdown,
    targetDate,
  };
}

// ==============================================================================
// PARSER DE GASTOS POR TELEGRAM (Simple, Compartido, Cuotas o Multilínea)
// ==============================================================================
function parseGastoInput(paramsText) {
  let name = '';
  let totalAmount = 0;
  let type = 'one_time';
  let installmentCount = 1;
  let isShared = false;
  let userSharePct = 100;
  let paymentMethod = 'Efectivo';
  let category = 'Varios';
  let notes = '';

  const lines = paramsText.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length > 1) {
    // Formato estructurado por líneas (clave: valor)
    for (const line of lines) {
      const l = line.toLowerCase();
      const cMatch = line.match(/^(?:concepto|nombre|item|gasto)\s*[:=]?\s*(.+)$/i);
      if (cMatch) name = cMatch[1].trim();

      const mMatch = l.match(/^(?:monto|importe|precio|total|valor)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
      if (mMatch) totalAmount = parseFloat(mMatch[1].replace(',', '.')) || 0;

      const catMatch = line.match(/^(?:categoria|rubro)\s*[:=]?\s*(.+)$/i);
      if (catMatch) category = catMatch[1].trim();

      const cuoMatch = l.match(/(?:cuotas?)\s*[:=]?\s*(\d+)/i);
      if (cuoMatch) {
        installmentCount = parseInt(cuoMatch[1], 10) || 1;
        if (installmentCount > 1) type = 'installment';
      }

      if (l.includes('fijo')) type = 'fixed';

      if (l.match(/(?:compartido|hogar|casa)\s*[:=]?\s*(?:si|yes|true|\d+%?)/i)) {
        isShared = true;
        const pctMatch = l.match(/(\d+)%/);
        if (pctMatch) userSharePct = parseInt(pctMatch[1], 10);
      }

      const payMatch = line.match(/^(?:pago|medio|forma|metodo)\s*[:=]?\s*(.+)$/i);
      if (payMatch) {
        const p = payMatch[1].toLowerCase();
        if (p.includes('deb')) paymentMethod = 'Débito';
        else if (p.includes('cred')) paymentMethod = 'Crédito';
        else if (p.includes('mercado') || p.includes('mp')) paymentMethod = 'Mercado Pago';
        else if (p.includes('transf')) paymentMethod = 'Transferencia';
        else paymentMethod = 'Efectivo';
      }

      const nMatch = line.match(/^(?:nota|notas|obs|comentario)\s*[:=]?\s*(.+)$/i);
      if (nMatch) notes = nMatch[1].trim();
    }
  } else {
    // Formato corrido en una sola línea (ej. /gasto Supermercado 45000 compartido 60% debito)
    const line = paramsText;
    const l = line.toLowerCase();

    // Cuotas
    const cuoMatch = l.match(/(\d+)\s*cuotas?/i);
    if (cuoMatch) {
      installmentCount = parseInt(cuoMatch[1], 10) || 1;
      if (installmentCount > 1) type = 'installment';
    } else if (l.includes('fijo')) {
      type = 'fixed';
    }

    // Compartido
    if (l.includes('compartido') || l.includes('hogar') || l.includes('pareja')) {
      isShared = true;
      const pctMatch = l.match(/(\d+)%/);
      if (pctMatch) userSharePct = parseInt(pctMatch[1], 10);
    }

    // Medio de pago
    if (l.includes('debito') || l.includes('débito')) paymentMethod = 'Débito';
    else if (l.includes('credito') || l.includes('crédito')) paymentMethod = 'Crédito';
    else if (l.includes('mercado pago') || l.includes('mp')) paymentMethod = 'Mercado Pago';
    else if (l.includes('transferencia')) paymentMethod = 'Transferencia';

    // Monto
    let amountText = line;
    if (cuoMatch) amountText = amountText.replace(cuoMatch[0], '');
    if (userSharePct && l.includes('%')) amountText = amountText.replace(/\d+%/, '');

    const amtMatch = amountText.match(/\b(\d+(?:[.,]\d+)?)\b/);
    if (amtMatch) {
      totalAmount = parseFloat(amtMatch[1].replace(',', '.')) || 0;
    }

    // Nombre / Concepto
    let concept = line
      .replace(/\b\d+(?:[.,]\d+)?\b/g, '')
      .replace(/\b(?:cuotas?|fijo|compartido|hogar|pareja|debito|débito|credito|crédito|efectivo|transferencia|mercado\s*pago|mp)\b/gi, '')
      .replace(/[%\$]/g, '')
      .trim();

    name = concept || 'Gasto Telegram';
  }

  // Detección automática inteligente de Categoría si quedó en 'Varios'
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('super') || lowerName.includes('coto') || lowerName.includes('dia') || lowerName.includes('comida') || lowerName.includes('carne') || lowerName.includes('verdu')) {
    category = 'Supermercado';
  } else if (lowerName.includes('nafta') || lowerName.includes('gnc') || lowerName.includes('combustible') || lowerName.includes('peaje') || lowerName.includes('auto') || lowerName.includes('cubierta') || lowerName.includes('taller')) {
    category = 'Transporte / Auto';
  } else if (lowerName.includes('luz') || lowerName.includes('gas') || lowerName.includes('internet') || lowerName.includes('alquiler') || lowerName.includes('agua') || lowerName.includes('expensas')) {
    category = 'Servicios / Hogar';
  }

  return {
    name: name || 'Gasto Telegram',
    totalAmount,
    type,
    installmentCount,
    isShared,
    userSharePct,
    paymentMethod,
    category,
    notes,
  };
}

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
          `Escribí <code>/jornada</code> seguido de tus datos. Funciona tanto en una línea como en líneas separadas:\n\n` +
          `• <b>Formato por líneas (Recomendado):</b>\n` +
          `<code>/jornada\nuber: 67000\nnafta: 16000\notros: 2000\nhoras: 6\nmin: 30\nviajes: 22\nodo: 190136\nnotas: Lluvia y alta tarifa</code>\n\n` +
          `• <b>Formato simple en una línea:</b>\n` +
          `<code>/jornada 55000 nafta 10000 5h 30m 18 viajes odo 190136</code>\n\n` +
          `• <b>Multiapp en una línea:</b>\n` +
          `<code>/jornada uber 35000 cabify 20000 gnc 8000 6h viajes 20</code>\n\n` +
          `El sistema registrará automáticamente tu día, tus notas y calculará tu ganancia neta y $/hora.`;
        await sendTelegramMessage(chatId, guideMsg);
        return NextResponse.json({ ok: true });
      }

      // Parser estructurado línea por línea
      const defaultApp = (user.activeApps && user.activeApps.length > 0) ? user.activeApps[0] : 'uber';
      const parsed = parseJornadaInput(paramsText, defaultApp);
      const today = parsed.targetDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

      const totalMinutes = (parsed.hours * 60) + parsed.minutes;
      const netIncome = Math.max(0, parsed.grossIncome - parsed.fuelExpense - parsed.otherExpense);
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
            grossIncome: String(parsed.grossIncome || existingLog.grossIncome),
            appBreakdown: Object.keys(parsed.appBreakdown).length > 0 ? parsed.appBreakdown : existingLog.appBreakdown,
            fuelExpense: String(parsed.fuelExpense || existingLog.fuelExpense),
            otherExpense: String(parsed.otherExpense || existingLog.otherExpense),
            minutesWorked: totalMinutes || existingLog.minutesWorked,
            tripsCount: parsed.tripsCount || existingLog.tripsCount,
            odometerKm: parsed.odometerKm || existingLog.odometerKm,
            notes: parsed.notes ? parsed.notes : existingLog.notes,
            updatedAt: new Date(),
          })
          .where(eq(dailyLogs.id, existingLog.id));
      } else {
        await db.insert(dailyLogs).values({
          userId: user.id,
          date: today,
          grossIncome: String(parsed.grossIncome),
          appBreakdown: parsed.appBreakdown,
          fuelExpense: String(parsed.fuelExpense),
          otherExpense: String(parsed.otherExpense),
          minutesWorked: totalMinutes,
          tripsCount: parsed.tripsCount,
          odometerKm: parsed.odometerKm,
          notes: parsed.notes,
        });
      }

      // Sincronizar odómetro actual del vehículo
      let currentCarOdo = 0;
      if (parsed.odometerKm > 0 || existingLog) {
        currentCarOdo = await syncUserOdometer(user.id);
      }

      let confirmMsg = `✅ <b>¡Jornada registrada con éxito!</b>\n`;
      confirmMsg += `📅 <b>Fecha:</b> ${today}\n`;
      confirmMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      confirmMsg += `• <b>Facturado Bruto:</b> $${parsed.grossIncome.toLocaleString('es-AR')}\n`;
      if (parsed.fuelExpense > 0) confirmMsg += `• <b>Combustible:</b> -$${parsed.fuelExpense.toLocaleString('es-AR')}\n`;
      if (parsed.otherExpense > 0) confirmMsg += `• <b>Otros Gastos:</b> -$${parsed.otherExpense.toLocaleString('es-AR')}\n`;
      confirmMsg += `• 💵 <b>Ganancia Neta:</b> <b>$${netIncome.toLocaleString('es-AR')}</b>\n`;
      if (totalMinutes > 0) {
        confirmMsg += `• ⏱️ <b>Tiempo:</b> ${parsed.hours}h ${parsed.minutes}m (${hourlyRate > 0 ? `$${hourlyRate.toLocaleString('es-AR')}/hora` : ''})\n`;
      }
      if (parsed.tripsCount > 0) confirmMsg += `• 🚘 <b>Viajes:</b> ${parsed.tripsCount}\n`;
      if (parsed.odometerKm > 0 || currentCarOdo > 0) {
        confirmMsg += `• 📍 <b>Odómetro:</b> ${(parsed.odometerKm || currentCarOdo).toLocaleString('es-AR')} km\n`;
      }
      if (parsed.notes) confirmMsg += `• 📝 <b>Notas:</b> ${parsed.notes}\n`;
      confirmMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      confirmMsg += `📲 <i>Ya puedes ver tu balance actualizado en la web o con /resumen</i>`;

      await sendTelegramMessage(chatId, confirmMsg);
      return NextResponse.json({ ok: true });
    }

    // 4. Comando /gasto (Cargar gasto puntual, cuotas o compartido por Telegram)
    if (lowerText.startsWith('/gasto') || lowerText.startsWith('gasto')) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegramChatId, String(chatId)))
        .limit(1);

      if (!user) {
        await sendTelegramMessage(chatId, `⚠️ Primero vinculá tu cuenta de AutoGastos con el comando /start o desde Configuración.`);
        return NextResponse.json({ ok: true });
      }

      const paramsText = text.replace(/^\/?gasto/i, '').trim();

      if (!paramsText) {
        const guideMsg = `📝 <b>¿Cómo registrar un gasto por Telegram?</b>\n\n` +
          `Escribí <code>/gasto</code> seguido del concepto y el monto. Por ejemplo:\n\n` +
          `• <b>Gasto simple:</b>\n` +
          `<code>/gasto Supermercado 45000</code>\n\n` +
          `• <b>Compartido con tu pareja:</b>\n` +
          `<code>/gasto Supermercado 45000 compartido 60% debito</code>\n\n` +
          `• <b>Compra en cuotas:</b>\n` +
          `<code>/gasto Cubiertas 120000 3 cuotas credito</code>\n\n` +
          `• <b>Gasto fijo mensual:</b>\n` +
          `<code>/gasto Alquiler 250000 fijo transferencia</code>\n\n` +
          `El gasto se agregará inmediatamente a tus cuentas y se reflejará en /pagos y en la web.`;
        await sendTelegramMessage(chatId, guideMsg);
        return NextResponse.json({ ok: true });
      }

      const parsedGasto = parseGastoInput(paramsText);

      if (parsedGasto.totalAmount <= 0) {
        await sendTelegramMessage(chatId, `⚠️ No detecté el monto del gasto. Por favor indicá el valor (ej. <code>/gasto Super 35000</code>).`);
        return NextResponse.json({ ok: true });
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentDay = new Date().getDate();

      // Buscar si el usuario tiene un hogar compartido activo
      let householdId = null;
      if (parsedGasto.isShared) {
        const { householdMembers } = await import('@/db/schema.js');
        const [membership] = await db
          .select()
          .from(householdMembers)
          .where(and(eq(householdMembers.userId, user.id), eq(householdMembers.status, 'accepted')))
          .limit(1);
        if (membership) {
          householdId = membership.householdId;
          if (parsedGasto.userSharePct === 100 && membership.defaultSharePct) {
            parsedGasto.userSharePct = Number(membership.defaultSharePct);
          }
        }
      }

      const { expenses } = await import('@/db/schema.js');
      const count = parsedGasto.installmentCount || 1;
      const instAmount = parsedGasto.totalAmount / count;

      // Calcular mes de fin si son cuotas
      let endMonth = null;
      if (parsedGasto.type === 'installment' && count > 1) {
        const [y, m] = currentMonth.split('-').map(Number);
        const endDate = new Date(y, m - 1 + count - 1, 1);
        endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (parsedGasto.type === 'one_time') {
        endMonth = currentMonth;
      }

      await db.insert(expenses).values({
        userId: user.id,
        householdId,
        name: parsedGasto.name,
        category: parsedGasto.category,
        type: parsedGasto.type,
        totalAmount: String(parsedGasto.totalAmount),
        installmentCount: count,
        installmentAmount: String(instAmount),
        startMonth: currentMonth,
        endMonth,
        dueDay: Math.min(31, Math.max(1, currentDay)),
        isShared: parsedGasto.isShared,
        userSharePct: String(parsedGasto.userSharePct),
        paymentMethod: parsedGasto.paymentMethod,
        status: 'active',
        notes: parsedGasto.notes || 'Cargado vía Telegram Bot',
      });

      const userAmount = parsedGasto.isShared 
        ? (parsedGasto.totalAmount * (parsedGasto.userSharePct / 100)) 
        : parsedGasto.totalAmount;

      let confirmMsg = `✅ <b>¡Gasto registrado con éxito!</b>\n`;
      confirmMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      confirmMsg += `• <b>Concepto:</b> ${parsedGasto.name}\n`;
      confirmMsg += `• <b>Monto Total:</b> $${parsedGasto.totalAmount.toLocaleString('es-AR')}\n`;
      confirmMsg += `• <b>Categoría:</b> ${parsedGasto.category}\n`;
      if (parsedGasto.type === 'installment') {
        confirmMsg += `• <b>Cuotas:</b> ${count} de $${Math.round(instAmount).toLocaleString('es-AR')}\n`;
      }
      if (parsedGasto.isShared) {
        confirmMsg += `• 🏡 <b>Compartido:</b> ${parsedGasto.userSharePct}% tu parte ➡️ <b>$${Math.round(userAmount).toLocaleString('es-AR')}</b>\n`;
      }
      confirmMsg += `• 💳 <b>Medio de pago:</b> ${parsedGasto.paymentMethod}\n`;
      confirmMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      confirmMsg += `📲 <i>Podés ver tu checklist de pagos con /pagos o tu balance con /resumen</i>`;

      await sendTelegramMessage(chatId, confirmMsg);
      return NextResponse.json({ ok: true });
    }

    // 4.5. Comando /adelanto o /retiro (Adelanto de apps sin alterar facturación de odómetro)
    if (lowerText.startsWith('/adelanto') || lowerText.startsWith('/retiro') || lowerText.startsWith('adelanto') || lowerText.startsWith('retiro')) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegramChatId, String(chatId)))
        .limit(1);

      if (!user) {
        await sendTelegramMessage(chatId, `⚠️ Primero vinculá tu cuenta con /start.`);
        return NextResponse.json({ ok: true });
      }

      const paramsText = text.replace(/^\/?(?:adelanto|retiro)/i, '').trim();

      if (!paramsText) {
        const guideMsg = `📲 <b>¿Cómo registrar un adelanto o cobro anticipado de app?</b>\n\n` +
          `Escribí <code>/adelanto</code> seguido de la app y el monto retirado:\n\n` +
          `• <b>Ejemplos:</b>\n` +
          `<code>/adelanto uber 40000</code>\n` +
          `<code>/retiro cabify 25000 mercadopago</code>\n` +
          `<code>/adelanto 30000 didi banco</code>\n\n` +
          `💡 <i>Este registro no altera tu facturación bruta ni el odómetro, pero descuenta del saldo pendiente de cobro en la app e ingresa el dinero a tu caja para el arqueo.</i>`;
        await sendTelegramMessage(chatId, guideMsg);
        return NextResponse.json({ ok: true });
      }

      // Detectar App
      let targetApp = 'uber';
      const appMatch = paramsText.match(/\b(uber|cabify|didi|indrive|rappi|pedidosya)\b/i);
      if (appMatch) {
        targetApp = appMatch[1].toLowerCase();
      }

      // Detectar Monto
      let amount = 0;
      const amtMatch = paramsText.match(/\b(\d+(?:[.,]\d+)?)\b/);
      if (amtMatch) {
        amount = parseFloat(amtMatch[1].replace(',', '.')) || 0;
      }

      if (amount <= 0) {
        await sendTelegramMessage(chatId, `⚠️ Por favor indica un monto válido mayor a 0. Ejemplo: <code>/adelanto uber 40000</code>`);
        return NextResponse.json({ ok: true });
      }

      // Detectar Destino
      let destination = 'Mercado Pago';
      const lowerParams = paramsText.toLowerCase();
      if (lowerParams.includes('banco') || lowerParams.includes('cuenta')) destination = 'Banco';
      else if (lowerParams.includes('efectivo') || lowerParams.includes('cash')) destination = 'Efectivo';
      else if (lowerParams.includes('mp') || lowerParams.includes('mercado')) destination = 'Mercado Pago';

      // Detectar si se asigna a un gasto del mes (ej. /adelanto uber 40000 mp gasto: comida)
      let allocatedExpense = null;
      const gastoMatch = paramsText.match(/(?:gasto|para|item)\s*[:=]?\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i);
      if (gastoMatch) {
        const searchName = gastoMatch[1].trim().toLowerCase();
        const { expenses } = await import('@/db/schema.js');
        const userExpenses = await db.query.expenses.findMany({
          where: eq(expenses.userId, user.id),
        });
        allocatedExpense = userExpenses.find(e => e.name.toLowerCase().includes(searchName)) || null;
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

      const { appAdvances } = await import('@/db/schema.js');

      await db.insert(appAdvances).values({
        userId: user.id,
        app: targetApp,
        amount: String(amount),
        date: today,
        month: currentMonth,
        destination,
        expenseId: allocatedExpense ? allocatedExpense.id : null,
        notes: allocatedExpense 
          ? `Destinado a ${allocatedExpense.name} vía Telegram` 
          : 'Registrado vía Telegram Bot',
      });

      // Calcular nuevo saldo pendiente en la app
      const summary = await getUserFinancialSummary(user.id, currentMonth);
      const billedInApp = summary.appBreakdownTotals?.[targetApp] || 0;
      const totalAdvInApp = summary.cashFlow?.advancesByApp?.[targetApp] || amount;
      const pendingApp = Math.max(0, billedInApp - totalAdvInApp);

      const appNameCaps = targetApp.charAt(0).toUpperCase() + targetApp.slice(1);
      let confirmMsg = `✅ <b>¡Adelanto de ${appNameCaps} registrado!</b>\n`;
      confirmMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      confirmMsg += `• <b>Monto Retirado:</b> $${amount.toLocaleString('es-AR')}\n`;
      confirmMsg += `• <b>Destino:</b> ${destination}\n`;
      confirmMsg += `• <b>Fecha:</b> ${today}\n`;
      if (allocatedExpense) {
        confirmMsg += `• 🛒 <b>Abonado a:</b> ${allocatedExpense.name} <i>(descontado de tus obligaciones del mes)</i>\n`;
      }
      confirmMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      confirmMsg += `• <b>Facturado en ${appNameCaps}:</b> $${Math.round(billedInApp).toLocaleString('es-AR')}\n`;
      confirmMsg += `• 📲 <b>Total Adelantos ${appNameCaps}:</b> $${Math.round(totalAdvInApp).toLocaleString('es-AR')}\n`;
      confirmMsg += `• ⏳ <b>Saldo pendiente a liquidar:</b> <b>$${Math.round(pendingApp).toLocaleString('es-AR')}</b>\n`;
      confirmMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      confirmMsg += `💡 <i>Tu odómetro y métricas de $/h no se alteran. El dinero ingresó a tu disponibilidad de caja.</i>`;

      await sendTelegramMessage(chatId, confirmMsg);
      return NextResponse.json({ ok: true });
    }

    // 5. Comando /pagos o /checklist
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

    // 6. Comando /chatid
    if (text === '/chatid' || text === '/id') {
      await sendTelegramMessage(chatId, `🆔 Tu Chat ID de Telegram es: <code>${chatId}</code>`);
      return NextResponse.json({ ok: true });
    }

    // 7. Comando /ayuda o default
    if (text === '/ayuda' || text === '/help') {
      const helpMsg = `🤖 <b>Comandos disponibles en AutoGastos Bot:</b>\n\n` +
        `• <b>/resumen</b> - Consultar tu balance financiero del mes y alertas al instante.\n` +
        `• <b>/jornada ...</b> - Registrar tu jornada diaria multiapp (ej. <code>/jornada 50000 nafta 10000 5h 30m</code> o por renglones).\n` +
        `• <b>/gasto ...</b> - Cargar un gasto personal o compartido al instante (ej. <code>/gasto Super 45000</code>).\n` +
        `• <b>/adelanto ...</b> - Registrar un adelanto o retiro inmediato de app (ej. <code>/adelanto uber 40000</code>).\n` +
        `• <b>/pagos</b> - Ver el checklist de gastos pagados vs pendientes del mes.\n` +
        `• <b>/chatid</b> - Mostrar tu Chat ID de Telegram.\n\n` +
        `🌐 Abrir panel web: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://autogastos.app'}">autogastos.app</a>`;

      await sendTelegramMessage(chatId, helpMsg);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook de Telegram:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

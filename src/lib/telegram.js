/**
 * Telegram Bot Service & Formatter para AutoGastos SaaS
 * Maneja el envío de mensajes, vinculación de usuarios y formato de reportes financieros.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Envía un mensaje a un chat de Telegram.
 * Si no hay TELEGRAM_BOT_TOKEN configurado, opera en modo simulación (logging).
 */
export async function sendTelegramMessage(chatId, text, options = {}) {
  if (!chatId) {
    return { success: false, error: 'No se especificó chatId de Telegram' };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log(`[TELEGRAM SIMULADOR] Para Chat ID ${chatId}:\n${text}`);
    return {
      success: true,
      simulated: true,
      message: 'Mensaje simulado en consola (TELEGRAM_BOT_TOKEN no configurado)'
    };
  }

  try {
    const url = `${TELEGRAM_API_BASE}${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: options.parseMode || 'HTML',
        disable_web_page_preview: true,
        ...options
      })
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('[Telegram API Error]', data);
      
      // Mensajes amigables para errores típicos de Telegram
      if (data.description && data.description.includes('chat not found')) {
        return {
          success: false,
          error: `Telegram requiere que primero abras tu bot @${process.env.TELEGRAM_BOT_USERNAME || 'MiAutoGastos_bot'} y presiones el botón "Iniciar" (o le envíes /start) para autorizarlo.`
        };
      }

      if (data.description && data.description.includes('bot was blocked')) {
        return {
          success: false,
          error: `El bot fue bloqueado en Telegram. Desbloquéalo en tu app de Telegram para recibir mensajes.`
        };
      }

      return { success: false, error: data.description || 'Error de API de Telegram' };
    }

    return { success: true, data: data.result };
  } catch (err) {
    console.error('[Telegram Send Error]', err);
    return { success: false, error: err.message };
  }
}

/**
 * Formatea el reporte financiero mensual y alertas mecánicas en HTML para Telegram.
 */
export function formatMonthlyFinancialReport(user, summary, vehicleAlerts = [], daysLeft = null) {
  const userName = user?.name || 'Chofer';
  const driverTypeLabel = user?.driverType === 'owner' ? 'Auto Propio' : 'Auto Alquilado';
  
  const gross = Number(summary?.grossIncome || 0);
  const fuel = Number(summary?.fuelExpense || 0);
  const net = Number(summary?.netIncome || 0);
  const fixed = Number(summary?.fixedExpensesUserShare || 0);
  const installments = Number(summary?.installmentsUserShare || 0);
  const totalObligations = fixed + installments;
  const freeBalance = Number(summary?.freeBalance || (net - totalObligations));
  
  const daysWorked = Number(summary?.daysWorked || 0);
  const totalMinutes = Number(summary?.totalMinutesWorked || 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeFormatted = `${hours}h ${mins}m`;
  
  const hourlyRate = totalMinutes > 0 ? Math.round((net / (totalMinutes / 60))) : 0;
  
  const formatMoney = (val) => {
    return '$' + Math.round(Number(val || 0)).toLocaleString('es-AR');
  };

  const daysHeader = daysLeft !== null 
    ? `<i>(Faltan <b>${daysLeft}</b> días para el cierre de mes)</i>\n` 
    : '';

  let msg = `🚗 <b>Resumen Financiero AutoGastos</b>\n`;
  msg += `👤 <b>${userName}</b> (${driverTypeLabel})\n`;
  msg += daysHeader;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // 1. Jornadas Multiapp
  msg += `📱 <b>Jornadas de Trabajo:</b>\n`;
  msg += `• <b>Facturado Bruto:</b> ${formatMoney(gross)}\n`;
  msg += `• <b>Días / Tiempo:</b> ${daysWorked} días (${timeFormatted})\n`;
  msg += `• <b>Combustible:</b> -${formatMoney(fuel)}\n`;
  msg += `• <b>Ganancia Neta:</b> <b>${formatMoney(net)}</b>\n`;
  if (hourlyRate > 0) {
    msg += `• <b>Rendimiento Promedio:</b> ${formatMoney(hourlyRate)} / hora\n`;
  }
  msg += `\n`;

  // 2. Obligaciones y Cuotas
  const totalPaid = Number(summary?.totalPaidObligations || 0);
  const totalPending = Number(summary?.totalPendingObligations !== undefined ? summary.totalPendingObligations : Math.max(0, totalObligations - totalPaid));
  const paidPct = Number(summary?.paidPct || (totalObligations > 0 ? Math.round((totalPaid / totalObligations) * 100) : 100));

  msg += `💳 <b>Obligaciones del Mes:</b>\n`;
  msg += `• Gastos Fijos (tu parte): ${formatMoney(fixed)}\n`;
  msg += `• Cuotas Tarjetas: ${formatMoney(installments)}\n`;
  msg += `• <b>Total a Cubrir:</b> ${formatMoney(totalObligations)}\n`;
  msg += `• ✅ <b>Ya Cancelado:</b> ${formatMoney(totalPaid)} (${paidPct}%)\n`;
  if (totalPending > 0) {
    msg += `• ⏳ <b>Pendiente Desembolsar:</b> ${formatMoney(totalPending)}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

  // 3. Balance Libre
  if (freeBalance >= 0) {
    msg += `🎉 <b>BALANCE LIBRE: +${formatMoney(freeBalance)}</b>\n`;
    msg += `<i>¡Meta mínima mensual superada!</i>\n\n`;
  } else {
    msg += `⚠️ <b>BALANCE RESTANTE: -${formatMoney(Math.abs(freeBalance))}</b>\n`;
    msg += `<i>Aún faltan cubrir obligaciones del mes.</i>\n\n`;
  }

  // 4. Alertas Vehiculares
  if (vehicleAlerts && vehicleAlerts.length > 0) {
    msg += `🔧 <b>Alertas de Mantenimiento & Trámites:</b>\n`;
    vehicleAlerts.forEach(alert => {
      const icon = alert.status === 'danger' ? '🔴' : alert.status === 'warning' ? '🟡' : '🟢';
      msg += `${icon} <b>${alert.name}:</b> ${alert.message}\n`;
    });
    msg += `\n`;
  }

  msg += `📲 <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://autogastos.app'}">Abrir Panel AutoGastos</a>`;

  return msg;
}

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN no está definido en .env.local');
  process.exit(1);
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
let offset = 0;

console.log('🤖 ========================================');
console.log('🚀 Iniciando Telegram Bot en Modo Local (Polling)');
console.log(`🤖 Bot: @${process.env.TELEGRAM_BOT_USERNAME || 'MiAutoGastos_bot'}`);
console.log(`🌐 Reenviando mensajes a: ${appUrl}/api/telegram/webhook`);
console.log('✨ Esperando mensajes en Telegram... (Escribe /resumen o /jornada en Telegram)');
console.log('🤖 ========================================\n');

async function pollUpdates() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25`);
    const data = await res.json();

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        
        const msg = update.message;
        if (msg && msg.text) {
          console.log(`📥 [Mensaje de @${msg.from?.username || msg.from?.first_name || 'Usuario'} (ID: ${msg.chat?.id})]: "${msg.text}"`);
          
          try {
            const webhookRes = await fetch(`${appUrl}/api/telegram/webhook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update),
            });
            const resJson = await webhookRes.json();
            console.log(`📤 [Respuesta enviada a Telegram]:`, resJson);
          } catch (err) {
            console.error(`⚠️ Error al reenviar a ${appUrl}/api/telegram/webhook:`, err.message);
            console.log('👉 Asegúrate de que el servidor Next.js esté corriendo con "npm run dev"');
          }
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('⚠️ Error en polling de Telegram:', err.message);
    }
  }

  // Continuar polling
  setTimeout(pollUpdates, 1000);
}

// Iniciar polling
pollUpdates();

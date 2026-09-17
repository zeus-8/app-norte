# 🤖 Guía Completa: Creación, Configuración y Vinculación del Bot de Telegram

**Proyecto:** AutoGastos SaaS  
**Fecha:** 2026-09-17  
**Ubicación:** `Docs/guia_configuracion_telegram_bot.md`

Esta guía detalla paso a paso cómo crear tu propio bot en Telegram gratis, obtener tus claves y vincularlo con tu cuenta de **AutoGastos** para recibir reportes y alertas en tu teléfono o PC.

---

## 🔑 1. ¿Qué es el `JWT_SECRET` y cómo configurarlo?

### ¿Quién lo crea?
**Lo creas tú mismo.** No necesitas registrarte en ninguna página para obtenerlo. Es una clave privada que utiliza tu servidor para firmar las cookies de sesión (evitando que nadie pueda falsificar identidades).

### ¿De cuántos caracteres debe ser?
Se recomienda que tenga **entre 32 y 64 caracteres**.

### ¿Cómo generarlo?
Puedes usar cualquier frase larga o generar un código aleatorio seguro:
* **Opción rápida:** Puedes inventar una frase segura, por ejemplo:
  `clave_secreta_autogastos_saas_2026_super_segura_88`
* **Opción profesional (desde tu terminal):**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
* **En tu archivo `.env.local`:**
  ```env
  JWT_SECRET=tu_clave_secreta_de_32_o_mas_caracteres_aqui
  ```

---

## 🤖 2. Paso a Paso: Cómo Crear tu Bot en Telegram

Para que la aplicación pueda enviar mensajes a tu Telegram, necesitas crear un bot gratuito con el bot oficial de Telegram (**@BotFather**).

### Paso 2.1: Abrir BotFather en Telegram
1. Abre la aplicación de Telegram en tu teléfono o en [Telegram Web](https://web.telegram.org/).
2. En el buscador de Telegram, busca: `@BotFather` *(verifica que tenga el tilde azul de cuenta verificada)*.
3. Haz clic en **Iniciar** (o envía `/start`).

### Paso 2.2: Crear el nuevo bot
1. Escribe y envía el comando:
   ```text
   /newbot
   ```
2. **Nombre público del bot:** BotFather te pedirá un nombre (el que se verá en pantalla).
   - Ejemplo: `AutoGastos Alertas` o `Mi Asistente Chofer`.
3. **Username único:** BotFather te pedirá un nombre de usuario que termine obligatoriamente en `bot`.
   - Ejemplo: `AutoGastos_juan_bot` o `MiGastosDriverBot`.
   - *(Si el nombre ya está ocupado por otra persona, prueba con otro hasta que te lo acepte)*.

### Paso 2.3: Copiar el Token de Acceso
BotFather te responderá con un mensaje felicitándote que contiene tu token:
```text
Use this token to access the HTTP API:
7123456789:AAFlkjw-abc123xyz456_ejemplo_token
```
Copia este token completo.

---

## ⚙️ 3. Configurar tu `.env.local`

Abre el archivo [`.env.local`](file:///c:/Users/user/Desktop/app-norte2.0/.env.local) y pega tu token y el username de tu bot (sin el `@`):

```env
DATABASE_URL=postgres://postgres:root@localhost:5432/norte2
JWT_SECRET=super_secreto_para_firmar_tokens_jwt_saas_2026_autogastos
NEXT_PUBLIC_APP_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=7123456789:AAFlkjw-abc123xyz456_ejemplo_token
TELEGRAM_BOT_USERNAME=AutoGastos_juan_bot
```

---

## 📲 4. Cómo Conectar tu Cuenta con el Bot para las Pruebas

Para que el bot sepa a qué chat de Telegram debe enviarte los mensajes, necesita tu **Chat ID**.

### Método Directo y Recomendado para Local:

1. **Obtener tu Chat ID personal:**
   - En Telegram, busca el bot oficial de IDs: `@userinfobot` o `@myidbot`.
   - Pulsa **Iniciar** y te responderá con un número como:
     `Id: 123456789`
   - *(Ese número es tu Chat ID personal).*

2. **Cargar tu Chat ID en AutoGastos:**
   - Inicia sesión en la app (`http://localhost:3000/login`) con:
     - **Email:** `juan@chofer.com`
     - **Contraseña:** `juan123`
   - Entra a **Configuración** (`http://localhost:3000/settings`).
   - En la sección **Bot de Telegram**:
     1. Pega tu número en el campo **"Tu Chat ID de Telegram"**.
     2. Marca la casilla **"Activado"**.
     3. Selecciona cuántos días antes quieres el reporte (ej. *5 días antes*).
     4. Haz clic en el botón superior **"Guardar Cambios"**.

3. **Iniciar una conversación con tu Bot:**
   - Busca a tu nuevo bot en Telegram (ej: `@AutoGastos_juan_bot`) y pulsa **Iniciar** (para autorizar a que te envíe mensajes).

4. **Probar el Envío en Tiempo Real:**
   - En la pantalla de Configuración de AutoGastos, haz clic en el botón:
     👉 **"Enviar Notificación de Prueba a Telegram"**.
   - ¡Al instante recibirás en tu Telegram el resumen financiero formateado con emojis, ganancias limpias, $/hora y semáforo de vencimientos vehiculares!

---

## 📝 5. Comandos Disponibles en tu Bot

Una vez vinculado, puedes escribirle comandos a tu bot en cualquier momento:

| Comando | Acción |
| :--- | :--- |
| `/resumen` o `/estado` | Te devuelve tu estado financiero del mes en curso y alertas de services. |
| `/chatid` | Te recuerda tu Chat ID. |
| `/ayuda` | Muestra la lista de comandos disponibles. |

---

## 💡 ¿Qué pasa si no configuro el Token de Telegram?

El sistema cuenta con un **Modo Simulación Inteligente**. Si dejas `TELEGRAM_BOT_TOKEN` vacío, la aplicación no fallará: mostrará el mensaje en la consola del servidor para que puedas ver el formato exacto del reporte sin necesidad de crear un bot.

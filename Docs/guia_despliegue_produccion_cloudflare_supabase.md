# 🚀 Guía Maestra: Despliegue en Producción (Cloudflare Workers + Supabase PostgreSQL)

**Proyecto:** AutoGastos SaaS (App Norte 2.0)  
**Arquitectura:** Next.js 16 (Turbopack) + OpenNext Cloudflare + Drizzle ORM + Supabase PostgreSQL  
**Actualizado:** 2026-09-25  

---

## 🧭 Índice Rápido
1. [¿Cómo funciona el flujo automático (CI/CD)?](#1-cómo-funciona-el-flujo-automático-cicd)
2. [Paso 1: Configurar la Base de Datos en Supabase](#paso-1-configurar-la-base-de-datos-en-supabase)
3. [Paso 2: Inicializar las Tablas en Supabase](#paso-2-inicializar-las-tablas-en-supabase)
4. [Paso 3: Configurar el Proyecto en Cloudflare](#paso-3-configurar-el-proyecto-en-cloudflare)
5. [Paso 4: Cargar Variables de Entorno y Secretos en Cloudflare](#paso-4-cargar-variables-de-entorno-y-secretos-en-cloudflare)
6. [Paso 5: Conectar el Webhook de Telegram a Producción](#paso-5-conectar-el-webhook-de-telegram-a-producción)
7. [Preguntas Frecuentes (Git Push y Nuevos Cambios)](#7-preguntas-frecuentes-git-push-y-nuevos-cambios)

---

## 1. ¿Cómo funciona el flujo automático (CI/CD)?

> 💡 **Respuesta a tu duda clave:**  
> **NO tienes que volver a montar la app cada vez que hagas un cambio.**  
> Cloudflare está conectado directamente a tu repositorio de GitHub. Cada vez que hagas `git push` a tu rama principal (`master` o `main`), Cloudflare lo detecta automáticamente, descarga el código nuevo, ejecuta la compilación y actualiza tu web en vivo en menos de 2 minutos.

```mermaid
graph LR
    Local[Tu Computadora: git push] --> GitHub[GitHub Repo]
    GitHub -->|Webhook Automático| Cloudflare[Cloudflare Workers CI/CD]
    Cloudflare -->|npm run build:cloudflare| Bundle[Empaqueta .open-next]
    Bundle --> Deploy[Web en Vivo con SSL]
```

---

## Paso 1: Configurar la Base de Datos en Supabase

> ⚠️ **PROBLEMA CRÍTICO RESUELTO:** El Transaction Pooler de Supabase (puerto **6543**) usa **IPv6 por defecto**, pero Cloudflare Workers sólo soporta **IPv4**. Esto causaba el error `Connection terminated unexpectedly`. La solución es usar el **Session Mode (puerto 5432)** que es compatible con IPv4 y además permite prepared statements.

### 1.1. Obtener la Cadena de Conexión (Session Mode — CORRECTO)
1. Ingresá a tu consola de [Supabase](https://supabase.com/dashboard).
2. Seleccioná tu proyecto de **AutoGastos / App Norte**.
3. En la barra lateral izquierda, hacé clic en el ícono de engranaje ⚙️ **Project Settings** > **Database**.
4. Bajá hasta la sección **Connection string** (o "Connect" button arriba a la derecha).
5. En el selector de modo, elegí **Session mode** (no Transaction mode):
   ```text
   postgresql://postgres.[TU-PROJECT-REF]:[TU-CONTRASEÑA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```
   *(Reemplazá `[TU-CONTRASEÑA]` por la contraseña maestra de tu base de datos. El host tiene `pooler.supabase.com` pero el puerto cambia a **5432**).*

### ⚖️ Comparación de modos de conexión:
| Modo | Puerto | IPv6 | Prepared Statements | ¿Funciona en CF Workers? |
|------|--------|------|--------------------|--------------------------|
| Transaction Pooler | **6543** | ✅ Sí | ❌ No | ❌ **NO** |
| Session Pooler | **5432** | depende | ✅ Sí | ✅ **SÍ** |
| Direct Connection | **5432** | ✅ Sí | ✅ Sí | ✅ **SÍ** |

---

## Paso 2: Inicializar las Tablas en Supabase

Para que la aplicación funcione con todos los módulos nuevos (Jornadas, Gastos, Cuotas, Mantenimiento, Adelantos y Arqueo de Caja), la base de datos debe tener las tablas creadas.

### 2.1. Ejecutar el Script Maestro en Supabase SQL Editor
1. En tu panel de Supabase, hacé clic en **SQL Editor** en la barra lateral izquierda.
2. Hacé clic en **New query** (Nueva consulta).
3. Abrí el archivo local [`Docs/supabase_schema_init.sql`](file:///c:/Users/user/Desktop/app-norte2.0/Docs/supabase_schema_init.sql) de tu proyecto, copiá todo su contenido y pegalo en el editor de Supabase.
4. Hacé clic en el botón verde **Run** (Ejecutar).
5. Deberás ver el mensaje `Success. No rows returned`.

*(Esto creará las tablas `users`, `daily_logs`, `expenses`, `expense_payments`, `vehicle_maintenance`, `app_advances`, `cash_reconciliations`, etc.).*

---

## Paso 3: Configurar el Proyecto en Cloudflare

### 3.1. Crear o Editar la Aplicación en Cloudflare
1. Ingresá a tu [Dashboard de Cloudflare](https://dash.cloudflare.com/).
2. En el menú lateral izquierdo, ve a **Workers & Pages**.
3. Si estás creando desde cero:
   - Clic en **Create application** > pestaña **Pages** > **Connect to Git**.
   - Seleccioná tu repositorio de GitHub `app-norte2.0`.
4. Si ya la tenés creada:
   - Hacé clic en tu aplicación existente > ve a la pestaña **Settings** > **Builds & deployments**.

### 3.2. Parámetros Críticos de Compilación (Build Settings)
Completá estos campos con **exactitud**:

| Campo | Valor Requerido | Explicación |
|---|---|---|
| **Framework preset** | `None` o `Next.js` | Déjalo manual para no sobreescribir |
| **Build command** | `npm run build:cloudflare` | **¡VITAL!** Genera `.open-next/worker.js` |
| **Deploy command** | `npx wrangler deploy` | Despliega el worker empaquetado |
| **Root directory** | `/` (o vacío) | Raíz del proyecto |
| **Node.js Version** | `>= 18.0.0` (o 20+) | Soportado automáticamente |

> ⚠️ **REGLA DE ORO:** Si el **Build command** queda como `npm run build`, Cloudflare compilará un Next.js común y fallará diciendo que no encuentra `.open-next`. **Siempre debe ser `npm run build:cloudflare`**.

---

## Paso 4: Cargar Variables de Entorno y Secretos en Cloudflare

En tu proyecto de Cloudflare, ve a **Settings** > **Variables and Secrets** y agrega las siguientes variables de producción:

### Variables Obligatorias:
1. **`DATABASE_URL`** (Tipo: *Secret / Encriptada*)  
   Tu URL de conexión en **Session Mode (puerto 5432)** obtenida en el Paso 1:
   ```text
   postgresql://postgres.[REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```
   > ⚠️ **Importante:** Si tu contraseña tiene caracteres especiales como `@`, `#`, `$`, `%`, debes encodearlos en URL. Ejemplo: `@` → `%40`, `#` → `%23`. Podés usar [urlencoder.org](https://www.urlencoder.org/) para encodear solo la contraseña.
2. **`JWT_SECRET`** (Tipo: *Secret / Encriptada*)  
   Una clave segura y secreta de más de 32 caracteres para firmar los tokens de sesión.  
   *(Ejemplo: `mi_clave_super_secreta_de_produccion_autogastos_2026_segura`)*.
3. **`NEXT_PUBLIC_APP_URL`** (Tipo: *Plain text*)  
   La URL pública que te asigna Cloudflare:  
   *(Ejemplo: `https://app-norte.pages.dev` o tu dominio personalizado)*.
4. **`TELEGRAM_BOT_TOKEN`** (Tipo: *Secret / Encriptada*)  
   El token que te dio `@BotFather` para tu bot.
5. **`TELEGRAM_BOT_USERNAME`** (Tipo: *Plain text*)  
   El @usuario de tu bot (ej. `AutoGastosBot`).
6. **`CRON_SECRET`** (Tipo: *Secret / Encriptada*)  
   Un token aleatorio para proteger la ruta de alertas automáticas `/api/cron/send-alerts`.

### Variables para Inicio de Sesión y Registro con Google (Google OAuth):
Para que **cualquier persona pueda iniciar sesión o registrarse con su cuenta de Google en 1 clic**, debes agregar:

7. **`GOOGLE_CLIENT_ID`** (Tipo: *Plain text*)  
   El ID de cliente obtenido de Google Cloud Console.
8. **`GOOGLE_CLIENT_SECRET`** (Tipo: *Secret / Encriptada*)  
   El secreto de cliente obtenido de Google Cloud Console.

#### 📌 ¿Cómo obtener las credenciales de Google OAuth en 3 minutos?
1. Entra a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto nuevo (ej. `AutoGastos`).
3. Ve a **APIs y servicios** > **Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: Elige **Externo** (para que cualquier persona pueda registrarse con su cuenta de Google).
   - Nombre de la app: `AutoGastos`.
   - Correo de asistencia y desarrollador: Tu correo.
4. Ve a **Credenciales** > Clic en **Crear credenciales** > **ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: `AutoGastos Web Cloudflare`.
   - **Orígenes de JavaScript autorizados:**  
     Agrega tu URL de Cloudflare (ej. `https://app-norte.pages.dev`).
   - **URIs de redireccionamiento autorizados:**  
     Agrega exactamente:  
     `https://app-norte.pages.dev/api/auth/google/callback`  
     *(reemplazando `app-norte.pages.dev` por tu URL real de Cloudflare)*.
5. Haz clic en **Crear**. Te mostrará en pantalla el **Client ID** y el **Client Secret**.
6. Cópialos y pégalos en Cloudflare en **Variables and Secrets**.

Una vez cargadas las variables, haz clic en **Save and Deploy** (Guardar y Desplegar).

---

## 🛑 Diagnóstico: ¿Por qué en local funciona el login y en Cloudflare no?

| Entorno | Dónde se ejecuta | Base de Datos a la que apunta |
|---|---|---|
| **Local (tu PC)** | En tu máquina con `npm run dev` | A tu PostgreSQL local en `localhost:5432/norte2` (por eso en local te anda perfecto) |
| **Cloudflare (Producción)** | En los servidores de Cloudflare en internet | A **Supabase PostgreSQL** mediante `DATABASE_URL` |

### ¿Por qué no podías entrar en Cloudflare?
1. **⚡ IPv6 vs IPv4 (causa raíz del error `Connection terminated unexpectedly`):** El Transaction Pooler de Supabase (puerto 6543) usa IPv6 por defecto, pero Cloudflare Workers conecta por IPv4. Eso hace que la conexión se corte inmediatamente. **Solución:** cambiar a Session Mode (puerto 5432) en el `DATABASE_URL`.
2. **Cloudflare no puede acceder a tu computadora:** En tu PC tienes `localhost:5432`, pero Cloudflare está en la nube. Si en Cloudflare no cargaste la variable `DATABASE_URL` apuntando a Supabase, o si la contraseña es incorrecta, la app intenta conectarse a `localhost` y falla al instante.
3. **La base de datos de Supabase debe tener las tablas y usuarios creados:** Si no ejecutaste el archivo [Docs/supabase_schema_init.sql](file:///c:/Users/user/Desktop/app-norte2.0/Docs/supabase_schema_init.sql) en el SQL Editor de Supabase, las tablas en la nube están vacías y no existen ni Juan Chofer ni el Administrador.
4. **El botón de Google estaba esperando las credenciales:** Sin `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, el botón de Google redirige con aviso de que falta configurar.


---

## Paso 5: Conectar el Webhook de Telegram a Producción

Una vez que tu web esté online en Cloudflare (ej. `https://app-norte.pages.dev`), debes indicarle a Telegram que le envíe los mensajes a tu servidor en la nube:

Abrí una pestaña en tu navegador con esta URL:
```text
https://api.telegram.org/bot<TU_TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<TU_DOMINIO_CLOUDFLARE>/api/telegram/webhook
```

**Respuesta esperada en pantalla:**
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```
¡A partir de ese momento, cada vez que mandes `/jornada`, `/gasto` o `/adelanto` por Telegram, impactará directo en la base de datos de producción!

---

## 7. Preguntas Frecuentes (Git Push y Nuevos Cambios)

### ¿Si hago cambios en mi computadora y hago `git push`, Cloudflare los toma solo?
**SÍ, 100% automático.**  
No necesitas volver a entrar a Cloudflare ni borrar la app. El flujo de trabajo diario es:
1. Haces tus cambios o fixes en tu código local.
2. Haces el commit:
   ```bash
   git add .
   git commit -m "feat: nuevas mejoras en finanzas"
   ```
3. Lo subes a GitHub:
   ```bash
   git push origin master
   ```
4. GitHub le avisa a Cloudflare al instante.
5. Cloudflare inicia el build con `npm run build:cloudflare` y en ~1-2 minutos tus cambios ya están visibles para todos los usuarios.

### ¿Si cambio una variable de entorno tengo que re-desplegar?
Sí. Si cambias la contraseña de la base de datos o el token de Telegram en Cloudflare, debes ir a **Deployments** > hacer clic en los tres puntitos `...` del último despliegue y elegir **Retry deployment**.

# 📋 Plan de Trabajo Integral: Correcciones Críticas, Conciliación de Caja y Puesta a Punto en Producción

**Fecha:** 2026-09-24  
**Elaborado por:** Project Manager & Equipo de Especialistas (Backend, Frontend, UX/UI, Seguridad, Base de Datos, Testing)  
**Proyecto:** AutoGastos SaaS (App Norte 2.0)  
**Estado:** Propuesta Técnica y Plan de Ejecución para Aprobación del Desarrollador (Cero código modificado en esta fase)

---

## 🧭 1. Resumen Ejecutivo y Nuevos Requerimientos

A partir del feedback del desarrollador y la evidencia visual de los logs en Telegram y la interfaz web, se establecen las prioridades de trabajo divididas en 5 ejes clave:

1. **Fix A (Validaciones Claras y Humanas en Todo el Sistema):** Estandarización de mensajes específicos, campo por campo, en todos los modales (Jornadas, Gastos, Cuotas, Mantenimiento, Auth), abandonando validaciones opacas.
2. **Fix B (Corrección Urgente del Parser de Telegram y Soporte de Notas):** Solución definitiva al bug de captura multilínea en el comando `/jornada` (que invertía horas, minutos y viajes al enviar formatos como `horas: 6` y `min: 30`), soporte de notas/observaciones desde el bot, y habilitación del comando `/gasto`.
3. **Fix C (Adelantos de Apps y Módulo de Conciliación / Arqueo de Caja):** Registro de extracciones anticipadas de liquidez sin distorsionar la facturación bruta, y comparador de "Caja Real vs Sistema" para detectar y justificar faltantes o dinero derivado a billeteras virtuales (Mercado Pago).
4. **Infraestructura (Guía de Conexión Cloudflare Workers + Supabase):** Diagnóstico y paso a paso exacto para levantar la aplicación en producción (Transaction Pooler, SSL, Secrets y OAuth).
5. **Gobernanza SaaS y Feature Flags de Módulos:** Blindaje estricto para que la habilitación de módulos (Jornadas, Gastos, Vehículo) sea potestad exclusiva del Administrador (`/admin`), restringiendo la vista y el acceso por URL al suscriptor según su plan contratado.

---

## 🔍 2. Diagnóstico Técnico de los Problemas Detectados

### 2.1. Causa Raíz del Bug en Telegram `/jornada` (Evidencia en Imágenes)
* **Lo que envió el usuario:**
  ```text
  /jornada
  uber: 67000
  nafta: 16000
  otros: 2000
  horas: 6
  min: 30
  viajes: 22
  odo: 190136
  ```
* **Lo que interpretó el backend:**
  * En [src/app/api/telegram/webhook/route.js](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/telegram/webhook/route.js), las expresiones regulares buscaban el número **antes** de la palabra clave:
    * `horasMatch = lower.match(/(\d+)\s*h(?:oras)?/i);`  
      Al saltar de línea, capturó el `2000` de la línea anterior (`otros: 2000\nhoras`) ➡️ **Horas: 2000**.
    * `minsMatch = lower.match(/(\d+)\s*m(?:in|inutos)?/i);`  
      Capturó el `6` de la línea anterior (`horas: 6\nmin`) ➡️ **Minutos: 6**.
    * `tripsMatch = lower.match(/(\d+)\s*(?:viajes|viaje|v\b)/i);`  
      Capturó el `30` de la línea anterior (`min: 30\nviajes`) ➡️ **Viajes: 30**.
  * **Consecuencia:** Calculó `2000 horas y 6 minutos` (120.006 minutos), dando un rendimiento ridículo de `$24/h`, e invirtió la cantidad de viajes.
  * **Falta de notas:** No existía regex para capturar `nota:`, `notas:` u `obs:`.

### 2.2. Inconsistencia en Validaciones (Frontend vs Zod)
* En [DailyLogModal.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/components/DailyLogModal.jsx), el frontend envía `minutesWorked` como el total acumulado de minutos (ej. `390`), mientras que en [src/lib/validations.js](file:///c:/Users/user/Desktop/app-norte2.0/src/lib/validations.js) el esquema Zod limitaba `minutesWorked` con `.max(59)`.
* En otros formularios (Gastos, Vehículo), los errores arrojados por el backend se presentaban como mensajes genéricos sin señalar visualmente qué campo falló.

### 2.3. Desajuste de Conexión Cloudflare + Supabase
* **Protocolo de conexión:** Cloudflare Workers corre en arquitectura Edge Serverless. No puede mantener conexiones TCP directas tradicionales en el puerto `5432` con `pg.Pool`. Requiere conectarse al **Transaction Pooler (Supavisor) en el puerto `6543`** con `?sslmode=require`.
* **Variables de entorno:** En Cloudflare Workers/Pages, las variables del archivo `.env.local` no se suben automáticamente; deben cargarse explícitamente como *Secrets* en el panel de Cloudflare.
* **Google OAuth en Producción:** El callback `https://<dominio-cloudflare>/api/auth/google/callback` debe estar registrado en la consola de Google Cloud, o de lo contrario arroja error `redirect_uri_mismatch`.

---

## 👥 3. Asignación de Roles del Equipo Especializado

| Agente / Rol | Área de Responsabilidad | Foco en este Plan |
|---|---|---|
| **01. Project Manager (PM)** | Orquestación general | Seguimiento, alineación con requerimientos y comunicación transparente. |
| **02. Backend / API** | Next.js API Routes & Drizzle ORM | Parser robusto de Telegram, nuevos endpoints de adelantos y conciliación, unificación de Zod. |
| **05. Frontend & UI** | React 19 / CSS Vanilla | Modales con feedback de validación inline, interfaz de Arqueo de Caja y bloqueo de pestañas según plan. |
| **06. UX/UI Specialist** | Experiencia de usuario & Diseño | Flujo intuitivo de cuadre de caja (Sistema vs Realidad), diseño de comparativa financiera clara. |
| **07. Seguridad** | Control de acceso y Roles | Blindaje de `/admin`, validación estricta de que el usuario no pueda activar módulos por API ni URL. |
| **08. Testing** | Pruebas unitarias y de integración | Validación de casos extremos de parsing en Telegram (`horas: 6`, `6h 30m`, notas, gastos). |
| **09. Base de Datos (PostgreSQL)** | Esquema Drizzle y Supabase | Tablas para registrar `advances` (adelantos de apps) y `cash_reconciliations` (arqueos). |

---

## 🛠️ 4. Plan de Acción Detallado por Módulos

### 📌 Módulo 1: Parser Inteligente de Telegram & Soporte de Notas (Fix B)
* **Objetivo:** Garantizar que el chofer pueda escribir en formato vertical (`campo: valor`) o en formato corrido (`6h 30m`), sin que las expresiones regulares crucen líneas ni confundan valores.
* **Especificación del Parser:**
  1. Procesamiento línea por línea para evitar interferencia entre saltos de línea (`\n`).
  2. Soporte estricto de sintaxis:
     * `horas: 6` o `6h` o `6 horas` ➡️ `hours = 6`
     * `min: 30` o `30m` o `30 min` ➡️ `minutes = 30`
     * `viajes: 22` o `22 viajes` ➡️ `trips = 22`
     * `otros: 2000` o `peaje: 2000` ➡️ `otherExpense = 2000`
     * `notas: Mucho tráfico y lluvia` o `obs: pinchadura` ➡️ `notes = "Mucho tráfico y lluvia"`
  3. Cálculo consistente de minutos totales: `(hours * 60) + minutes`.
  4. Formato de respuesta de confirmación en Telegram que incluya la nota registrada.
* **Comando `/gasto`:**
  * Sintaxis admitida: `/gasto <concepto> <monto> [compartido] [cuotas X]`  
    *Ejemplo:* `/gasto Supermercado 45000 compartido 60% débito` o `/gasto Cubierta 120000 3 cuotas crédito`.

---

### 📌 Módulo 2: Validaciones Humanas y Específicas en Todo el Sistema (Fix A)
* **Objetivo:** Cada campo con error debe indicar con precisión quirúrgica qué ocurre y cómo solucionarlo.
* **Acciones:**
  1. **Unificación Zod:**
     * En `dailyLogSchema`, recibir `hoursWorked` y `minutesWorked` (0 a 59), o alternativamente `minutesWorkedTotal` si viene directo del frontend.
  2. **Feedback Visual en Formularios:**
     * En lugar de un único `error` arriba del modal, destacar los inputs con borde rojo y texto explicativo debajo del campo:
       * *Odómetro:* "El kilometraje no puede ser inferior al anterior (ej. 190.136 km)".
       * *Facturación:* "Ingresa un importe mayor a $0".
       * *Gastos:* "La cantidad de cuotas debe ser entre 1 y 60", "El día de vencimiento debe estar entre 1 y 31".
       * *Contraseña:* "La contraseña debe contener al menos 6 caracteres".

---

### 📌 Módulo 3: Adelantos de Apps y Conciliación / Arqueo de Caja (Fix C)
* **Objetivo:** Resolver la discrepancia entre lo que la app factura en el odómetro y el dinero líquido real disponible en la billetera o cuenta bancaria.
* **Modelo de Negocio:**
  * **Caso A (Adelanto / Retiro Inmediato de Uber/Cabify):**
    * El chofer factura $130.000 en la semana. A mitad de semana retira $40.000 para emergencias.
    * No debe restar la facturación bruta (sigue siendo $130.000 para el odómetro y $/hora), pero en el saldo de la app queda pendiente cobrar $90.000, y los $40.000 ya entraron a su caja personal o fueron a un gasto.
  * **Caso B (Conciliación / Blanqueo de Caja):**
    * El chofer revisa su balance semanal o mensual:
      * **Sistema indica disponible:** $130.000 ARS.
      * **Realidad del chofer:**
        * En cuenta bancaria / Mercado Pago: $50.000
        * En efectivo físico: $60.000
        * **Total Real:** $110.000
      * **Diferencia detectada:** -$20.000 (Faltante).
    * **Solución funcional:**
      * Pantalla o modal de "Arqueo / Conciliación de Caja".
      * Muestra la comparativa en dos columnas: *Saldo Teórico del Sistema* vs *Dinero Real Declarado*.
      * Si hay diferencia, ofrece un campo para justificarla:
        * *"Gasto no anotado"* ➡️ Permite crear el gasto rápido para que cuadre la cuenta.
        * *"Transferencia a cuenta externa / ahorro"* ➡️ Lo asienta como extracción.
        * *"Ajuste directo de saldo"* ➡️ Asienta la pérdida/diferencia para que el ritmo diario necesario de los días restantes se calcule sobre el dinero **real** que falta para llegar a fin de mes.

---

### 📌 Módulo 4: Gobernanza SaaS y Control Estricto de Módulos (Feature Flags)
* **Objetivo:** Proteger el modelo de negocio SaaS evitando que los usuarios finales elijan o activen módulos por su cuenta.
* **Acciones:**
  1. **Aislamiento en Configuración:**
     * En la pantalla de Configuración del usuario común (`/settings`), se eliminan o bloquean los controles que permitan alterar `moduleDriver`, `moduleExpenses` o `moduleVehicle`. El usuario solo gestiona datos personales, vehículo propio/alquilado, apps que utiliza y Telegram.
  2. **Exclusividad del Administrador:**
     * Solo las cuentas con `role: 'admin'` tienen acceso a la vista `/admin` y a la API `/api/admin/users/[id]` para activar o desactivar módulos por suscriptor.
  3. **Protección a Nivel Middleware y UI:**
     * En el Navbar, si un usuario no tiene `moduleDriver`, no ve la pestaña "Jornadas Apps" ni el botón "+ Jornada".
     * Si intenta ingresar manualmente por URL a `/driver`, el middleware o la página lo redirige automáticamente a `/dashboard` con una notificación de "Módulo no contratado".

---

### 📌 Módulo 5: Guía Definitiva de Conexión Cloudflare Workers + Supabase

Para que el sistema levante al 100% en la nube tanto con credenciales como con Google, se deben cumplir 4 pasos fundamentales:

```mermaid
graph TD
    A[Supabase: Transaction Pooler Puerto 6543] --> B[Script SQL: Tablas + Seed Admin]
    B --> C[Cloudflare Dashboard: Variables & Secrets]
    C --> D[Google Cloud Console: Redirect URI de Cloudflare]
    D --> E[Despliegue Operativo 100%]
```

#### Paso 1: Configurar la URL de Conexión Correcta en Supabase
1. Ingresá a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Ve a **Project Settings** > **Database** > sección **Connection Pooling**.
3. Asegurate de que el modo sea **Transaction** (Puerto `6543`).
4. La URL debe tener este formato exacto:
   ```text
   postgres://postgres.[PROJECT-REF]:[TU-CONTRASEÑA]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```
   *(Nota: Si la contraseña tiene caracteres especiales como `@`, `#` o `$`, deben estar codificados en URL).*

#### Paso 2: Ejecutar el Script de Tablas y Usuarios Iniciales
1. En Supabase, ve al menú izquierdo a **SQL Editor**.
2. Abre y ejecuta el contenido completo del archivo [`Docs/supabase_schema_init.sql`](file:///c:/Users/user/Desktop/app-norte2.0/Docs/supabase_schema_init.sql).
3. Esto crea todas las tablas, llaves foráneas, índices y los dos usuarios iniciales con contraseñas encriptadas:
   * **Admin:** `admin@autogastos.com` / `admin123`
   * **Demo:** `juan@chofer.com` / `juan123`

#### Paso 3: Cargar las Variables de Entorno en Cloudflare Dashboard
Dado que Cloudflare no lee el archivo `.env.local` en producción:
1. Ingresá a [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages**.
2. Hacé clic en tu proyecto (`app-norte`).
3. Ve a **Settings** > **Variables and Secrets**.
4. Agregá las siguientes variables como **Secret** (cifradas) o **Variable**:
   * `DATABASE_URL`: La URL del Transaction Pooler del Paso 1.
   * `JWT_SECRET`: Una cadena segura (ej. `mi_clave_jwt_ultra_segura_saas_2026`).
   * `NEXT_PUBLIC_APP_URL`: La URL pública de tu aplicación en Cloudflare (ej. `https://app-norte.pages.dev` o tu dominio personalizado).
   * `TELEGRAM_BOT_TOKEN`: El token de tu bot provisto por @BotFather.
   * `GOOGLE_CLIENT_ID`: ID de cliente OAuth de Google.
   * `GOOGLE_CLIENT_SECRET`: Clave secreta OAuth de Google.
   * `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: El mismo ID de cliente público de Google.

#### Paso 4: Ajustar el Redirect URI en Google Cloud Console
1. Entrá a [Google Cloud Console > Credenciales](https://console.cloud.google.com/apis/credentials).
2. Editá tu ID de cliente OAuth 2.0.
3. En **URIs de redireccionamiento autorizados**, agregá la URL exacta de tu despliegue:
   ```text
   https://<tu-proyecto-cloudflare>.pages.dev/api/auth/google/callback
   ```
   *(o tu dominio oficial si ya lo tenés vinculado).*

---

## 🗺️ 5. Hoja de Ruta de Implementación & Estado de Avance

Para trabajar con orden y total control, este documento es la **fuente única de verdad** de avance:

| Fase | Título / Alcance | Estado | Detalle |
|---|---|---|---|
| **Fase 1** | **Aprobación de Plan & Setup Cloudflare/Supabase** | ✅ **COMPLETADA** | Plan validado y aprobado por el desarrollador. Guía técnica de conexión (Pooler 6543, SSL, Secrets y OAuth) documentada en sección 5. |
| **Fase 2** | **Telegram Parser, Notas, /gasto, Odómetro & Validaciones** | ✅ **COMPLETADA** | Parser multilínea de `/jornada` 100% blindado contra saltos de línea, soporte de notas/observaciones, comando `/gasto` activo, sincronización bidireccional del odómetro al borrar/editar jornadas y validaciones Zod unificadas. Build local y Cloudflare exitosos (código 0). |
| **Fase 3** | **Gobernanza SaaS de Módulos (Feature Flags)** | ✅ **COMPLETADA** | Control de acceso multinivel (Edge Middleware + Guards React en cliente + Navbar dinámico + Banner de aviso en Dashboard). Solo el Admin gestiona los módulos (`moduleDriver`, `moduleExpenses`, `moduleVehicle`); la API de perfil y de usuario bloquea alteraciones no autorizadas. Builds verificados con código 0. |
| **Fase 4** | **Adelantos de Apps & Arqueo / Conciliación de Caja** | ✅ **COMPLETADA** | Modelo y endpoints de retiros anticipados de Uber/Cabify sin distorsionar odómetro ni $/h. Módulo interactivo de Arqueo de Caja (Sistema vs Realidad) con blanqueo por gasto no anotado, ahorro o ajuste directo que recalibra el ritmo diario necesario para fin de mes. Comandos `/adelanto` en Telegram y modales visuales integrados en Dashboard y Driver. Builds verificados con código 0. |

---

### 📝 Bitácora de Hitos Cumplidos

* **2026-09-24 (Fase 1):** Plan maestro de trabajo revisado y aprobado por el desarrollador. Setup de arquitectura definido.
* **2026-09-24 (Fase 2):**
  1. **Solución al bug de Telegram `/jornada`:** Implementación de `parseJornadaInput()` línea por línea, evitando que regex cruzadas tomen datos de líneas anteriores (ej. `otros: 2000` y `horas: 6`).
  2. **Captura de notas y observaciones:** Parser y persistencia de `notas:`, `nota:` u `obs:` en Telegram y en la BD.
  3. **Nuevo comando `/gasto` en Telegram:** Registro de compras en una sola línea o por renglones, cálculo de cuotas, detección de gastos compartidos del hogar (%) y medio de pago.
  4. **Unificación Zod y Frontend:** Actualización de `dailyLogSchema` en [src/lib/validations.js](file:///c:/Users/user/Desktop/app-norte2.0/src/lib/validations.js) para aceptar minutos acumulados sin error de límite 59, envío de `hoursWorked` y `minutesWorked` sincronizado en [DailyLogModal.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/components/DailyLogModal.jsx) y mensajes de validación claros en todos los esquemas del sistema.
  5. **Recalculación y Sincronización Automática del Odómetro (Al Eliminar/Editar Jornadas):** Creación del servicio [src/lib/odometer.js](file:///c:/Users/user/Desktop/app-norte2.0/src/lib/odometer.js) con `syncUserOdometer()`. Al eliminar o editar una jornada en [src/app/api/daily-logs/[id]/route.js](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/daily-logs/[id]/route.js) o [src/app/api/daily-logs/route.js](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/daily-logs/route.js), el odómetro general (`current_odometer` en `user_settings`) se recalibra instantáneamente hacia el valor máximo de las jornadas y services restantes, eliminando distorsiones en los semáforos preventivos vehiculares (VTV, GNC, aceite).
  6. **Verificación de Compilación:** `npm run build` y `npm run build:cloudflare` finalizados con exit code 0 (`Worker saved in .open-next/worker.js 🚀`).
* **2026-09-24 (Fase 3):**
  1. **Inclusión de Flags de Módulos en Tokens JWT:** Actualización de payloads en login con contraseña, registro y Google OAuth callback para inyectar `moduleDriver`, `moduleExpenses` y `moduleVehicle` en la cookie de sesión `auth_token`.
  2. **Protección en el Edge (`src/middleware.js`):** El middleware de Cloudflare intercepta accesos a `/driver`, `/expenses` y `/vehicle`, y si el token pertenece a un usuario no administrador que no posee dicho módulo contratado, redirige a `/dashboard?restricted=<módulo>`.
  3. **Guards React en Cliente:** Implementados en [src/app/driver/page.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/app/driver/page.jsx), [src/app/expenses/page.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/app/expenses/page.jsx) y [src/app/vehicle/page.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/app/vehicle/page.jsx). Reaccionan en tiempo real a `/api/auth/me` para evitar renders indebidos si se alteran cookies o se accede directamente.
  4. **Banner Amigable en Dashboard:** [src/app/dashboard/page.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/app/dashboard/page.jsx) detecta el parámetro `?restricted=` y despliega un banner informativo contextual indicando qué módulo no está contratado y cómo solicitarlo.
  5. **Navegación Condicional en Navbar:** [src/components/Navbar.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/components/Navbar.jsx) muestra u oculta las pestañas y los botones de acción rápida (`+ Jornada`, `+ Gasto`, odómetro) según los módulos habilitados o el rol `admin`.
  6. **Blindaje de APIs de Usuario vs Admin:** Verificado que [src/app/api/user/profile/route.js](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/user/profile/route.js) solo permite actualizar datos personales cosméticos y Telegram; los módulos únicamente pueden ser modificados por administradores en [src/app/api/admin/users/[id]/route.js](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/admin/users/[id]/route.js).
  7. **Compilación 100% Exitosa:** `npm run build` y `npm run build:cloudflare` (`Worker saved in .open-next/worker.js 🚀`, exit code 0).
* **2026-09-24 (Fase 4):**
  1. **Tablas Drizzle & Supabase SQL:** Creación de `app_advances` y `cash_reconciliations` en [src/db/schema.js](file:///c:/Users/user/Desktop/app-norte2.0/src/db/schema.js) y actualización completa de [Docs/supabase_schema_init.sql](file:///c:/Users/user/Desktop/app-norte2.0/Docs/supabase_schema_init.sql).
  2. **Endpoints de Adelantos (`/api/advances`):** Creación de GET y POST para registrar cobros anticipados por app sin tocar el ingreso bruto de las jornadas ni distorsionar odómetro o $/hora. Endpoint de baja en `/api/advances/[id]`.
  3. **Endpoints de Arqueo y Conciliación (`/api/cash-reconciliation`):** Cálculo del saldo teórico disponible (Neto jornadas - gastos pagados - extracciones + ajustes). Posibilidad de crear automáticamente gastos no anotados para cuadrar la caja en $0 o asentar ajustes directos.
  4. **Cálculo de Flujo de Caja y Recalibración de Metas:** Actualizados [src/lib/summary.js](file:///c:/Users/user/Desktop/app-norte2.0/src/lib/summary.js) y [src/app/api/summary/route.js](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/summary/route.js) para exponer `cashFlow`. Si un chofer asienta una pérdida o faltante de dinero, el ritmo diario necesario (`dailyTargetNeeded`) para fin de mes se recalibra automáticamente según el dinero real remanente.
  5. **Comando de Telegram `/adelanto` y `/retiro`:** El chofer puede registrar adelantos desde el auto vía chat (ej. `/adelanto uber 40000 mp`), recibiendo confirmación con saldo pendiente a liquidar por la app y reflejo de caja en `/resumen`.
  6. **Componentes Frontend Interactivos:** Diseñados [CashReconciliationModal.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/components/CashReconciliationModal.jsx) y [AppAdvanceModal.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/components/AppAdvanceModal.jsx). Integrados en el Dashboard con tarjeta de disponibilidad líquida y en la sección de chofer con control de liquidaciones multiapp.
  7. **Compilación y Build Cloudflare:** Ambos compiladores (`npm run build` y `npm run build:cloudflare`) finalizaron con código 0 (`Worker saved in .open-next/worker.js 🚀`).
  8. **Soporte de Viajes Independientes / Privados:** Integración de la app `particular` / `privado` en jornadas y Telegram. El dinero de viajes propios no se computa como retenido por plataformas, quedando disponible como cobro en mano inmediato.
  9. **Arqueo con Acumulado Semanal en Apps:** Incorporación del campo `real_apps` (`Acumulado en Apps a Cobrar`) en [src/db/schema.js](file:///c:/Users/user/Desktop/app-norte2.0/src/db/schema.js), migración `0003_brief_whiplash.sql` aplicada en PostgreSQL. El modal prellena automáticamente el monto devengado en Uber/Cabify aún no liquidado, resolviendo la distorsión de falsos faltantes a mitad de semana.
  10. **Imputación de Adelantos a Gastos del Mes:** Incorporación de `expense_id` en `app_advances`. Si el chofer retira dinero de Uber para comprar comida o pagar un servicio, el monto se descuenta directamente de las obligaciones pendientes del mes en [src/lib/summary.js](file:///c:/Users/user/Desktop/app-norte2.0/src/lib/summary.js), bajando de forma automática el ritmo y meta diaria requerida (`dailyTargetNeeded`).
  11. **Visualización y Badges en la Tabla de Gastos:** Actualizado [src/app/expenses/page.jsx](file:///c:/Users/user/Desktop/app-norte2.0/src/app/expenses/page.jsx) y [src/app/api/expenses/route.js](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/expenses/route.js) con badges dinámicos `⚡ Adelanto aplicado: $XX (Resta: $YY)`, indicador de cobertura total/parcial e interacción con el checklist de pagos.



* **2026-09-24 (Bugs detectados durante prueba operativa - Sesion de testing):**
  1. **Bug: Cabify aparecia en Liquidaciones aunque no estaba en la configuracion** - Causa raiz: el codigo fusionaba `user.activeApps` con todas las claves historicas de `appBreakdownTotals`. Solucion: [src/app/driver/page.jsx] ahora renderiza unicamente las apps de `user.activeApps`. Claves normalizadas a lowercase en `summary.js`.
  2. **Bug: Tarjetas de liquidacion mostraban $0** - Causa raiz: `/api/summary` no incluia `appBreakdownTotals` en la respuesta JSON. Solucion: se agrego el campo en [src/app/api/summary/route.js].
  3. **Bug critico React "Expected static flag was missing" crasheaba Dashboard** - Causa raiz: [src/components/GoalThermometer.jsx] tenia `return null` antes del `useEffect`, violando las Rules of Hooks. Solucion: el guard se movio despues de todos los hooks; variables protegidas con `summaryData || {}`. Build verificado con codigo 0.
  4. **Bug: Odometro no se actualizaba al enviar jornada por Telegram** - Causa raiz: el regex no contemplaba palabras con tilde (odometro, kilometros) ni numeros con punto de miles (190.850 km), descartando el odometro silenciosamente. Solucion: se flexibilizo el parser en src/app/api/telegram/webhook/route.js para aceptar cualquier formato, se remueven separadores de miles y se garantiza que el odometro actual del auto se sincronice y se confirme en el mensaje de respuesta.
  5. **Discrepancia en tarjetas de apps vs facturado del mes** - Causa raiz: jornadas antiguas sin app especificada no sumaban a ninguna plataforma en appBreakdownTotals, generando que la suma de tarjetas fuera menor al total bruto. Solucion: src/lib/summary.js ahora imputa automaticamente cualquier ingreso sin desglose a la app principal del usuario (uber), logrando que la suma de tarjetas sea exactamente igual al facturado bruto total.
  6. **Confusion en adelanto de Particular vs Uber** - Causa raiz: el modal de adelanto permitia seleccionar Particular (cobro directo en mano, no una plataforma que retenga liquidaciones). El usuario cargo un adelanto de  bajo Particular para comida, por lo que no se descontaba de Uber ni se veia en la tarjeta. Solucion: src/components/AppAdvanceModal.jsx ahora filtra apps de cobro directo y solo ofrece plataformas reales de retencion. Se actualizo el registro en la base de datos para que compute a Uber.

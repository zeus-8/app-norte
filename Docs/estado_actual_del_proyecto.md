# 📌 Estado Actual del Proyecto y Bitácora de Continuidad

**Última actualización:** 2026-09-17  
**Proyecto:** AutoGastos SaaS (Next.js 14 + PostgreSQL + Drizzle ORM + Cloudflare)  
**Ubicación:** `c:\Users\user\Desktop\app-norte2.0`  
**Estado General:** Fase 1 y Fase 2 Completadas con Éxito (`npm run build` ✅ 0 Errores)  
**Documento Maestro:** [`Docs/plan_maestro_migracion_saas_gastos.md`](file:///c:/Users/user/Desktop/app-norte2.0/Docs/plan_maestro_migracion_saas_gastos.md)

---

## ✅ Fases Completadas

### 🟢 FASE 1: Setup del Proyecto y Base de Datos Multi-Tenant (COMPLETADA)
1. **Framework:** Next.js 14 (App Router) inicializado y validado con `npm run build` (0 errores).
2. **Base de Datos & ORM:** Drizzle ORM configurado con PostgreSQL (`src/db/index.js` y `src/db/schema.js`).
3. **Esquema Multi-Tenant:**
   - `users`: Soporte SaaS, roles (`admin`/`user`), modalidad (`owner` auto propio vs `renter` auto alquilado), apps activas (`['uber', 'cabify', 'didi', 'rappi']`), feature flags de módulos, preferencia de tema Dark/Light y Telegram Chat ID.
   - `daily_logs`: Registro multiapp con desglose JSON, campo de **minutos exactos (`minutes_worked`)** para medir ej. `5h 47m`, combustible y odómetro.
   - `vehicle_maintenance` & `maintenance_history`: Mantenimiento vehicular dual (por km, por tiempo anual/bimestral [VTV, GNC, Patente] e híbrido).
   - `expenses`: Gastos fijos, compras en cuotas sin interés y división compartida del hogar.
   - `user_settings`: Ajustes clave-valor por usuario.
4. **Migraciones:** Generada `drizzle/0000_yielding_scarlet_witch.sql`.
5. **Seed:** Script `src/db/seed.js` con Admin (`admin@autogastos.com` / `admin123`) y Chofer Demo (`juan@chofer.com` / `juan123`).
6. **Entorno:** `.env.example` y `.env.local` configurados.

---

### 🟢 FASE 2: Autenticación, Tema y Módulos de Usuario (COMPLETADA)
1. **Autenticación Multi-Tenant (JWT + Bcrypt):**
   - Módulo de sesiones seguras en [`src/lib/auth.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/lib/auth.js) con cookies httpOnly (`autogastos_session`).
   - Validaciones de entrada con Zod en [`src/lib/validations.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/lib/validations.js) (mensajes explícitos en español).
   - Endpoints API de Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`.
   - Middleware de protección de rutas en [`src/middleware.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/middleware.js) protegiendo `/dashboard`, `/driver`, `/expenses`, `/vehicle` y `/admin`.
   - Vistas de Login ([`src/app/login/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/login/page.jsx)) y Registro ([`src/app/register/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/register/page.jsx)) con selector de Auto Propio vs Alquilado y multiapps.
2. **Tema Claro / Oscuro con Persistencia:**
   - Componente [`src/components/ThemeToggle.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/components/ThemeToggle.jsx) y endpoint `/api/user/preferences`.
3. **Módulo de Jornadas Multiapp:**
   - Vista en [`src/app/driver/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/driver/page.jsx) y modal [`src/components/DailyLogModal.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/components/DailyLogModal.jsx) con **Horas y Minutos exactos (`minutes_worked`)**, rendimiento por hora (`$/h`) y desglose multiapp.
4. **Módulo de Gastos & Proyección de Cuotas:**
   - Vista en [`src/app/expenses/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/expenses/page.jsx) y modal [`src/components/ExpenseModal.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/components/ExpenseModal.jsx) con proyección a 12 meses vista y división de gastos compartidos del hogar.
5. **Módulo de Mantenimiento Vehicular:**
   - Vista en [`src/app/vehicle/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/vehicle/page.jsx) con soporte adaptativo para **Auto Propio** (semáforo, VTV, GNC, Patente, fondo de repuestos) vs **Auto Alquilado** (canon de alquiler).
6. **Dashboard Principal:**
   - Vista en [`src/app/dashboard/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/dashboard/page.jsx) con KPIs consolidados y Termómetro de Metas ([`src/components/GoalThermometer.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/components/GoalThermometer.jsx)).

---

### 🟢 FASE 3: Panel de Administración, Configuración & Bot de Telegram (COMPLETADA)
1. **Panel de Administración & Feature Flags ([`src/app/admin/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/admin/page.jsx)):**
   - Gestión integral de suscriptores y estados de cuenta (Prueba / Activo / Suspendido).
   - Toggles en tiempo real de Feature Flags por usuario (`moduleDriver`, `moduleExpenses`, `moduleVehicle`).
   - Métricas globales del SaaS en `/api/admin/stats` y CRUD en `/api/admin/users`.
2. **Página de Configuración y Perfil ([`src/app/settings/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/settings/page.jsx)):**
   - Configuración de modalidad operativa: **Auto Propio** vs **Auto Alquilado**.
   - Selector interactivo de aplicaciones activas (`uber`, `cabify`, `didi`, `indrive`, `rappi`, `pedidosya`).
   - Panel de vinculación de Telegram con botón de enlace 1-click (`t.me/Bot?start=ID`), selector de anticipación de alertas (1 a 10 días) y botón de prueba en vivo.
   - Cambio seguro de contraseña con validación de hash bcrypt.
   - Endpoint de perfil en `/api/user/profile`.
3. **Servicio y Formateador de Telegram ([`src/lib/telegram.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/lib/telegram.js)):**
   - Formato enriquecido en HTML con reporte de jornadas multiapp, horas trabajadas (`5h 47m`), combustible, ganancia neta limpia, rendimiento $/h, gastos fijos, cuotas, balance libre y semáforo de vencimientos vehiculares (VTV, GNC, Aceite).
   - Modo de simulación inteligente si `TELEGRAM_BOT_TOKEN` no está cargado.
4. **Webhook y Comandos de Telegram ([`src/app/api/telegram/webhook/route.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/telegram/webhook/route.js)):**
   - Soporte para comando `/start <token>` para auto-vincular la cuenta del chofer con su Chat ID.
   - Soporte para comando `/resumen` para consultar el balance en tiempo real y `/chatid` para obtener el ID.
5. **Motor de Alertas Programadas Cron ([`src/app/api/cron/send-alerts/route.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/cron/send-alerts/route.js)):**
   - Procesamiento automatizado diario protegido por `CRON_SECRET`.
   - Disparo individualizado según los días de anticipación elegidos por cada chofer.
6. **Migración e Importación de Datos Legacy ([`src/db/migrate-from-sqlite.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/db/migrate-from-sqlite.js)):**
   - Script automatizado `npm run db:import-sqlite` para importar toda la base de datos `gastos.db` (SQLite) a PostgreSQL `norte2`.
   - Conversión de horas decimales a minutos exactos (`minutes_worked`).
   - Mapeo de ingresos al nuevo esquema multiapp.
   - Migración completa de: 6 jornadas de trabajo, 13 mantenimientos vehiculares, 2 registros de historial de services, 16 gastos fijos/cuotas y configuraciones.
7. **Verificación de Build:**
   - `npm run build` ✅ Compilación exitosa (17 rutas, 14 API endpoints, middleware y 0 errores).

---

## ⏳ Fases Siguientes

### ⚪ FASE 4: Despliegue en Cloudflare Pages & Neon PostgreSQL
* Configuración de `@cloudflare/next-on-pages` / Cloudflare OpenNext.
* Variables de entorno en Cloudflare Dashboard (`DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, `JWT_SECRET`).
* Configuración del Webhook de Telegram (`setWebhook`) y disparador de Cron diario (`wrangler.toml` o Cloudflare Cron Triggers).


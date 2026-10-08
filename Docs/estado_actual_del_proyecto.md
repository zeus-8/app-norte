# 📌 Estado Actual del Proyecto, Arquitectura y Bitácora de Modificaciones

**Última actualización:** 2026-09-27  
**Proyecto:** AutoGastos SaaS (App Norte 2.0)  
**Entorno de Producción:** Cloudflare Workers (OpenNext) + Supabase PostgreSQL  
**Repositorios / Workspaces:** `c:\Users\user\Desktop\app-norte2.0` / `c:\Users\user\Desktop\app-gastos`  
**Estado General:** Fases 1, 2, 3 y 4 (Setup Cloudflare/Supabase, Telegram/Validaciones/Odómetro, Gobernanza SaaS de Módulos, Adelantos & Conciliación de Caja) ✅ 100% COMPLETADAS. Compilaciones Next.js y Cloudflare ✅ Exitosas (código 0). Listo para vinculación en producción y nuevo ciclo de mejoras de feedback de usuario.

---

## 🎯 1. Resumen Ejecutivo del Negocio

**AutoGastos SaaS** es una plataforma web integral, multi-tenant y serverless orientada a choferes de movilidad y logística urbana (Uber, Cabify, DiDi, InDrive, Rappi, PedidosYa, viajes particulares) y gestión compartida de finanzas del hogar en Argentina.

### Capacidades Clave
1. **Control de Jornadas Multiapp:** Registro diario con desglose por aplicación, cálculo de minutos exactos trabajados (`minutes_worked`, ej. `5h 47m`), combustible, peajes/otros, odómetro sincronizado y rendimiento neto en tiempo real en pesos por hora (`$/h`).
2. **Finanzas Personales & Hogar Compartido:** Gestión de gastos fijos y compras en cuotas con proyección a 12 meses vista, checklist interactivo mensual de pagos cancelados vs pendientes y división porcentual en parejas/familias (ej. 60% Juan / 40% Yeli) sin duplicar datos.
3. **Mantenimiento Vehicular Preventivo:** Semáforos preventivos adaptados para **Auto Propio** (control dual por kilometraje y tiempo para VTV, GNC, Patente y services mecánicos con fondo de reserva) o **Auto Alquilado** (canon periódico de alquiler).
4. **Adelantos & Conciliación de Caja:** Registro de retiros inmediatos de plataformas (Uber/Cabify) sin distorsionar facturación bruta ni $/h, imputación de adelantos directo a gastos mensuales, y módulo de Arqueo de Caja (Sistema vs Realidad) con blanqueo automático o recalibración del ritmo diario necesario.
5. **Termómetro Financiero:** Enfoque visual de metas mensuales en el Dashboard: punto de equilibrio básico vs meta esperada de rentabilidad ajustada al flujo de caja real.
6. **Automatización & Bot de Telegram:** Notificaciones diarias/mensuales, comandos interactivos (`/resumen`, `/jornada`, `/pagos`, `/adelanto`, `/gasto`, `/chatid`), parser multilínea blindado y alertas mecánicas según días de anticipación elegidos.
7. **Gobernanza SaaS y Feature Flags:** Control multinivel (Edge Middleware, Guards React en cliente, Navbar dinámico y APIs protegidas) para que el Administrador active o restrinja módulos (`moduleDriver`, `moduleExpenses`, `moduleVehicle`) por suscriptor según el plan contratado.

---

## 💻 2. Stack Tecnológico & Infraestructura

| Capa | Tecnología | Versión / Detalle | Justificación |
|---|---|---|---|
| **Framework Fullstack** | Next.js (App Router, Turbopack) | `16.3.5` | SSR eficiente, server actions y soporte de rutas API dinámicas. |
| **Biblioteca UI** | React | `19.3.0` | Hooks modernos, concurrencia y alto rendimiento en interfaz. |
| **Estilos & Apariencia** | CSS Vanilla (Design System) + Lucide Icons | N/A | Total control de rendimiento, microinteracciones y modo Dark/Light nativo con persistencia. |
| **ORM & Modelado** | Drizzle ORM + Drizzle Kit | `0.38.3` / `0.30.1` | Tipado TypeScript/JS estricto, queries SQL livianas y migraciones determinísticas. |
| **Base de Datos** | PostgreSQL (Supabase) | 16+ / 17 | Base de datos relacional robusta con connection pooling (Transaction Pooler en puerto 6543 / Session en 5432). |
| **Edge & Despliegue** | Cloudflare Workers (`@opennextjs/cloudflare`) | `1.20.6` | Despliegue global serverless en edge, baja latencia y bajo costo de mantenimiento. |
| **CLI de Despliegue** | Wrangler | `4.135.0` (`nodejs_compat`, `compatibility_date: 2025-01-01`) | Herramienta oficial de Cloudflare para workers y bindings. |
| **Autenticación** | JWT (`jose`) + `bcryptjs` + Google OAuth 2.0 | `jose@5.9.6`, `bcryptjs@2.4.3` | Sesiones en cookies `httpOnly`, criptografía Web Crypto nativa compatible con Cloudflare Workers. |
| **Validación de Datos** | Zod | `3.24.1` | Validación estricta en esquemas de entrada de API con mensajes explícitos en español. |

---

## 🗄️ 3. Modelo de Datos (PostgreSQL / Drizzle Schema)

Esquema ubicado en [`src/db/schema.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/db/schema.js):

1. **`users`:** Suscriptor SaaS, email, hash bcrypt, rol (`admin` | `user`), Google OAuth ID/avatar, modalidad (`owner` | `renter`), apps activas en JSON, feature flags (`moduleDriver`, `moduleExpenses`, `moduleVehicle`), tema (`dark` | `light`), Telegram chat ID, anticipación de alertas y estado de suscripción (`trial`, `active`, `suspended`).
2. **`households` & `household_members`:** Grupos familiares/parejas con porcentajes de división asignados (ej. 60.00 / 40.00) y estados de invitación (`pending`, `accepted`).
3. **`daily_logs`:** Registro diario por chofer (`userId` + `date` único), ingreso bruto, desglose JSON por app, combustible, otros gastos, odómetro, minutos totales trabajados (`minutes_worked`), cantidad de viajes y notas/observaciones.
4. **`vehicle_maintenance` & `maintenance_history`:** Tareas preventivas con seguimiento por km, por tiempo o híbrido, vencimientos fijos de patente/GNC, último service y registro histórico de gastos en talleres.
5. **`expenses`:** Gastos fijos, compras en cuotas o únicos, mes inicio/fin, día de vencimiento, método de pago, vinculación a hogar compartido y porcentaje de imputación.
6. **`expense_payments`:** Checklist interactivo mensual (`expenseId` + `userId` + `month` único) para registrar qué cuotas ya fueron desembolsadas en el mes corriente.
7. **`app_advances`:** Retiros y adelantos de plataformas (Uber, Cabify, etc.), fecha, monto, canal de cobro (`mp`, `bank`, `cash`), imputación opcional a un gasto (`expense_id`) y notas.
8. **`cash_reconciliations`:** Historial de arqueos de caja (`real_bank`, `real_cash`, `real_apps`, `difference`, `resolution_type`, `daily_target_needed`).
9. **`user_settings`:** Almacenamiento clave-valor de configuración personalizada por usuario (ej. `current_odometer`).

---

## 🛠️ 4. Bitácora Técnica de Modificaciones & Fixes Realizados

### 🔴 Fix Crítico #1: Error de Empaquetado Cloudflare (`pg-cloudflare`)
- **Problema:** En el build de Cloudflare (`opennextjs-cloudflare build`), fallaba esbuild al no encontrar `./dist/index.js` de `pg-cloudflare`.
- **Solución:** Inclusión de `outputFileTracingIncludes` en `next.config.mjs`, adición de `pg-cloudflare` en `package.json` y actualización de `compatibility_date` en `wrangler.jsonc`. Build exitoso con código 0.

### 🟢 Fix / Mejora #2: Precisión de Jornadas en Minutos Exactos
- **Problema:** Las horas decimales causaban desajustes en rendimiento $/h.
- **Solución:** Estandarización de `minutes_worked` en base de datos e interfaz de usuario en horas y minutos separados.

### 🟢 Fix / Mejora #3: Seguridad en Google OAuth & Cuentas Administrativas
- **Problema:** Riesgo de sobreescritura si se iniciaba sesión con Google en cuentas de administración.
- **Solución:** Bloqueo de login social para `admin@autogastos.com` en `/api/auth/google/callback/route.js`. Creación segura de usuarios estándar con catálogo preventivo inicial.

### 🟢 Fix / Mejora #4: Aumentos de Gastos con Preservación Histórica
- **Problema:** Modificar el precio de un gasto recurrente alteraba meses cerrados pasados.
- **Solución:** Endpoint `/api/expenses/[id]/increase` y modal `IncreaseModal.jsx` que cierran el período anterior en `endMonth` y dan de alta el nuevo monto desde `effectiveMonth`.

### 🟢 Fix / Mejora #5: Checklist de Pagos Mensuales (Flujo de Caja)
- **Problema:** No se distinguía entre gastos presupuestados y gastos ya pagados en el mes.
- **Solución:** Tabla `expense_payments`, endpoints `/api/expenses/payments` y vista en `/expenses` con desglose de *Total*, *Ya Pagado* y *Pendiente*.

### 🟢 Fix / Mejora #6: Parser Inteligente de Telegram Multilínea, Notas y Comando `/gasto`
- **Problema:** El parser anterior confundía valores entre líneas consecutivas (ej. `otros: 2000` y `horas: 6` resultaba en 2000 horas). Faltaban notas y soporte de gastos por chat.
- **Solución:** Procesamiento línea por línea en `parseJornadaInput()`, soporte de `notas:` / `obs:`, y creación del comando `/gasto <concepto> <monto> [compartido] [cuotas X]` con detección de pago.

### 🟢 Fix / Mejora #7: Recalculación y Sincronización Automática del Odómetro
- **Problema:** Al borrar o editar jornadas previas hacia abajo, el odómetro del vehículo quedaba trabado en un valor superior erróneo.
- **Solución:** Servicio `syncUserOdometer()` en `src/lib/odometer.js`. Al eliminar o editar una jornada, el odómetro general retrocede automáticamente al valor máximo real de las jornadas y services vigentes.

### 🟢 Fix / Mejora #8: Gobernanza SaaS y Feature Flags de Módulos
- **Problema:** El usuario final no debe poder auto-asignarse módulos pagos (`moduleDriver`, `moduleExpenses`, `moduleVehicle`).
- **Solución:** Edge Middleware en `src/middleware.js`, React Guards en `/driver`, `/expenses` y `/vehicle`, navegación condicional en `Navbar.jsx`, y blindaje de `/api/user/profile` para que solo el Admin en `/api/admin/users/[id]` pueda alterar los flags.

### 🟢 Fix / Mejora #9: Módulo de Adelantos de Apps (`/api/advances`)
- **Problema:** El chofer que retira fondos de Uber antes del cierre semanal perdía noción de liquidez y desbalanceaba su balance.
- **Solución:** Modelo y endpoints de retiros anticipados que descuentan el saldo por cobrar de la app sin reducir la facturación bruta devengada ni el cálculo de $/h. Comando `/adelanto` en Telegram.

### 🟢 Fix / Mejora #10: Arqueo y Conciliación de Caja (`/api/cash-reconciliation`)
- **Problema:** Discrepancia recurrente entre el saldo teórico del sistema y el dinero real en efectivo/Mercado Pago.
- **Solución:** Pantalla interactiva `CashReconciliationModal.jsx`. Compara Sistema vs Realidad. Ofrece blanqueo inmediato mediante creación de gastos no anotados o ajuste directo de saldo que recalibra el ritmo diario necesario para fin de mes.

### 🟢 Fix / Mejora #11: Soporte de Viajes Particulares / Privados
- **Problema:** Choferes que hacen viajes independientes veían su dinero computado como retenido por plataformas.
- **Solución:** Soporte de la modalidad `particular`/`privado`. Su dinero se asume disponible de inmediato en mano y no acumula retención en apps.

### 🟢 Fix / Mejora #12: Acumulado Semanal en Apps a Cobrar (`real_apps`)
- **Problema:** A mitad de semana el arqueo generaba falsos faltantes porque el dinero de las plataformas aún no se había transferido a la cuenta bancaria.
- **Solución:** Campo `real_apps` en `cash_reconciliations` y autocompletado en el modal con el acumulado de viajes no cobrados, permitiendo un cuadre contable exacto.

### 🟢 Fix / Mejora #13: Imputación de Adelantos a Gastos y Badges en `/expenses`
- **Problema:** Si el chofer usaba un adelanto de Uber para pagar un gasto, no se reflejaba la imputación.
- **Solución:** Campo `expense_id` en `app_advances` y deducción automática en `summary.js` del ritmo diario restante. Visualización en la tabla de gastos con badges informativos `⚡ Adelanto aplicado: $XX (Resta: $YY)`.

### 🟢 Fix / Mejora #14: Sesión de Pruebas Operativas & Corrección de Bugs
- **Hook Order en React:** Corregido error crítico en `GoalThermometer.jsx` donde un `return null` anticipado rompía las Rules of Hooks.
- **Filtro de Apps en Tarjetas de Liquidación:** Corregido para que solo se muestren las apps activas configuradas por el usuario (`user.activeApps`).
- **Inclusión de `appBreakdownTotals`:** Integrado en la respuesta de `/api/summary` para que las tarjetas de liquidación nunca muestren $0.
- **Parser de Telegram Robusto:** Flexibilizado para soportar palabras con tilde (`odómetro`, `kilómetros`) y números con separadores de miles (`190.850 km`).

---

## 🗺️ 5. Hoja de Ruta Inmediata (Próximos Pasos)

1. **Puesta a Punto en Producción:**
   - Carga de secretos en Cloudflare Dashboard (`DATABASE_URL` Transaction Pooler en puerto 6543 con SSL, `JWT_SECRET`, tokens de Telegram y Google OAuth).
   - Ejecución de `Docs/supabase_schema_init.sql` en Supabase.
   - Verificación de callback URL en Google Cloud Console.

2. **Nuevo Ciclo de Mejoras (Feedback de Pruebas con Usuarios):**
   - Incorporación de las observaciones detalladas en `Docs/mejoras_pendientes.md` (refuerzo de gastos compartidos y cuentas conjuntas, notificaciones visibles, rediseño estético de Dashboard/Gastos, fondos de ahorro manuales, gráfica de mínimos/ideales, Google OAuth switch y período de prueba demo).

# 📋 Mejoras Pendientes — App Norte 2.0 (AutoGastos SaaS)

**Última actualización:** 2026-10-08 (rev. 6)  
**Proyecto:** AutoGastos SaaS (App Norte 2.0)  
**Repositorio:** `c:\Users\user\Desktop\app-norte2.0`  
**Responsable:** PM + Equipo de Agentes (Backend, Frontend, UX/UI, Arquitectura, Seguridad, DB, Testing)

> Este documento es el **registro oficial de mejoras, features, fixes y observaciones de testing** reportadas por el desarrollador que aún se encuentran pendientes de ejecución.  
> Cada ítem cuenta con prioridad asignada, agentes involucrados, descripción de la causa o necesidad y alcance técnico esperado.  
> **Al implementar un ítem, moverlo a la sección ✅ Completadas al final del documento.**

---

## 🟥 ALTA PRIORIDAD (Bugs Funcionales y Core UX)

---

### MJ-01 — Mejora del Modo Claro (Light Theme)
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** UX/UI · Frontend Blade  
**Comando sugerido:** `@dev mejora del modo claro MJ-01`

**Descripción:**  
El tema claro actual tiene problemas de legibilidad. Al cambiar de modo oscuro a modo claro, varios elementos de texto, fondos y bordes se vuelven ilegibles o de muy bajo contraste. Necesita una revisión profunda del sistema de variables CSS del tema claro.

**Alcance esperado:**
- Revisar y corregir todas las variables CSS del tema `[data-theme="light"]` en `globals.css` o el archivo de estilos global.
- Garantizar contraste mínimo WCAG AA en todos los textos sobre fondos claros.
- Corregir tarjetas KPI, tablas, badges, modales y navbar en modo claro.
- Revisar colores de texto en botones, labels de formularios e inputs.
- Asegurar que los badges de colores (emerald, cyan, rose, blue) sean legibles sobre fondo claro.
- Probar visualmente en todas las páginas principales: Dashboard, Jornadas, Gastos, Vehículo, Admin.

**Archivos probablemente involucrados:**
- `src/app/globals.css`
- Componentes con estilos inline que usen colores hardcodeados (ej. `color: 'white'`)

---

### MJ-02 — Reforma Completa y Reorganización del Dashboard (Estética y Presentación de Datos)
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** UX/UI · Frontend Blade · Arquitectura & Patrones · Seguridad · Backend Laravel  
**Comando sugerido:** `@dev reforma completa dashboard MJ-02`

**Descripción:**  
El dashboard actual requiere una reforma integral para reorganizar la información y presentarla con mayor impacto visual, orden y sofisticación estética.  
**Directiva clave:** El equipo multidisciplinario (Especialista UX/UI, Frontend Blade, Arquitecto de Software y Especialista en Ciberseguridad) abordará esta reforma enfocándose estrictamente en la **estética, jerarquía visual y presentación de datos**, garantizando **no alterar ni romper la lógica de negocio ni endpoints existentes**.

**Alcance esperado:**
- Reestructurar el layout del Dashboard para una lectura ejecutiva y limpia de métricas.
- Reorganizar bloques: Disponibilidad de caja / Arqueo, Termómetro de metas, resumen de gastos pendientes vs pagados del mes, odómetro y semáforos preventivos más urgentes.
- Rediseño de componentes visuales con microinteracciones sutiles y acabados modernos.
- Integración visual armoniosa con el modo Dark y Light.
- Blindaje de seguridad y permisos: garantizar que no se expongan datos de otros tenants ni se rompan los guards de roles y módulos.

**Archivos probablemente involucrados:**
- `src/app/dashboard/page.jsx`
- `src/components/GoalThermometer.jsx`
- `src/components/CashReconciliationModal.jsx`
- `src/app/api/summary/route.js`
- `src/app/globals.css`

---

### MJ-09 — Bug Crítico: Gasto Compartido no se Refleja en la Sesión del Invitado tras Aceptar
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Backend Laravel · Base de Datos & PostgreSQL 17 · Frontend Blade · UX/UI  
**Comando sugerido:** `@fix gasto compartido no aparece en sesion invitado MJ-09`

**Descripción:**  
Durante las pruebas de gastos mancomunados entre usuarios registrados, se detectó el siguiente flujo roto:  
1. Usuario A crea un gasto conjunto / compartido con el Usuario B (quien ya está registrado en la plataforma).
2. En la cuenta de Usuario B aparece la invitación correspondiente.
3. Al hacer clic en **aceptar la invitación**, el gasto **NO** se carga en la sesión ni en la pantalla de gastos del Usuario B con el porcentaje que le corresponde.
4. En consecuencia, el usuario invitado no ve su obligación de pago, no puede gestionarla ni se computa en su balance mensual.

**Alcance esperado:**
- Revisar y corregir el handler de aceptación de invitaciones en `/api/households` o `/api/expenses`.
- Asegurar que al cambiar el estado del miembro o la invitación a `accepted`, los gastos del hogar compartido se asocien bidireccionalmente o sean consultados dinámicamente en los endpoints `/api/expenses` del usuario invitado.
- Comprobar que en la vista del Usuario B el gasto muestre exactamente el monto proporcional según su porcentaje pactado (ej. 40% de $50.000 = $20.000) y su respectivo registro en `expense_payments`.
- Verificar que ambos usuarios puedan marcar como pagado su porcentaje de manera independiente sin afectar el checklist del otro.

**Archivos probablemente involucrados:**
- `src/app/api/households/route.js`
- `src/app/api/expenses/route.js`
- `src/lib/summary.js`
- `src/app/expenses/page.jsx`
- `src/db/schema.js` (`household_members`, `households`, `expenses`, `expense_payments`)

---

### MJ-14 — Indicadores y Gráfica Diaria de Rendimiento: Mínimo / Real / Ideal
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** UX/UI · Frontend Blade · Backend Laravel  
**Comando sugerido:** `@dev indicadores y grafica rendimiento diario MJ-14`

**Descripción:**  
En la operativa diaria, el chofer necesita saber si la recaudación de cada jornada cumplió con el umbral de supervivencia (mínimo) o alcanzó el objetivo de rentabilidad (ideal). Se incorporarán estos dos valores de referencia junto con una **gráfica de seguimiento diario** para visualizar con claridad el progreso de cada día.

**Lógica de los tres niveles:**

| Indicador | Descripción | Configuración |
|-----------|-------------|---------------|
| 🔴 **Mínimo** | Monto por día por debajo del cual no se cubren los costos fijos ni el tiempo | Configurable por el usuario en `/settings` |
| 🟡 **Real** | Lo efectivamente ganado en el día (`net_profit` de la jornada) | Registrado en `daily_logs` |
| 🟢 **Ideal / Meta** | Meta óptima diaria para alcanzar los objetivos de ahorro y prosperidad | Configurable o derivado de la meta mensual |

**Alcance esperado:**
- Campos de configuración en `/settings`: `daily_minimum` y `daily_target`.
- Comparativa visual en la tabla de jornadas (`driver/page.jsx`) con badges o semáforos (Rojo: bajo mínimo, Amarillo: entre mínimo e ideal, Verde: meta cumplida).
- **Gráfica Diaria de Mínimo vs Ideal:** Incorporación de un gráfico de barras/líneas donde se aprecie día por día si la jornada superó la línea del mínimo y si tocó o superó la línea ideal. *(Nota: El desarrollador compartirá el boceto visual de referencia).*

**Archivos probablemente involucrados:**
- `src/app/settings/page.jsx`
- `src/app/driver/page.jsx`
- `src/app/dashboard/page.jsx`
- `src/db/schema.js` o `user_settings`
- Librería de gráficos o componentes SVG Vanilla ya integrados

---

### MJ-15 — Modificación de Cuentas Conjuntas, Porcentajes y Desligue de Gastos
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Backend Laravel · Base de Datos & PostgreSQL 17 · Frontend Blade · UX/UI  
**Comando sugerido:** `@dev modificar cuenta conjunta y desligar gasto MJ-15`

**Descripción:**  
Actualmente, una vez creado un hogar o cuenta conjunta, el usuario no tiene la flexibilidad necesaria para ajustar los términos pactados ni para desvincular un gasto si las circunstancias cambian (ej. un gasto que deja de ser compartido o cambio en los ingresos de los miembros).

**Alcance esperado:**
- **Edición de Cuenta Conjunta:** Modal para actualizar el nombre de la cuenta y redefinir los porcentajes de cada miembro (ej. cambiar de 50/50 a 60/40), validando que sumen 100%.
- **Desligar Gastos:** Permitir que el creador del gasto pueda desvincularlo de la cuenta compartida para convertirlo nuevamente en un gasto 100% personal, o desasignarlo sin perder el historial.
- Recalcular automáticamente las obligaciones pendientes y las participaciones mensuales en `/api/summary` y `/expenses`.

**Archivos probablemente involucrados:**
- `src/app/api/households/route.js`
- `src/app/api/households/[id]/route.js`
- `src/app/api/expenses/[id]/route.js`
- `src/app/expenses/page.jsx`
- `src/app/settings/page.jsx`

---

### MJ-16 — Ocultamiento Condicional en Configuración cuando el Módulo Apps está Inactivo
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Frontend Blade · UX/UI  
**Comando sugerido:** `@fix ocultar tarjetas apps inactivas settings MJ-16`

**Descripción:**  
Si a un usuario el Administrador le desactiva el módulo de chofer/jornadas (`moduleDriver: false`), en su pantalla de Configuración (`/settings`) siguen apareciendo las tarjetas de **"Modalidad de Vehículo"** (Propio/Alquilado) y **"Plataformas & Apps de Trabajo"** (Uber, Cabify, etc.). Esto carece de lógica ya que el usuario no tiene contratado ni utiliza dicho módulo.

**Alcance esperado:**
- En `src/app/settings/page.jsx`, evaluar `user.moduleDriver` (o feature flags equivalentes).
- Si `moduleDriver` es falso (o no contratado):
  - Ocultar completamente la tarjeta de "Modalidad de Vehículo".
  - Ocultar completamente la tarjeta de "Plataformas & Apps de Trabajo".
- Si el módulo está activo, renderizarlas con normalidad.

**Archivos probablemente involucrados:**
- `src/app/settings/page.jsx`
- `src/app/api/auth/me/route.js`

---

### MJ-17 — Sistema de Notificaciones Globales y Alertas Proactivas
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Frontend Blade · UX/UI · Backend Laravel · Events & Notifications  
**Comando sugerido:** `@dev sistema notificaciones globales MJ-17`

**Descripción:**  
Actualmente, las invitaciones a gastos compartidos o eventos importantes solo se visualizan si el usuario ingresa fortuitamente a la sección de Configuración. Si un usuario invita a otro a un gasto mancomunado, el destinatario no tiene forma evidente de enterarse desde la pantalla principal ni desde el Navbar.

**Alcance esperado:**
- Incorporar un **icono de Notificaciones (Campanita con badge numérico)** en la barra de navegación superior (`Navbar.jsx`).
- Al hacer clic, desplegar un menú desplegable (dropdown) o panel flotante con las notificaciones activas:
  - Invitaciones a gastos compartidos / hogares pendientes de respuesta.
  - Alertas de vencimientos inminentes o avisos del sistema.
- Permitir aceptar o rechazar invitaciones directamente desde la alerta sin necesidad de viajar a Configuración.
- Feedback visual instantáneo (toast / notificación emergente) al iniciar sesión si existen acciones requeridas pendientes.

**Archivos probablemente involucrados:**
- `src/components/Navbar.jsx`
- `src/components/NotificationCenter.jsx` (nuevo componente)
- `src/app/api/notifications/route.js` (nuevo endpoint)
- `src/db/schema.js` (tabla opcional de notificaciones o consulta unificada)

---

### MJ-18 — Reforma Completa y Reorganización Visual de la Pantalla de Gastos
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** UX/UI · Frontend Blade · Arquitectura & Patrones · Seguridad · Backend Laravel  
**Comando sugerido:** `@dev reforma estetica pantalla gastos MJ-18`

**Descripción:**  
Al igual que el Dashboard, la pantalla de **Gastos** (`/expenses`) requiere una modernización estética profunda para organizar mejor las obligaciones fijas, las cuotas, los aumentos, los adelantos aplicados y el checklist de pagos.  
**Premisa de trabajo:** Ejecutada en conjunto por UX/UI, Frontend, Arquitectura y Ciberseguridad, **enfocada 100% en la presentación visual, legibilidad de cifras y ergonomía de usuario sin romper los modelos ni la lógica de cálculo existente**.

**Alcance esperado:**
- Rediseño de las tarjetas KPI de gastos: *Total Obligaciones*, *✅ Ya Cancelado*, *⏳ Pendiente por Desembolsar*, *⚡ Adelantos Imputados*.
- Reorganización de tablas/listados: separación intuitiva entre gastos fijos mensuales, compras en cuotas con barras de progreso de cuotas restantes (ej. 3/12), y gastos compartidos del hogar.
- Mejora en los modales de carga de gastos, aumento de precios y vinculación de pagos.
- Asegurar contrastes impecables tanto en Dark Mode como en Light Mode.

**Archivos probablemente involucrados:**
- `src/app/expenses/page.jsx`
- `src/components/ExpenseModal.jsx`
- `src/components/IncreaseModal.jsx`
- `src/app/globals.css`

---

### MJ-19 — Módulo de Creación de Fondos de Ahorro / Reserva con Aporte Manual
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Backend Laravel · Base de Datos & PostgreSQL 17 · UX/UI · Frontend Blade  
**Comando sugerido:** `@dev modulo creacion fondos ahorro manual MJ-19`

**Descripción:**  
En la sección de Gastos se necesita un módulo para crear **Fondos de Reserva / Ahorro** (ej. fondo mecánico, fondo para vacaciones, fondo impositivo, fondo de emergencia).  
**Requerimiento fundamental:** El usuario debe tener la **potestad total de ingresar y declarar manualmente cuánto dinero está agregando a ese fondo** cada vez que lo desee, en lugar de que el sistema fuerce descuentos o cálculos automáticos abstractos que no coinciden con la liquidez real del chofer.

**Alcance esperado:**
- CRUD de Fondos: Nombre del fondo (ej. "Cubiertas y Tren Delantero"), meta objetivo opcional, saldo actual acumulado.
- Botón interactivo "+ Aportar al Fondo" donde el usuario tipea el monto real aportado en la fecha y el origen del dinero (efectivo, banco, etc.).
- Historial de aportes y retiros de cada fondo.
- Integración visual en la pantalla de Gastos como bloque independiente o tarjeta destacada sin mezclar con los gastos operativos ya consumidos.

**Archivos probablemente involucrados:**
- `src/db/schema.js` (nueva tabla `saving_funds` y `fund_contributions`)
- `src/app/api/funds/route.js` (nuevos endpoints)
- `src/app/expenses/page.jsx`
- `src/components/FundModal.jsx` (nuevo componente)

---

### MJ-20 — Cierre de Sesión Completo y Switch de Cuenta en Google OAuth
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Seguridad · Backend Laravel · Routing & Middleware · Frontend Blade  
**Comando sugerido:** `@fix logout y selector de cuenta google oauth MJ-20`

**Descripción:**  
Actualmente, si un usuario inicia sesión con Google en una computadora compartida o de prueba, al cerrar sesión en AutoGastos no existe forma de que otro usuario se autentique con una cuenta de Google distinta en la misma máquina, ya que el navegador recuerda la sesión previa de Google y auto-loguea al usuario anterior sin pedir confirmación.

**Alcance esperado:**
- Configurar en la URL de autorización de Google OAuth el parámetro obligatorio:
  ```text
  prompt=select_account
  ```
- Al cerrar sesión (`/api/auth/logout`), purgar completamente las cookies locales (`auth_token`), invalidar el contexto y asegurar que el siguiente clic en "Continuar con Google" abra obligatoriamente el selector de cuentas de Google para elegir con qué correo ingresar.
- Brindar una opción visual clara o instrucciones para desvincular la cuenta en caso de terminales compartidas.

**Archivos probablemente involucrados:**
- `src/app/api/auth/google/route.js`
- `src/app/api/auth/google/callback/route.js`
- `src/app/api/auth/logout/route.js`
- `src/components/Navbar.jsx`
- `src/app/login/page.jsx`

---

### MJ-21 — Período de Prueba (Cuenta Demo / Trial) para Nuevos Registros
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Backend Laravel · Seguridad · Base de Datos & PostgreSQL 17 · UX/UI  
**Comando sugerido:** `@dev periodo de prueba demo trial MJ-21`

**Descripción:**  
Los nuevos usuarios que se registran en la plataforma deben contar con un período de prueba de tiempo limitado (modo demo/trial, ej. 14 días o plazo configurable) para testear las funcionalidades de AutoGastos. Al finalizar el período de prueba, el acceso operativo se pausa hasta que el suscriptor abone su plan y el administrador lo pase a estado `active`.

**Alcance esperado:**
- Al registrarse un nuevo usuario, asignarle automáticamente `subscriptionStatus: 'trial'` y `trialEndsAt: NOW() + X días`.
- Mostrar un badge o aviso sutil en el dashboard con los días restantes de prueba (ej. *"Te quedan 7 días de tu período de prueba"*).
- En el Edge Middleware y APIs, verificar `trialEndsAt`. Si el plazo caducó y el usuario no fue activado (`status !== 'active'`), redirigir a una pantalla informativa de suscripción o renovación.
- En el panel de Administración (`/admin`), permitir al administrador extender el trial, activar la cuenta a `active` o suspenderla.

**Archivos probablemente involucrados:**
- `src/db/schema.js` (columna `trial_ends_at` en tabla `users`)
- `src/app/api/auth/register/route.js`
- `src/app/api/auth/google/callback/route.js`
- `src/middleware.js`
- `src/app/admin/page.jsx`
- `src/app/dashboard/page.jsx`

---

### MJ-22 — Rol de Administrador para Pruebas, Auditoría y Simulación (No Usuario Operativo)
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Arquitectura & Patrones · Seguridad · Backend Laravel · UX/UI  
**Comando sugerido:** `@dev rol admin pruebas auditoria MJ-22`

**Descripción:**  
El usuario Administrador (`role: 'admin'`) no es un chofer ni un usuario operativo de la vida real dentro del sistema. Por lo tanto, los módulos de jornadas, gastos o vehículos dentro de su sesión no deben representar sus finanzas personales, sino funcionar como un **banco de pruebas, auditoría y simulación** para verificar el correcto funcionamiento del software sin contaminar datos operativos ni sesgar métricas SaaS.

**Alcance esperado:**
- Definir un sandbox o contexto de pruebas aislado para la cuenta Admin.
- Asegurar que las métricas globales del panel de administración (`/admin`) distingan y excluyan los registros de prueba generados por el admin para no inflar la facturación ni estadísticas de choferes reales.
- Permitir al administrador limpiar o reiniciar sus datos de prueba con un solo clic.

**Archivos probablemente involucrados:**
- `src/app/admin/page.jsx`
- `src/app/api/admin/route.js`
- `src/lib/summary.js`

---

### MJ-23 — Registro de Revisiones y Ajustes Intermedios en Mantenimiento Vehicular (Caso Frenos / Inspecciones)
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Backend Laravel · Frontend Blade · UX/UI · Base de Datos  
**Comando sugerido:** `@dev revisiones y ajustes mantenimiento vehiculo MJ-23`

**Descripción:**  
Los componentes vehiculares como los frenos tienen un ciclo de recambio mayor programado (ej. cada 30.000 km o 1 año). Sin embargo, en la práctica el conductor lleva el vehículo al taller o lubricentro para chequeos intermedios (ej. regulación de cintas traseras, control de espesor de pastillas, purga de circuito, ajuste de freno de mano) que generan un costo y un historial, pero que **no deben necesariamente resetear el contador de recambio mayor de 30.000 km**. El sistema actual solo contempla registrar el service como completado y reinicia forzosamente el odómetro/fecha del ítem.

**Alcance esperado:**
- **Diferenciación de Tipo de Intervención en Modal de Service:**
  - `service_completo`: Cambio de pastillas / discos / rectificación (resetea el contador de km y fecha del service mayor).
  - `revision_ajuste`: Inspección, regulación, purga o ajuste preventivo (guarda el registro en el historial con fecha, km, costo pagado y notas de taller, pero permite al usuario elegir si reinicia o NO el contador del service principal).
- **Actualización de Esquema de BD (`maintenance_history`):**
  - Agregar campo `action_type` (`'service_completo'` | `'revision_ajuste'`) y flag `reset_counter` (`boolean`).
- **Visualización en Pantalla de Vehículo (`/vehicle`):**
  - En la tarjeta del mantenimiento (ej. "Frenos delanteros y traseros"), mostrar tanto el **Último Cambio Mayor** (km y fecha) como la **Última Revisión / Ajuste** realizada, alertando al chofer si hace mucho que no se revisa aunque falten km para el recambio mayor.
- **Historial Completo:**
  - En la pestaña de Historial, mostrar badges distintivos: 🟢 *Cambio Completo* vs 🟡 *Revisión / Ajuste*.

**Archivos probablemente involucrados:**
- `src/db/schema.js` (`maintenanceHistory`)
- `src/components/ServiceDoneModal.jsx`
- `src/app/api/vehicle-maintenance/[id]/service-done/route.js`
- `src/app/vehicle/page.jsx`

---

### MJ-24 — Plan de Migración Arquitectónica a Laravel 13 + Tailwind CSS + MySQL
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Arquitectura & Patrones · Backend Laravel · Frontend Blade · Base de Datos · Seguridad  
**Comando sugerido:** `@dev migracion arquitectura laravel tailwind mysql MJ-24`

**Descripción:**  
Plan maestro y blueprint de migración integral de la solución AutoGastos SaaS desde el stack actual (Next.js 16 + Drizzle + PostgreSQL + Cloudflare) hacia el stack corporativo robusto: **Laravel 12/13 + Blade + Tailwind CSS + MySQL**, contemplando arquitectura modular, multi-tenancy, Jobs asíncronos para Telegram y opciones de despliegue en la nube en capas 100% gratuitas (Zero Cost Tier).

**Alcance esperado:**
- Mapa de equivalencias técnicas (Next.js API Routes ➔ Laravel Controllers / Actions / Services).
- Esquema relacional MySQL equivalente a PostgreSQL Drizzle.
- Configuración de Tailwind CSS y Blade UI.
- Arquitectura de Queues y Webhooks para el bot de Telegram (`queue:work` vs Serverless).
- Guía de plataformas de hosting gratuitas recomendadas (Oracle Cloud Free Tier, Render, TiDB Serverless, Railway).

**Documento asociado:**
- `Docs/plan_migracion_laravel_tailwind_mysql.md`

---

### MJ-25 — Implementación Real del Ciclo Contable Personalizado (Fecha de Corte que Redefine el Mes Financiero)
**Estado:** ⏳ Pendiente  
**Prioridad:** 🔴 Alta  
**Agentes:** Backend Laravel · Base de Datos & PostgreSQL 17 · Frontend Blade · UX/UI  
**Comando sugerido:** `@dev implementacion real ciclo contable MJ-25`

**Descripción:**  
La app tiene una configuración de **Ciclo Contable** en `/settings` (campo `billingCycleStartDay`) que le permite al usuario definir un día de inicio de su mes financiero distinto al día 1 (ej.: del día 10 al 9 del mes siguiente). Sin embargo, tras un análisis técnico profundo del código se detectó que esta configuración está **parcialmente implementada**: se guarda, se muestra en Settings con texto descriptivo, pero **no redefine los rangos de fechas reales** de ninguna consulta a la base de datos.

**Análisis Técnico Detallado — Brecha Detectada:**

La configuración se guarda en `user_settings` con la clave `billing_cycle_start_day` via `/api/user/preferences/route.js`. La UI en Settings muestra correctamente el texto dinámico:
> *"Modo Ciclo Personalizado: del día 10 de este mes al día 9 del mes siguiente."*

Pero en `src/lib/summary.js` todas las consultas filtran por mes calendario fijo:
```js
// Línea 74 — siempre filtra por YYYY-MM del mes calendario, ignora el ciclo:
sql`SUBSTRING(${dailyLogs.date}, 1, 7) = ${targetMonth}`

// Línea 66 — siempre divide por días del mes calendario, no del ciclo:
const dailyBaseTarget = daysInMonth > 0 ? Math.round(totalObligations / daysInMonth) : 0;
```

**El `billingCycleStartDay` nunca se lee ni se aplica en `summary.js`.** Lo mismo ocurre con `food-expenses/route.js`, `food-budget/route.js`, `daily-logs/route.js` y el cálculo de `daysRemaining` en `summary/route.js`.

**Comportamiento actual vs. comportamiento esperado:**

| Escenario | Comportamiento Actual ❌ | Comportamiento Esperado ✅ |
|-----------|--------------------------|-----------------------------|
| Ciclo configurado: del 10 al 9. Jornada cargada el 2-oct. | Aparece en Octubre | Debe aparecer en Septiembre (ciclo sep 10 → oct 9) |
| Días del ciclo para el objetivo diario | Usa días del mes calendario (30/31) | Debe usar los días reales del ciclo (ej. 30 días del 10-sep al 9-oct) |
| `daysRemaining` para el ritmo dinámico | Días restantes hasta fin de mes calendario | Días restantes hasta el día de corte del ciclo |
| Navegador de meses en Dashboard | Muestra "Octubre" | Debería mostrar "Sep 10 → Oct 9" |
| Gastos y tickets de comida | Filtrados por `YYYY-MM` calendario | Deben incluir los días del ciclo cruzando meses |

**Alcance esperado:**
- Leer `billing_cycle_start_day` del usuario en `getUserFinancialSummary()` al inicio de cada cálculo.
- Si `startDay > 1`, calcular el rango real del ciclo:
  - `cycleStart`: `YYYY-MM-{startDay}` del mes "anterior" al seleccionado
  - `cycleEnd`: `YYYY-MM-{startDay - 1}` del mes seleccionado
- Reemplazar el filtro `SUBSTRING(date, 1, 7) = targetMonth` por un filtro `date BETWEEN cycleStart AND cycleEnd` en las consultas de `dailyLogs`, `foodExpenses` y `appAdvances`.
- Recalcular `daysInMonth` / `daysRemaining` basado en los días reales del ciclo (no del mes calendario).
- Actualizar el `dailyBaseTarget` y el `dailyTargetNeeded` para que dividan por días del ciclo.
- En el UI del Dashboard y de Jornadas, cuando el ciclo es personalizado mostrar el rango `Sep 10 → Oct 9` en lugar del nombre del mes.
- Agregar en `/settings` una descripción más explícita: *"Las jornadas del 1 al 9 de octubre se computarán como parte de Septiembre."*
- Asegurar retrocompatibilidad: si `startDay === 1`, el comportamiento es idéntico al actual (mes calendario).

**Impacto en los cálculos financieros:**
- ✅ `Objetivo Diario Base` (Fijo): se recalcula con días reales del ciclo
- ✅ `Ritmo Dinámico` (daysRemaining): usa días hasta el corte del ciclo
- ✅ `Gastado Real de Comida` y presupuesto de comida: filtran por rango del ciclo
- ✅ `Avances de Apps`: se imputan al ciclo correcto
- ✅ Navegación histórica por ciclo en Dashboard y Jornadas

**Archivos involucrados:**
- `src/lib/summary.js` — Lógica central de cálculo financiero (cambio más crítico)
- `src/app/api/summary/route.js` — `daysRemaining` y exposición del rango del ciclo al frontend
- `src/app/api/daily-logs/route.js` — Filtro de logs por rango de ciclo
- `src/app/api/food-expenses/route.js` — Filtro de tickets por rango de ciclo
- `src/app/api/food-budget/route.js` — Cálculo de presupuesto de comida por ciclo
- `src/app/api/user/preferences/route.js` — Ya implementado (lectura/escritura de `billing_cycle_start_day`)
- `src/app/settings/page.jsx` — Mejorar descripción explicativa del impacto real
- `src/app/dashboard/page.jsx` — Mostrar el rango del ciclo activo
- `src/app/driver/page.jsx` — Mostrar el rango del ciclo en la vista de jornadas

---

## 🟧 MEDIA PRIORIDAD

---

### MJ-03 — Mejora Visual de Arqueos y Proceso de Conciliación
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟠 Media  
**Agentes:** UX/UI · Frontend Blade  
**Comando sugerido:** `@dev mejora arqueo conciliacion MJ-03`

**Descripción:**  
La pantalla de Arqueo y Conciliación de Caja necesita una mejora visual y de UX. El flujo actual es funcional pero la presentación puede ser más clara e intuitiva para el chofer en el momento del arqueo diario.

**Alcance esperado:**
- Mejorar el layout del modal `CashReconciliationModal.jsx`.
- Hacer más visible la diferencia entre "Sistema" vs "Realidad" (el núcleo del arqueo).
- Mejorar la presentación de las opciones de resolución (blanqueo vs ajuste de ritmo).
- Agregar iconografía más clara para cada paso del proceso.
- Mejorar la legibilidad del resumen final post-conciliación.
- Revisar el flujo paso a paso para que sea más intuitivo incluso para un usuario nuevo.

**Archivos probablemente involucrados:**
- `src/components/CashReconciliationModal.jsx`
- `src/app/dashboard/page.jsx` (botón/trigger del arqueo)

---

### MJ-04 — Logo de la App + Link al Dashboard
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟠 Media  
**Agentes:** UX/UI · Frontend Blade  
**Comando sugerido:** `@dev logo link dashboard MJ-04`

**Descripción:**  
Agregar un logo a la aplicación y convertirlo en un link de navegación hacia el Dashboard. El logo debe aparecer en la Navbar y/o en el header de la app.

**Alcance esperado:**
- Diseñar o definir el logo de la app (ícono o logotipo de "AutoGastos" / "App Norte").
- Insertar el logo en el componente Navbar (o el componente de navegación principal).
- El logo debe ser un `<Link href="/dashboard">` para navegar al dashboard al hacer clic.
- Asegurarse de que el logo sea responsivo y se vea bien tanto en desktop como en mobile.
- El logo debe funcionar tanto en modo claro como en modo oscuro.

**Archivos probablemente involucrados:**
- `src/components/Navbar.jsx` (o componente equivalente de navegación)
- `public/` (para el archivo de imagen del logo)
- `src/app/globals.css`

---

### MJ-05 — Categorías Personalizadas por Usuario
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟠 Media  
**Agentes:** Backend Laravel · Base de Datos · UX/UI · Frontend Blade · Seguridad  
**Comando sugerido:** `@dev categorias personalizadas por usuario MJ-05`

**Descripción:**  
Actualmente las categorías de gastos son globales y fijas para todos los usuarios. Se quiere que cada usuario pueda crear sus propias categorías personalizadas, que se sumen a las categorías por defecto del sistema.

**Alcance esperado:**
- Crear tabla `user_categories` (o similar) en la base de datos con `userId`, `name`, `icon`, `color`, etc.
- Mantener las categorías default del sistema disponibles para todos.
- Crear API endpoints para: listar categorías del usuario (default + propias), crear nueva categoría, editar y eliminar categorías propias.
- En el formulario de carga de gastos, el selector de categoría debe mostrar primero las default y luego las del usuario.
- Agregar una sección en configuración de usuario (`/settings`) para gestionar sus categorías personalizadas.
- Las categorías propias solo son visibles y editables por su creador.
- Validar que no se puedan eliminar categorías que estén en uso por gastos existentes.

**Archivos probablemente involucrados:**
- `src/db/schema.js` (nueva tabla)
- `src/app/api/categories/route.js` (nuevo endpoint)
- `src/components/ExpenseModal.jsx` (o equivalente)
- `src/app/settings/page.jsx`
- Migraciones de base de datos

---

### MJ-06 — Botón de Invitación a la App por Correo
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟠 Media  
**Agentes:** Backend Laravel · Seguridad · UX/UI  
**Comando sugerido:** `@dev invitacion por correo MJ-06`

**Descripción:**  
Agregar un botón o flujo que permita enviar una invitación por correo electrónico para que un nuevo usuario se registre en la app. Útil para que el administrador o usuarios existentes inviten a nuevos choferes.

**Alcance esperado:**
- Definir quién puede enviar invitaciones: ¿solo el admin? ¿cualquier usuario?
- Crear un formulario de invitación con campo de email del destinatario.
- Generar un token de invitación único con expiración (ej. 48 horas).
- Enviar un email con link de registro pre-configurado que incluya el token.
- Al registrarse con ese link, el usuario queda vinculado a la invitación (opcional: pre-completar email).
- En el panel Admin, mostrar invitaciones enviadas y su estado (pendiente / aceptada / expirada).
- Revocar invitaciones pendientes si es necesario.

> ⚠️ **Pendiente de definición:** Qué servicio de email usar (Resend, SendGrid, Nodemailer, etc.) y si el admin es el único que puede invitar.

**Archivos probablemente involucrados:**
- `src/app/api/invitations/route.js` (nuevo endpoint)
- `src/app/admin/page.jsx` (panel de admin)
- `src/db/schema.js` (tabla `invitations`)
- `src/lib/email.js` (nuevo helper de envío de email)
- `src/app/register/page.jsx` (soporte de token en la URL)

---

### MJ-07 — Manual de Usuario Detallado
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟠 Media  
**Agentes:** Coordinador de Documentación · Documentador de Módulos & Flujos  
**Comando sugerido:** `@docs manual de usuario MJ-07`

**Descripción:**  
Crear un manual de usuario completo y muy detallado que explique cómo usar todas las funcionalidades de la plataforma AutoGastos SaaS. Orientado al chofer final, con lenguaje simple, sin tecnicismos y con capturas o ilustraciones de cada pantalla.

**Alcance esperado:**
- Documento en formato Markdown (y/o PDF exportable) guardado en `Docs/manual_de_usuario_completo.md`.
- **Estructura sugerida del manual:**
  1. Introducción y para qué sirve la app
  2. Cómo crear la cuenta y primeros pasos (registro, Google OAuth, perfil inicial)
  3. Configuración inicial: perfil, apps activas (Uber/Cabify/DiDi/Rappi), modalidad del auto (propio vs alquilado), vinculación Telegram
  4. **Módulo Jornadas y Rendimiento:** cómo cargar una jornada diaria, entender los KPIs del mes, qué es el odómetro y el `+X KM`, cómo editar y eliminar jornadas
  5. **Módulo Dashboard / Termómetro Financiero:** cómo leer el termómetro, punto de equilibrio vs meta, cómo hacer el arqueo de caja diario y el proceso de conciliación
  6. **Módulo Gastos Fijos y Hogar:** cómo cargar gastos fijos, cuotas, aumentos de precio, checklist de pagos cancelados vs pendientes, división de gastos en pareja/familia
  7. **Módulo Mantenimiento Vehicular:** semáforos de VTV, GNC, aceite, services; cómo registrar un service realizado; fondo de reserva
  8. **Bot de Telegram:** todos los comandos disponibles (`/resumen`, `/jornada`, `/pagos`, `/adelanto`, `/gasto`, `/chatid`), ejemplos de uso y respuestas esperadas
  9. **Adelantos y Arqueo de Caja:** qué es un adelanto, cómo registrarlo, cómo hacer el arqueo diario (diferencia Sistema vs Realidad), opciones de blanqueo y ajuste de ritmo
  10. Preguntas frecuentes (FAQ) y errores comunes
  11. Glosario de términos (odómetro, arqueo, conciliación, adelanto, termómetro, etc.)
- Cada sección debe incluir pasos numerados, ejemplos concretos con números reales y notas de ayuda.
- Tono cercano, directo, como explicarle a un chofer sin conocimientos técnicos.

---

### MJ-08 — Landing Page / Página Index de Comercialización
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟠 Media  
**Agentes:** UX/UI · Frontend Blade  
**Comando sugerido:** `@dev landing page comercializacion MJ-08`

**Descripción:**  
Crear una página de inicio (`/`) pública y atractiva orientada a la comercialización y captación de nuevos usuarios. Actualmente la ruta raíz redirige directamente al login/dashboard. Se quiere una landing page que venda la propuesta de valor de la app antes de que el visitante se registre.

**Alcance esperado:**
- Diseño moderno, premium y responsivo — primera impresión que genere confianza.
- **Secciones sugeridas:** Hero con titular impactante, propuesta de valor, módulos clave, apps soportadas (todas: Uber, Cabify, DiDi, InDrive, Rappi, PedidosYa), 3 pasos de funcionamiento, planes y CTA final.
- La landing es una ruta pública independiente de sesión.
- ⚠️ **Bloqueante:** Pendiente de definición del nombre comercial definitivo por parte del desarrollador.

---

### MJ-10 — Panel Admin Avanzado: Publicaciones y Control de Módulos
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟠 Media  
**Agentes:** UX/UI · Frontend Blade · Backend Laravel · Seguridad  
**Comando sugerido:** `@dev admin avanzado publicaciones modulos MJ-10`

**Descripción:**  
Expandir el panel administrativo para publicar avisos/novedades dirigidos a los choferes y ofrecer una matriz de control de feature flags más granular.

---

### MJ-11 — Revocación de Usuarios desde el Admin
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟠 Media  
**Agentes:** Backend Laravel · Seguridad · UX/UI  
**Comando sugerido:** `@dev revocar usuarios admin MJ-11`

**Descripción:**  
Permitir suspender o reactivar el acceso de cualquier usuario de forma inmediata y reversible con registro de auditoría, verificando el estado en el middleware en cada petición.

---

### MJ-12 — Impersonación de Sesión de Usuario desde el Admin
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟠 Media  
**Agentes:** Backend Laravel · Seguridad  
**Comando sugerido:** `@dev impersonacion sesion admin MJ-12`

**Descripción:**  
Permitir al administrador acceder temporalmente en modo "Ver como este usuario" para diagnosticar errores reportados, con banner visible y registro de auditoría estricto.

---

## 🟡 BAJA PRIORIDAD / FASE POSTERIOR

---

### MJ-13 — Módulo de Tickets de Soporte
**Estado:** ⏳ Pendiente  
**Prioridad:** 🟡 Baja (planificación futura)  
**Agentes:** UX/UI · Frontend Blade · Backend Laravel · Base de Datos  
**Comando sugerido:** `@dev modulo tickets soporte MJ-13`

**Descripción:**  
Módulo interno para que los choferes envíen consultas o reportes de bugs y el administrador responda desde el panel central.

---

## 🧪 ESTRATEGIA DE VALIDACIÓN: PRUEBAS PILOTO CON USUARIOS (2 A 3 USUARIOS)

El desarrollador ha establecido una fase de **pruebas exhaustivas continuas** seguida de una **sesión piloto con 2 o 3 usuarios reales**:
1. **Fase 1 (Testing Interno Exhaustivo):** Resolución de los bugs detectados (MJ-09, MJ-15, MJ-16, MJ-20) y puesta a punto de los requerimientos clave.
2. **Fase 2 (Prueba Piloto con Choferes):** Onboarding de 2 o 3 usuarios invitados para registrar jornadas reales, gastos compartidos, adelantos y arqueos diarios.
3. **Fase 3 (Feedback Loop):** Recolección directa de sus impresiones para pulir la UX/UI y el manual de usuario antes de la salida masiva al mercado.

---

## ✅ COMPLETADAS

*(Mover ítems aquí cuando sean implementados, indicando fecha de cierre y commit)*

| ID | Título | Fecha | Comando usado |
|----|--------|-------|---------------|
| —  | —      | —     | —             |

---

## 📌 Notas del PM

- **Bugs Críticos Inmediatos a resolver:**
  - **MJ-09 (Gasto compartido que no carga en la sesión del invitado tras aceptar):** Bloqueante para el módulo de hogar/parejas.
  - **MJ-20 (Google OAuth Logout / Switch de usuario):** Imprescindible para pruebas multi-cuenta en una misma máquina.
  - **MJ-16 (Ocultar vehículo y plataformas en `/settings` si `moduleDriver` es inactivo):** Inconsistencia visual inmediata.
- **Reforma Visual y Reorganización (Dashboard MJ-02 y Gastos MJ-18):**
  - Se abordará con el equipo multidisciplinario (UX/UI, Frontend Blade, Arquitectura y Ciberseguridad).
  - Regla de oro: **Reorganización estética y de jerarquía de datos sin tocar la lógica matemática ni los contratos de API existentes**.
- **Nuevas Funcionalidades Financieras:**
  - **MJ-19 (Módulo de Fondos con aporte manual):** Da libertad al usuario de volcar aportes reales a discreción.
  - **MJ-14 (Gráfica de Mínimo e Ideal):** A la espera del boceto visual del desarrollador para replicar con exactitud el gráfico deseado.
  - **MJ-21 (Período de prueba Demo/Trial):** Base fundamental para el modelo de monetización SaaS.
  - **MJ-22 (Admin como sandbox de pruebas):** Limpieza y separación de analíticas operativas vs administrativas.
- **Ciclo Contable (MJ-25):**
  - ⚠️ **Funcionalidad a medias — alta prioridad:** La configuración del día de corte se guarda y se muestra en Settings, pero **no afecta ningún filtro real de la BD ni ningún cálculo financiero**. Las jornadas, gastos y objetivos diarios siempre se calculan por mes calendario (1 al 31) independientemente del ciclo configurado. Ver análisis técnico completo en MJ-25.

---

*Documento actualizado y gestionado por el Project Manager (@pm) — App Norte 2.0*  
*Para implementar cualquier ítem usar el comando @dev seguido del título e ID del ítem.*

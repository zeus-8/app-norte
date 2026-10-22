# 📋 Bitácora Técnica — Implementación Real del Ciclo Contable & Preservación Histórica del Ritmo (MJ-25)

**Fecha:** 2026-10-22  
**Proyecto:** AutoGastos SaaS (App Norte 2.0)  
**Ticket / Mejora:** MJ-25  
**Estado:** ✅ Implementado, Validado & Compilado (Next.js Código 0)

---

## 🎯 1. Resumen de la Modificación

Se resolvió una deuda técnica crítica que afectaba la precisión de los meses financieros personalizados de los choferes, la persistencia en Configuración y el comportamiento de la gráfica de objetivos diarios:

1. **Auto-guardado & Persistencia en Configuración:** Se incorporó guardado automático instantáneo y botón directo en la tarjeta de **Ciclo Contable & Inicio de Mes** (`/settings`), evitando que la selección se pierda al salir de la pantalla.
2. **Ciclo Contable Real (Redefinición del Mes Financiero):** Se implementó la lógica matemática y de base de datos para que los choferes con corte a mitad de mes (ej: del día 10 al 9 del mes siguiente) tengan sus consultas filtradas por la ventana real de su ciclo contable, sin forzar el mes calendario rígido.
3. **Preservación Histórica del Ritmo Necesario:** Se corrigió el algoritmo de la gráfica en Jornadas (`EarningsChart.jsx`), eliminando la supresión de puntos pasados. Ahora el gráfico dibuja la curva continua de todo el ciclo: muestra el ritmo que se exigía en cada día pasado según los ingresos reales y proyecta el ritmo actual hacia los días restantes.

---

## 🔍 2. Problemas Previos & Diagnóstico

| Síntoma Detectado | Causa en Código | Impacto en el Usuario |
|---|---|---|
| **La selección en Configuración volvía al Día 1.** | El selector `billingCycleStartDay` no tenía auto-guardado ni botón propio dentro de la card; requería presionar el botón global superior en el header. | El usuario cambiaba la opción, salía de la vista y el cambio nunca se enviaba al servidor. |
| **La app mostraba siempre hasta el 31 del mes calendario.** | `summary.js`, `daily-logs` y `advances` filtraban con `SUBSTRING(date, 1, 7) = targetMonth`. | Chofer con corte el día 10 veía jornadas del 1 al 9 de noviembre excluidas de Octubre, y jornadas del 1 al 9 de octubre asignadas erróneamente a Octubre en vez de Septiembre. |
| **La gráfica borraba los puntos del Ritmo Necesario.** | `EarningsChart.jsx` tenía la condición `dayNum >= currentDay ? dailyTargetNeeded : null`, asignando `null` a días pasados. | Cada día que pasaba, el punto de ritmo de ayer desaparecía. El chofer no podía ver su historial ni entender cómo se recalculó su meta. |

---

## 🛠️ 3. Solución Técnica Implementada

### A. Módulo Central de Ciclo Contable (`src/lib/billingCycle.js`)
Se creó una biblioteca utilitaria que gestiona la matemática de fechas de ciclo:
* `getBillingCycleRange(targetMonth, startDay)`: Retorna `startDate`, `endDate`, `daysInCycle`, array de fechas exactas `dates` (`['YYYY-MM-DD']`), etiquetas contextuales (`cycleLabel`, `shortRangeLabel`) e indicador `isCustom`.
* `getCycleForDate(dateStr, startDay)`: Determina de forma biunívoca a qué ciclo financiero pertenece cualquier fecha cargada en el sistema.

### B. Lógica Financiera & Consultas a Base de Datos (`src/lib/summary.js`)
* Se lee `billing_cycle_start_day` de `user_settings`.
* Se sustituyeron los filtros de mes calendario por ventanas temporales:
  * **Jornadas:** `dailyLogs.date >= startDate AND dailyLogs.date <= endDate`
  * **Adelantos de Apps:** `appAdvances.date >= startDate AND appAdvances.date <= endDate`
  * **Arqueos de Caja:** `cashReconciliations.date >= startDate AND cashReconciliations.date <= endDate`
  * **Tickets de Comida:** `foodExpenses.date >= startDate AND foodExpenses.date <= endDate`
* **Metas & Días Restantes:** El cálculo de `daysRemaining` y `dailyBaseTarget` se computa sobre los días reales del ciclo contable (ej. 31 días del 10/10 al 09/11).

### C. Endpoints API Actualizados
* [`src/app/api/summary/route.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/summary/route.js): Expone el objeto `billingCycle` y utiliza el calendario del ciclo para el termómetro financiero.
* [`src/app/api/daily-logs/route.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/daily-logs/route.js): Filtra por `startDate` y `endDate` del ciclo y retorna metadata en el JSON.
* [`src/app/api/advances/route.js`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/api/advances/route.js): Imputa retiros y cobros anticipados al ciclo correspondiente.

### D. Gráfica Interactiva con Historial Continuo (`src/components/EarningsChart.jsx`)
* **Eje X:** Se alimenta del array de fechas del ciclo contable activo (`10/10`, `11/10` ... `31/10`, `01/11` ... `09/11`).
* **Mapeo Robusto:** La ganancia neta se vincula por fecha ISO exacta `YYYY-MM-DD`.
* **Curva Histórica de Ritmo:**
  * Días pasados: Se calcula y congela el ritmo exigido en cada día $\frac{\text{Meta Pendiente}}{\text{Días Restantes}}$, acumulando los ingresos reales día a día.
  * Día actual: Muestra el punto destacado del ritmo actual.
  * Días futuros: Proyecta la meta diaria necesaria constante hasta el corte del ciclo.
  * **Dinámica Natural:** Si un día se recauda poco, al día siguiente el ritmo sube; si un día se recauda mucho, al día siguiente el ritmo baja.

### E. Frontend & Experiencia de Usuario (UX/UI)
* [`src/app/settings/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/settings/page.jsx): Selector con auto-guardado en evento `onChange`, botón directo *"Guardar Día"* y feedback visual en tiempo real (`Guardando...` / `✓ Guardado`).
* [`src/app/driver/page.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/app/driver/page.jsx) & [`src/components/Navbar.jsx`](file:///c:/Users/user/Desktop/app-norte2.0/src/components/Navbar.jsx): Badge con el rango del ciclo activo (ej: `10/10 al 09/11`) junto al nombre del mes.

---

## 📂 4. Mapa de Archivos Modificados

```
app-norte2.0/
├── Docs/
│   ├── fix_ciclo_contable_y_grafica_ritmo_historico.md   (Nuevo)
│   └── mejoras_pendientes.md                             (Modificado - MJ-25 Completado)
├── src/
│   ├── lib/
│   │   ├── billingCycle.js                               (Nuevo)
│   │   └── summary.js                                    (Modificado)
│   ├── app/
│   │   ├── api/
│   │   │   ├── summary/route.js                          (Modificado)
│   │   │   ├── daily-logs/route.js                       (Modificado)
│   │   │   └── advances/route.js                         (Modificado)
│   │   ├── dashboard/page.jsx                            (Modificado)
│   │   ├── driver/page.jsx                               (Modificado)
│   │   └── settings/page.jsx                             (Modificado)
│   └── components/
│       ├── EarningsChart.jsx                             (Modificado)
│       └── Navbar.jsx                                    (Modificado)
```

---

## 🧪 5. Validación de Compilación

* **Comando:** `npm run build`
* **Compilador:** Next.js 16.3.5 (Turbopack)
* **Resultado:** ✅ `Compiled successfully in 18.2s`
* **Páginas Estáticas & Rutas API:** 15/15 generadas exitosamente con código de salida `0`.

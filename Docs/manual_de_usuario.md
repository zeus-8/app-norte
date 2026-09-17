# 🚗 Manual de Usuario — AutoGastos SaaS (v2.0)
*Plataforma Integral de Finanzas para Choferes Multiapp, Control Vehicular, Cuotas y Gastos de Hogar Compartido.*

---

## 📑 Tabla de Contenidos
1. [Introducción y Acceso al Sistema](#1-introducción-y-acceso-al-sistema)
2. [Dashboard Principal y Termómetro Financiero](#2-dashboard-principal-y-termómetro-financiero)
3. [Módulo de Jornadas Diarias Multiapp](#3-módulo-de-jornadas-diarias-multiapp)
4. [Módulo de Gastos, Cuotas y Checklist de Pagos](#4-módulo-de-gastos-cuotas-y-checklist-de-pagos)
5. [Hogar Compartido y Cuentas Vinculadas (División 60/40)](#5-hogar-compartido-y-cuentas-vinculadas-división-6040)
6. [Aumentos de Alquiler y Servicios con Vigencia](#6-aumentos-de-alquiler-y-servicios-con-vigencia)
7. [Mantenimiento Vehicular y Trámites (VTV/GNC/Patente)](#7-mantenimiento-vehicular-y-trámites-vtvgncpatente)
8. [Alertas y Notificaciones por Telegram Bot](#8-alertas-y-notificaciones-por-telegram-bot)
9. [Preguntas Frecuentes (FAQ)](#9-preguntas-frecuentes-faq)

---

## 1. Introducción y Acceso al Sistema

AutoGastos está diseñado para darte **claridad financiera total**: sabe exactamente cuánto ganás por hora en las apps, cuánto debés apartar para tus gastos y cuotas, el estado de tu auto y cómo compartir los costos del hogar con tu pareja sin confusiones.

### Métodos de Ingreso
1. **Acceso con Google (1 Clic):** 
   * Hacé clic en **"Continuar con Google"**.
   * Si es tu primera vez, el sistema creará tu cuenta al instante y precargará el catálogo estándar de mantenimiento para Argentina (VTV, GNC, Patente, Aceite, Frenos, etc.).
2. **Acceso Tradicional (Email y Contraseña):**
   * Podés ingresar con tu correo y contraseña habituales.
   * *Nota de Seguridad:* Las cuentas de Administrador ingresan exclusivamente mediante este método.

---

## 2. Dashboard Principal y Termómetro Financiero

Al ingresar al sistema, lo primero que verás es tu resumen financiero del mes en curso:

### Tarjetas de KPIs Principales
* **🟢 Ganancia Neta Apps:** Facturación bruta total menos gastos directos en combustible y peajes.
* **🔴 Tus Obligaciones del Mes:** Monto total que debés cubrir en el mes (gastos fijos + cuotas + tu parte de los gastos del hogar).
  * *✅ Ya Pagado:* Dinero que ya desembolsaste en el mes.
  * *⏳ Pendiente:* Dinero que aún te falta abonar antes de fin de mes.
* **🟡 Balance Neto vs Gastos:** Tu margen libre real (`Ganancia Neta - Obligaciones`).
* **🔵 Fondo Mantenimiento Auto / Odómetro:** Kilometraje actual del vehículo y reservas estimadas.

### Termómetro de Metas (Semáforo Visual)
* **🔴 Zona Roja (Alerta):** Tus ingresos netos aún no cubren el costo mínimo de vida del mes.
* **🟡 Zona Amarilla (En Progreso):** Estás cubriendo entre el 50% y el 99% de tus compromisos.
* **🟢 Zona Verde (Superada):** ¡Cubriste el 100% de tus obligaciones! A partir de aquí, todo ingreso es ganancia libre para ahorro o disfrute.

---

## 3. Módulo de Jornadas Diarias Multiapp

Permite registrar tu trabajo en plataformas como **Uber, Cabify, DiDi, InDrive, Rappi o PedidosYa**.

### ¿Cómo cargar una jornada?
1. Hacé clic en el botón superior **"+ Cargar Jornada"** o ingresá a la pestaña **Jornadas**.
2. Completá los datos del día:
   * **Fecha:** Día de la jornada.
   * **Horas y Minutos:** Tiempo exacto trabajado (ej. `5 horas` y `30 minutos`).
   * **Cantidad de Viajes:** Total de viajes realizados.
   * **Ingreso por Aplicación:** Cuánto generaste en Uber, Cabify, etc.
   * **Gasto de Combustible:** Monto cargado de Nafta o GNC en el día.
   * **Odómetro Final:** Kilometraje del auto al terminar de trabajar.
3. Hacé clic en **"Guardar Jornada"**.

> **💡 Beneficio:** El sistema calculará tu **Rendimiento por Hora ($/hora)** para que sepas qué días y horarios te rinden más.

---

## 4. Módulo de Gastos, Cuotas y Checklist de Pagos

Ingresá a la pestaña **Gastos** para gestionar todas tus salidas de dinero.

### Tipos de Gastos Disponibles
1. **📌 Fijo Mensual:** Compromisos que se repiten todos los meses (Alquiler, Luz, Internet, Seguro, Teléfono, Gimnasio).
2. **💳 Compra en Cuotas Sin Interés:** Compras con tarjeta (2, 3, 6, 12, 18 o 24 cuotas).
   * El sistema calcula automáticamente la cuota mensual y el progreso (ej. *Cuota 3 de 12*).
   * **Proyección a 12 Meses:** Podés ver en un gráfico interactivo cómo disminuirá tu carga financiera a medida que termines de pagar cada compra.
3. **⚡ 1 Solo Pago:** Gastos extraordinarios de un mes puntual.

### Checklist Interactivo de Pagos `[✓]`
En la tabla de gastos verás una casilla `[✓]` a la izquierda de cada fila:
* **Al pagar un servicio o cuota:** Hacé clic en la casilla para marcarlo como **Pagado**.
* **Impacto visual:** El gasto se tachará en verde y la barra de progreso superior actualizará al instante el total **Ya Cancelado** vs **Pendiente por Desembolsar**.

---

## 5. Hogar Compartido y Cuentas Vinculadas (División 60/40)

Esta función te permite compartir los gastos de convivencia con tu pareja (ej. Juan y Yeli) **sin duplicar registros** y manteniendo los gastos personales 100% privados.

### Paso 1: Configurar el Hogar (Se hace una sola vez)
1. Andá a **Configuración** (`/settings`).
2. En la sección **"🏡 Hogar & Cuentas Vinculadas"**, completá:
   * **Nombre del Hogar:** Ej. *Hogar Juan & Yeli*.
   * **Correo de tu Pareja:** El correo con el que ella ingresa (ej. `yeli@correo.com`).
   * **División:** Tu porcentaje (ej. `60%`) y el de tu pareja (ej. `40%`).
3. Hacé clic en **"Crear Hogar y Vincular Cuentas"**.

### Paso 2: Aceptación de la Invitación
* Cuando tu pareja inicie sesión, verá un cartel destacado en su Dashboard:  
  *`"¡Invitación para compartir gastos en Hogar Juan & Yeli (Tu parte: 40%)! [Aceptar]"`*
* Al presionar **Aceptar**, las cuentas quedan enlazadas.

### Paso 3: Carga de Gastos Compartidos
* Cuando cargues un gasto (ej. *Alquiler $300.000* o *Supermercado $80.000*), marcá la casilla `[✓] ¿Es un gasto compartido del hogar?`.
* **¿Qué sucede automáticamente?**
  * En **tu panel**, se computará tu **60%** ($180.000).
  * En el **panel de tu pareja**, aparecerá automáticamente ese mismo gasto computándole su **40%** ($120.000) sin que tenga que cargarlo.
  * Cada uno tiene su propio checklist de `[✓] Pagado` en el mes.

---

## 6. Aumentos de Alquiler y Servicios con Vigencia

En Argentina, los alquileres y servicios aumentan periódicamente (por IPC o ICL). AutoGastos te permite actualizar el monto **sin arruinar los balances de los meses anteriores**.

### ¿Cómo aplicar un aumento?
1. En la tabla de **Gastos**, ubicá el gasto fijo (ej. *Alquiler*).
2. Hacé clic en el botón amarillo **📈 (Aumento)** al lado del botón de editar.
3. Indicá:
   * **Nuevo Monto Total:** (Ej. `$360.000`).
   * **Vigente a partir de:** Mes desde el cual rige el aumento (Ej. `2026-04`).
   * **Motivo/Nota (opcional):** Ej. *Ajuste cuatrimestral por IPC*.
4. Hacé clic en **"Confirmar y Guardar Aumento"**.

> **Resultado:** Todos los meses anteriores a esa fecha conservarán el valor histórico ($300.000) en los balances, y a partir del mes seleccionado se calculará con el nuevo valor ($360.000).

---

## 7. Mantenimiento Vehicular y Trámites (VTV/GNC/Patente)

Ubicado en la pestaña **Vehículo**, este módulo evita multas y roturas caras en tu herramienta de trabajo.

### Tipos de Seguimiento
1. **Por Kilometraje (Mecánica):** Cambio de aceite y filtro (cada 10.000 km), pastillas de freno (cada 25.000 km), distribución (cada 60.000 km).
2. **Por Fecha Fija / Terminación de Patente (Trámites):** 
   * **VTV:** Mes según el último número de tu patente (ej. Noviembre = terminados en 1).
   * **Oblea GNC:** Vencimiento anual exacto.
   * **Patente / Seguro:** Vencimientos mensuales o bimestrales.

### ¿Cómo registrar un service realizado?
Cuando realices el cambio de aceite o renueves un trámite:
1. En la lista de servicios, hacé clic en el botón verde **"✓ Hecho"**.
2. Ingresá la fecha, el kilometraje actual y cuánto pagaste.
3. El sistema reiniciará automáticamente el contador para el próximo service y guardará el comprobante en tu **Historial de Mantenimiento**.

---

## 8. Bot de Telegram: Alertas, Resumen en Vivo y Carga Rápida

AutoGastos incluye un bot interactivo de Telegram (**`@MiAutoGastos_bot`**) para consultar tus finanzas y registrar tus jornadas de trabajo directamente desde el celular en segundos.

### Pasos de Activación (1 minuto)
1. Abrí Telegram en tu celular o PC y buscá tu bot: **`@MiAutoGastos_bot`**.
2. Presioná el botón **INICIAR** (o enviale el comando `/start`).
3. Obtené tu **Chat ID** (enviando un mensaje a `@userinfobot` en Telegram).
4. Ingresá a **Configuración** (`/settings`) en AutoGastos:
   * Pegá tu **Chat ID de Telegram** (ej. `854412964`).
   * Activá la casilla **"Habilitar Notificaciones de Telegram"**.
   * Presioná **"Enviar Notificación de Prueba"** para verificar la conexión.

### Comandos Disponibles en Telegram

| Comando | Acción | Ejemplo de Uso |
| :--- | :--- | :--- |
| **`/resumen`** | Consulta tu balance del mes, ganancia neta, $/hora, gastos y alertas mecánicas en tiempo real. | `/resumen` |
| **`/jornada`** | Registra tu jornada diaria de trabajo en segundos sin abrir la web. | `/jornada 55000 nafta 10000 5h 30m 18 viajes odo 146500` |
| **`/pagos`** | Muestra el checklist de gastos del mes (pagados vs pendientes con sus fechas de vencimiento). | `/pagos` |
| **`/chatid`** | Muestra tu ID de usuario de Telegram. | `/chatid` |
| **`/ayuda`** | Muestra el menú de ayuda del bot. | `/ayuda` |

> **💡 Ejemplo de carga rápida:**  
> Cuando terminás de trabajar, simplemente le mandás al bot:  
> `/jornada uber 35000 cabify 20000 gnc 8000 5h 30m`  
> El bot guardará el día en tu cuenta y te confirmará:  
> *✅ ¡Jornada guardada! Ganancia neta: $47.000 ($8.545/hora).*

---

## 9. Preguntas Frecuentes (FAQ)

#### ¿Qué pasa si cambio de celular o computadora?
AutoGastos está alojado en la nube con PostgreSQL. Podés ingresar desde cualquier dispositivo (celular, tablet o PC) y tu información estará siempre sincronizada y al día.

#### ¿Mi pareja puede ver mis gastos personales?
**No.** Los gastos personales (ropa propia, salidas individuales, cuotas personales) solo son visibles para ti. Únicamente se comparten los gastos donde marques explícitamente `[✓] Compartido del Hogar`.

#### ¿Cómo cambio los porcentajes de división del hogar?
Podés cambiarlos en cualquier momento desde **Configuración > Hogar & Cuentas Vinculadas**, o modificarlos puntualmente al editar un gasto específico.

---
*AutoGastos SaaS — Diseñado para maximizar tu rentabilidad y tranquilidad financiera.*

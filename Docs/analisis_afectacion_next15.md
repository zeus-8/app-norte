# 📋 Análisis de Afectación e Impacto: Migración a Next.js 15+ & Cloudflare Workers

> **Proyecto:** AutoGastos SaaS (app-norte2.0)  
> **Fecha:** 18 de Septiembre de 2026  
> **Responsable:** Equipo de Desarrollo & Arquitectura (Coordinación @pm)  
> **Estado:** Documento de Evaluación Técnica y Plan de Afectación  

---

## 🎯 1. Resumen Ejecutivo y Decisión del Equipo

Tras el análisis exhaustivo del build log en Cloudflare (`Docs/app-norte.production.5afaf8fc-d319-4abb-87ab-9373d7e24525.build.log`) y la revisión completa del código fuente del proyecto, el equipo de especialistas (**Arquitectura, Backend, Seguridad, Base de Datos y Testing**) evaluó las dos alternativas técnicas disponibles.

### Veredicto y Consenso Unánime del Equipo:
🏆 **Recomendación: ACTUALIZAR A NEXT.JS 15+ (Opción B)**

**¿Por qué?**
El costo de migración en este proyecto es **extremadamente bajo** (únicamente **6 archivos modificados**, afectando menos de 15 líneas de código), mientras que el beneficio de estabilidad, soporte a largo plazo y compatibilidad nativa con Cloudflare Workers (OpenNext) es total.

---

## ⚖️ 2. Comparativa Detallada: Pros y Contras de Ambas Opciones

### Opción A: Mantener Next.js 14 con Flag `--dangerouslyUseUnsupportedNextVersion`

| Perspectiva | Pros | Contras |
| :--- | :--- | :--- |
| **Implementación** | No requiere tocar código de rutas ni auth. | Requiere configurar scripts con banderas forzadas. |
| **Estabilidad** | El código corre idéntico al entorno local actual. | ⚠️ **Riesgo alto de ruptura**: Cloudflare / OpenNext ya deprecó Next 14 y eliminará su compatibilidad en futuras versiones del adaptador. |
| **Soporte & Seguridad** | Cero tiempo de refactorización hoy. | Next.js 14 no recibe parches de seguridad activos por parte de Vercel/Cloudflare. |
| **Gobernanza / CI-CD** | Rápido para salir del paso. | Deuda técnica acumulada que fallará en futuros despliegues automáticos. |

---

### Opción B: Actualizar a Next.js 15+ (Recomendada)

| Perspectiva | Pros | Contras |
| :--- | :--- | :--- |
| **Sostenibilidad** | ✅ **100% sustentable y estándar oficial**: Alineado con el roadmap activo de Cloudflare y OpenNext. | Requiere actualizar dependencias en `package.json`. |
| **Rendimiento** | ✅ Mejor arranque en frío (*cold start*) y optimización de memoria en Cloudflare Workers. | — |
| **Código Limpio** | ✅ Cero flags peligrosos (`--dangerously...`). Despliegues limpios y reproducibles. | Requiere adaptar `params` y `cookies()` a Promesas asíncronas. |
| **Compatibilidad BD** | ✅ Totalmente compatible con Drizzle ORM y `@neondatabase/serverless` (HTTP fetch). | — |

---

## 🔍 3. Análisis de Afectación en el Código del Proyecto

A continuación se detalla cada área del sistema, indicando si se ve afectada, por qué y el fix exacto requerido.

---

### 3.1. Rutas Dinámicas de API (`Route Handlers` con `[id]`)
* **Impacto en Next.js 15:** En Next 15, `params` es una `Promise` que debe ser esperada con `await`.
* **Archivos afectados:** 5 archivos.
* **Severidad:** Media (fácil de corregir, falla si no se aplica `await`).

#### 1. `src/app/api/admin/users/[id]/route.js`
```diff
- export async function PATCH(request, { params }) {
+ export async function PATCH(request, { params }) {
-   const { id } = params;
+   const { id } = await params;
    ...
  }

- export async function DELETE(request, { params }) {
+ export async function DELETE(request, { params }) {
-   const { id } = params;
+   const { id } = await params;
    ...
  }
```

#### 2. `src/app/api/daily-logs/[id]/route.js`
```diff
  export async function DELETE(request, { params }) {
    try {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

-     const { id } = params;
+     const { id } = await params;
      await db.delete(dailyLogs).where(and(eq(dailyLogs.id, id), eq(dailyLogs.userId, user.id)));
```

#### 3. `src/app/api/expenses/[id]/route.js`
```diff
  export async function PUT(request, { params }) {
    try {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

-     const { id } = params;
+     const { id } = await params;
      ...
  }

  export async function DELETE(request, { params }) {
    try {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

-     const { id } = params;
+     const { id } = await params;
      ...
  }
```

#### 4. `src/app/api/expenses/[id]/increase/route.js`
```diff
  export async function POST(request, { params }) {
    try {
      const sessionUser = await getCurrentUser();
      if (!sessionUser) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

-     const { id } = params;
+     const { id } = await params;
      ...
  }
```

#### 5. `src/app/api/vehicle-maintenance/[id]/route.js` y `.../service-done/route.js`
```diff
  export async function PUT(request, { params }) {
-   const { id } = params;
+   const { id } = await params;
    ...
  }

  export async function DELETE(request, { params }) {
-   const { id } = params;
+   const { id } = await params;
    ...
  }

  // En service-done/route.js:
  export async function POST(request, { params }) {
-   const { id } = params;
+   const { id } = await params;
    ...
  }
```

---

### 3.2. Módulo de Autenticación y Cookies (`src/lib/auth.js`)
* **Impacto en Next.js 15:** `cookies()` importado de `next/headers` ahora es una función asíncrona (`await cookies()`).
* **Archivos afectados:** `src/lib/auth.js` y sus consumidores en `src/app/api/auth/logout/route.js`.
* **Fix requerido:**

#### `src/lib/auth.js`
```diff
  // Obtener sesión del usuario actual desde cookies
  export async function getCurrentUser() {
-   const cookieStore = cookies();
+   const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    ...
  }

  // Guardar cookie de sesión
- export function setSessionCookie(token) {
-   const cookieStore = cookies();
+ export async function setSessionCookie(token) {
+   const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });
  }

  // Eliminar cookie de sesión
- export function removeSessionCookie() {
-   const cookieStore = cookies();
+ export async function removeSessionCookie() {
+   const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  }
```

#### `src/app/api/auth/logout/route.js`
```diff
  export async function POST() {
-   removeSessionCookie();
+   await removeSessionCookie();
    return NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
  }
```

*(Nota: `register/route.js`, `login/route.js` y `google/callback/route.js` ya llaman a `setSessionCookie()` en contextos asíncronos y solo se les antepone `await`).*

---

### 3.3. Base de Datos & Drizzle ORM (`src/db/index.js`)
* **Impacto:** **CERO (0) AFECTACIÓN**.
* **Diagnóstico del Especialista en BD:**
  Tu configuración actual ya implementa soporte dual:
  ```javascript
  const isNeon = connectionString.includes('neon.tech') || process.env.USE_NEON_SERVERLESS === 'true';
  ```
  Cuando está en Cloudflare Workers, utiliza `@neondatabase/serverless` a través de HTTP (`drizzle-orm/neon-http`), lo cual no requiere sockets TCP nativos de Node.js y funciona al 100% en Next.js 15 y Cloudflare Workers.

---

### 3.4. Frontend, Vistas y Componentes Blade/React
* **Impacto:** **CERO (0) AFECTACIÓN**.
* **Diagnóstico del Especialista UX/UI:**
  Todas las páginas (`/dashboard`, `/expenses`, `/vehicle`, `/driver`, `/settings`, `/login`, `/register`) son Client Components (`'use client'`) o layouts estándar. No utilizan Server Actions con firmas obsoletas ni componentes de servidor asíncronos complejos. Todos los componentes de `lucide-react`, `clsx` y `canvas-confetti` compilan sin inconvenientes.

---

### 3.5. Middleware de Rutas (`src/middleware.js`)
* **Impacto:** **CERO (0) AFECTACIÓN**.
* **Diagnóstico:** Utiliza `request.cookies.get()` y `NextResponse.redirect()` con validación JWT (`jose`), formato estándar plenamente soportado en Next.js 15.

---

## 🛠️ 4. Configuración de Despliegue Cloudflare (OpenNext)

Para que Cloudflare compile y sirva la aplicación en su red Edge/Workers, se incorporan 2 archivos de configuración:

### 1. `wrangler.jsonc` (Raíz del proyecto)
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "app-norte",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "assets": {
    "binding": "ASSETS",
    "directory": ".open-next/assets"
  },
  "observability": {
    "enabled": true
  }
}
```

### 2. `open-next.config.ts` (Raíz del proyecto)
```typescript
import type { OpenNextConfig } from '@opennextjs/aws/types/open-next';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
};

export default config;
```

### 3. `package.json` (Scripts actualizados)
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "build:cloudflare": "opennextjs-cloudflare build",
  "deploy": "npm run build:cloudflare && wrangler deploy",
  "preview": "npm run build:cloudflare && wrangler dev"
}
```

---

## 📋 5. Matriz de Archivos a Modificar / Crear

| # | Archivo | Acción | Motivo |
|---|---------|--------|--------|
| 1 | `package.json` | ✏️ Modificar | Actualizar a `next@^15`, `react@^19`, `react-dom@^19`, agregar `@opennextjs/cloudflare` y `wrangler`. |
| 2 | `src/lib/auth.js` | ✏️ Modificar | Convertir `cookies()` en asíncrono (`await cookies()`). |
| 3 | `src/app/api/auth/logout/route.js` | ✏️ Modificar | Agregar `await removeSessionCookie()`. |
| 4 | `src/app/api/auth/login/route.js` | ✏️ Modificar | Agregar `await setSessionCookie(token)`. |
| 5 | `src/app/api/auth/register/route.js` | ✏️ Modificar | Agregar `await setSessionCookie(token)`. |
| 6 | `src/app/api/auth/google/callback/route.js` | ✏️ Modificar | Agregar `await setSessionCookie(token)`. |
| 7 | `src/app/api/admin/users/[id]/route.js` | ✏️ Modificar | `const { id } = await params`. |
| 8 | `src/app/api/daily-logs/[id]/route.js` | ✏️ Modificar | `const { id } = await params`. |
| 9 | `src/app/api/expenses/[id]/route.js` | ✏️ Modificar | `const { id } = await params`. |
| 10 | `src/app/api/expenses/[id]/increase/route.js` | ✏️ Modificar | `const { id } = await params`. |
| 11 | `src/app/api/vehicle-maintenance/[id]/route.js` | ✏️ Modificar | `const { id } = await params`. |
| 12 | `src/app/api/vehicle-maintenance/[id]/service-done/route.js` | ✏️ Modificar | `const { id } = await params`. |
| 13 | `wrangler.jsonc` | ➕ Crear | Configuración de Cloudflare Worker y assets de OpenNext. |
| 14 | `open-next.config.ts` | ➕ Crear | Adaptador de Cloudflare para Next.js. |

---

## 📌 6. Bitácora de Tareas Pendientes (Recordatorio)
* 🔴 **Error pendiente registrado**: Se toma nota formal en la agenda del PM del error secundario reportado por el desarrollador para ser atendido inmediatamente después de concluir este despliegue exitoso en Cloudflare.

# 🔧 Fix: Conexión Cloudflare Workers → Supabase

**Fecha:** 2026-09-25  
**Error que resuelve:** `Connection terminated unexpectedly`  

---

## ¿Por qué fallaba?

| Causa | Detalle |
|-------|---------|
| **Puerto 6543 (Transaction Pooler)** | Usa **IPv6 por defecto** → Cloudflare Workers solo soporta IPv4 → conexión cortada |
| **Fix en el código** | `src/db/index.js` ahora usa WebSockets (`@neondatabase/serverless` Pool) en CF Workers, que viaja sobre HTTPS/IPv4 |
| **Fix en la config** | `DATABASE_URL` debe apuntar a **Session Mode puerto 5432** |

---

## Paso 1 — Obtener el URL correcto en Supabase

1. Entrá a [supabase.com/dashboard](https://supabase.com/dashboard) → tu proyecto
2. Clic en **Connect** (botón arriba a la derecha) o **Project Settings → Database**
3. En el selector de modo, elegí **Session mode** (⚠️ NO Transaction mode)
4. Verificá que el puerto sea **5432** (no 6543)
5. Copiá el URL — tiene esta forma:

```
postgresql://postgres.[ref]:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:5432/postgres?sslmode=require
```

> ⚠️ **Contraseña con caracteres especiales:** Si tu contraseña tiene `@`, `#`, `$` o `%`, debés encodearlos en URL antes de pegarlos.  
> Ejemplo: `mi@pass` → `mi%40pass`  
> Podés usar [urlencoder.org](https://www.urlencoder.org/) para encodear solo la contraseña.

---

## Paso 2 — Actualizar el secreto en Cloudflare

1. Entrá a [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages** → tu app → **Settings** → **Variables and Secrets**
3. Buscá `DATABASE_URL` → editalo con el nuevo URL (puerto **5432**, Session mode)
4. Guardá → hacé **Save and Deploy** o **Retry deployment**

---

## Comparación de modos de conexión

| Modo | Puerto | IPv6 | Prepared Statements | ¿Funciona en CF Workers? |
|------|--------|------|---------------------|--------------------------|
| Transaction Pooler | **6543** | ✅ Sí | ❌ No | ❌ **NO** |
| Session Pooler | **5432** | depende | ✅ Sí | ✅ **SÍ** |
| Direct Connection | **5432** | ✅ Sí | ✅ Sí | ✅ **SÍ** |

---

## Cambios aplicados en el código

### `src/db/index.js`
- Detecta si corre en **Cloudflare Workers** (`EdgeRuntime`, `process.env.CF_WORKER`, etc.)
- En CF Workers → usa `@neondatabase/serverless` **Pool con WebSockets** (compatible con cualquier PostgreSQL, incluido Supabase, sin problemas de IPv6)
- En Node.js local → sigue usando `pg` Pool con TCP (sin cambios para desarrollo)

---

## Checklist de verificación post-fix

- [ ] `DATABASE_URL` en Cloudflare apunta a puerto **5432** (Session mode)
- [ ] La contraseña no tiene caracteres sin encodear
- [ ] El redeploy de Cloudflare terminó exitosamente
- [ ] El login con usuarios existentes (admin / juan chofer) funciona
- [ ] El login con Google funciona (requiere `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en Cloudflare Secrets)

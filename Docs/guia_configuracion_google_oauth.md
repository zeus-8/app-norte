# 🌐 Guía: Configuración de Google OAuth 2.0 (Gmail Login)

**Proyecto:** AutoGastos SaaS  
**Fecha:** 2026-09-17  
**Ubicación:** `Docs/guia_configuracion_google_oauth.md`

Esta guía detalla los pasos para crear tu **Client ID** y **Client Secret** gratuitos en Google Cloud Console para habilitar el botón "Continuar con Google" tanto en tu entorno local (`localhost:3000`) como en producción (`tu-dominio.pages.dev`).

---

## 🛠️ Paso 1: Crear un Proyecto en Google Cloud Console

1. Ingresa a [Google Cloud Console](https://console.cloud.google.com/).
2. Inicia sesión con tu cuenta de Google / Gmail.
3. En la barra superior, haz clic en el selector de proyectos y luego en **"Nuevo Proyecto"**.
4. Nómbralo: `AutoGastos SaaS` (o el nombre que prefieras) y pulsa **Crear**.

---

## 🔐 Paso 2: Configurar la Pantalla de Consentimiento OAuth

1. En el menú lateral izquierdo, ve a **APIs y Servicios** > **Pantalla de consentimiento de OAuth**.
2. Selecciona **Tipo de usuario: Externo** y pulsa **Crear**.
3. Completa los campos básicos:
   - **Nombre de la aplicación:** `AutoGastos`
   - **Correo de asistencia del usuario:** Tu correo de Gmail.
   - **Logotipo de la aplicación:** *(Opcional)*
   - **Datos de contacto del desarrollador:** Tu correo de Gmail.
4. Pulsa **Guardar y continuar**.
5. En la sección **Permisos (Scopes)**, pulsa **"Agregar o quitar permisos"**, marca:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
6. Pulsa **Guardar y continuar**.
7. En la sección **Usuarios de prueba (Test users)**, agrega tu propio correo de Gmail (ej. `juan@gmail.com`) y el de las personas que probarán en desarrollo.
8. Pulsa **Guardar y continuar**.

---

## 🔑 Paso 3: Crear las Credenciales OAuth 2.0

1. En el menú lateral izquierdo, ve a **APIs y Servicios** > **Credenciales**.
2. Haz clic en **+ Crear credenciales** > **ID de cliente de OAuth**.
3. En **Tipo de aplicación**, selecciona: **Aplicación web**.
4. **Nombre:** `AutoGastos Web Client`.
5. En **Orígenes de JavaScript autorizados**, añade:
   - `http://localhost:3000`
   - *(En producción añadirás también: `https://tu-dominio.pages.dev`)*
6. En **URIs de redireccionamiento autorizados**, añade:
   - `http://localhost:3000/api/auth/google/callback`
   - *(En producción añadirás también: `https://tu-dominio.pages.dev/api/auth/google/callback`)*
7. Haz clic en **Crear**.
8. Te aparecerá una ventana emergente con:
   - **Tu ID de cliente:** `1234567890-abc123xyz.apps.googleusercontent.com`
   - **El secreto de cliente:** `GOCSPX-abc123xyz456...`

---

## ⚙️ Paso 4: Cargar las variables en tu `.env.local`

Abre tu archivo [`.env.local`](file:///c:/Users/user/Desktop/app-norte2.0/.env.local) y añade las claves:

```env
GOOGLE_CLIENT_ID=1234567890-abc123xyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz456...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

¡Y listo! Al pulsar **"Continuar con Google"** en la web, el sistema te identificará con tu cuenta de Gmail en 1 solo clic.

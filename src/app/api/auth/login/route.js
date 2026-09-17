import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth.js';
import { loginSchema } from '@/lib/validations.js';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validación con Zod
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Datos de inicio de sesión inválidos';
      return NextResponse.json({ error: firstError, details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password } = validation.data;

    // Buscar usuario por correo
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user) {
      return NextResponse.json({ error: 'Correo electrónico o contraseña incorrectos' }, { status: 401 });
    }

    // Verificar contraseña
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Correo electrónico o contraseña incorrectos' }, { status: 401 });
    }

    // Verificar estado de suscripción
    if (user.subscriptionStatus === 'suspended') {
      return NextResponse.json({ error: 'Tu cuenta se encuentra suspendida. Contacta al administrador' }, { status: 403 });
    }

    // Crear token de sesión
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Guardar cookie httpOnly
    setSessionCookie(token);

    const { passwordHash, ...userSafe } = user;
    return NextResponse.json({ success: true, user: userSafe });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({ error: 'Error interno del servidor al iniciar sesión' }, { status: 500 });
  }
}

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super_secreto_para_firmar_tokens_jwt_saas_2026_autogastos'
);

const COOKIE_NAME = 'autogastos_session';

// Hashear contraseña
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Comparar contraseña
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generar Token JWT firmado
export async function createSessionToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

// Verificar y decodificar Token JWT
export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// Obtener sesión del usuario actual desde cookies
export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload || !payload.id) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.id),
  });

  if (!user) return null;

  // Devolver usuario sin passwordHash
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export const getUserFromSession = getCurrentUser;

// Guardar cookie de sesión
export function setSessionCookie(token) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
}

// Eliminar cookie de sesión
export function removeSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users, vehicleMaintenance, userSettings } from '@/db/schema.js';
import { getCurrentUser, hashPassword } from '@/lib/auth.js';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado: se requieren permisos de administrador' }, { status: 403 });
    }

    const allUsers = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    const safeUsers = allUsers.map(u => {
      const { passwordHash: _, ...safe } = u;
      return safe;
    });

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users in admin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, driverType, subscriptionStatus, moduleDriver, moduleExpenses, moduleVehicle } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nombre, correo y contraseña requeridos' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con este correo' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const [newUser] = await db.insert(users).values({
      name,
      email: cleanEmail,
      passwordHash,
      role: role || 'user',
      driverType: driverType || 'owner',
      subscriptionStatus: subscriptionStatus || 'active',
      moduleDriver: moduleDriver !== undefined ? moduleDriver : true,
      moduleExpenses: moduleExpenses !== undefined ? moduleExpenses : true,
      moduleVehicle: moduleVehicle !== undefined ? moduleVehicle : true,
    }).returning();

    // Odómetro base
    await db.insert(userSettings).values({
      userId: newUser.id,
      key: 'current_odometer',
      value: '145000',
    });

    const { passwordHash: _, ...safe } = newUser;
    return NextResponse.json({ success: true, user: safe });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

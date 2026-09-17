import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { households, householdMembers, users } from '@/db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Buscar membresías del usuario
    const userMemberships = await db
      .select({
        membershipId: householdMembers.id,
        householdId: householdMembers.householdId,
        defaultSharePct: householdMembers.defaultSharePct,
        status: householdMembers.status,
        householdName: households.name,
        createdBy: households.createdBy,
      })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(eq(householdMembers.userId, sessionUser.id));

    if (userMemberships.length === 0) {
      return NextResponse.json({ household: null, pendingInvitations: [] });
    }

    const activeMembership = userMemberships.find(m => m.status === 'accepted');
    const pendingInvitations = userMemberships.filter(m => m.status === 'pending');

    if (!activeMembership) {
      return NextResponse.json({ household: null, pendingInvitations });
    }

    // 2. Obtener todos los miembros del hogar activo
    const allMembers = await db
      .select({
        memberId: householdMembers.id,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        avatarUrl: users.avatarUrl,
        defaultSharePct: householdMembers.defaultSharePct,
        status: householdMembers.status,
      })
      .from(householdMembers)
      .innerJoin(users, eq(householdMembers.userId, users.id))
      .where(eq(householdMembers.householdId, activeMembership.householdId));

    return NextResponse.json({
      household: {
        id: activeMembership.householdId,
        name: activeMembership.householdName,
        createdBy: activeMembership.createdBy,
        isCreator: activeMembership.createdBy === sessionUser.id,
        userSharePct: activeMembership.defaultSharePct,
        members: allMembers,
      },
      pendingInvitations,
    });
  } catch (error) {
    console.error('Error al obtener hogar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, partnerEmail, userSharePct = '60.00', partnerSharePct = '40.00' } = body;

    if (!name || !partnerEmail) {
      return NextResponse.json({ error: 'Nombre del hogar y correo de la pareja son obligatorios' }, { status: 400 });
    }

    const normalizedPartnerEmail = partnerEmail.trim().toLowerCase();

    if (normalizedPartnerEmail === sessionUser.email.toLowerCase()) {
      return NextResponse.json({ error: 'No puedes invitarte a ti mismo' }, { status: 400 });
    }

    // Buscar si el usuario pareja ya existe en el sistema
    const [partnerUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedPartnerEmail))
      .limit(1);

    if (!partnerUser) {
      return NextResponse.json({
        error: `No encontramos una cuenta con el correo ${normalizedPartnerEmail}. Pídele a tu pareja que se registre primero en AutoGastos (o con Google).`
      }, { status: 404 });
    }

    // 1. Crear el Hogar
    const [newHousehold] = await db
      .insert(households)
      .values({
        name: name.trim(),
        createdBy: sessionUser.id,
      })
      .returning();

    // 2. Agregar al creador como miembro 'accepted'
    await db.insert(householdMembers).values({
      householdId: newHousehold.id,
      userId: sessionUser.id,
      defaultSharePct: String(Number(userSharePct) || 60),
      status: 'accepted',
    });

    // 3. Agregar a la pareja con invitación 'pending'
    await db.insert(householdMembers).values({
      householdId: newHousehold.id,
      userId: partnerUser.id,
      defaultSharePct: String(Number(partnerSharePct) || 40),
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: `¡Hogar creado! Se envió la invitación a ${partnerUser.name} (${partnerUser.email}).`,
      householdId: newHousehold.id,
    });
  } catch (error) {
    console.error('Error al crear hogar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

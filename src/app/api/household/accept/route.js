import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { householdMembers } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { householdId, action } = body; // action: 'accept' | 'decline'

    if (!householdId) {
      return NextResponse.json({ error: 'householdId es requerido' }, { status: 400 });
    }

    if (action === 'accept') {
      await db
        .update(householdMembers)
        .set({
          status: 'accepted',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(householdMembers.householdId, householdId),
            eq(householdMembers.userId, sessionUser.id)
          )
        );

      return NextResponse.json({
        success: true,
        message: '¡Invitación aceptada! Ahora compartes los gastos del hogar.'
      });
    } else if (action === 'decline') {
      await db
        .delete(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, householdId),
            eq(householdMembers.userId, sessionUser.id)
          )
        );

      return NextResponse.json({
        success: true,
        message: 'Invitación rechazada.'
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error al responder invitación de hogar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

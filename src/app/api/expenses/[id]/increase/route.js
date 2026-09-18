import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { expenses } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

function getPreviousMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  let prevY = y;
  let prevM = m - 1;
  if (prevM < 1) {
    prevM = 12;
    prevY--;
  }
  return `${prevY}-${String(prevM).padStart(2, '0')}`;
}

export async function POST(request, { params }) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newAmount, effectiveMonth, notes } = body;

    if (!newAmount || !effectiveMonth) {
      return NextResponse.json({ error: 'Monto y mes de vigencia son obligatorios' }, { status: 400 });
    }

    // 1. Obtener gasto original
    const [original] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (!original) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    const prevMonth = getPreviousMonth(effectiveMonth);

    // 2. Cerrar la vigencia del período anterior
    await db
      .update(expenses)
      .set({
        endMonth: prevMonth,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id));

    // 3. Crear el nuevo registro con el monto actualizado a partir de effectiveMonth
    const [newExpense] = await db
      .insert(expenses)
      .values({
        userId: original.userId,
        householdId: original.householdId,
        name: original.name,
        category: original.category,
        type: original.type,
        totalAmount: String(newAmount),
        installmentCount: original.installmentCount,
        installmentAmount: String(newAmount),
        startMonth: effectiveMonth,
        endMonth: null, // Vigente indefinidamente
        isShared: original.isShared,
        userSharePct: original.userSharePct,
        paymentMethod: original.paymentMethod,
        status: 'active',
        notes: notes || `Aumento aplicado desde ${effectiveMonth} (Anterior: $${original.installmentAmount})`,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: `¡Aumento registrado! Desde ${effectiveMonth} el valor es $${Number(newAmount).toLocaleString('es-AR')}. Los meses anteriores se mantendrán con su valor histórico.`,
      newExpense,
    });
  } catch (error) {
    console.error('Error al aplicar aumento de gasto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

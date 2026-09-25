import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { appAdvances } from '@/db/schema.js';
import { getCurrentUser } from '@/lib/auth.js';
import { eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const advances = await db.query.appAdvances.findMany({
      where: and(
        eq(appAdvances.userId, user.id),
        eq(appAdvances.month, month)
      ),
      with: {
        expense: true,
      },
      orderBy: (adv, { desc }) => [desc(adv.date), desc(adv.createdAt)],
    });

    let totalAdvances = 0;
    const byApp = {};

    for (const adv of advances) {
      const amt = Number(adv.amount) || 0;
      totalAdvances += amt;
      const appKey = (adv.app || 'general').toLowerCase();
      byApp[appKey] = (byApp[appKey] || 0) + amt;
    }

    return NextResponse.json({
      advances,
      totalAdvances,
      byApp,
      month,
    });
  } catch (error) {
    console.error('Error al obtener adelantos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { app, amount, date, destination, expenseId, notes } = body;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: 'El monto del adelanto debe ser mayor a 0' }, { status: 400 });
    }

    const cleanDate = (date || new Date().toISOString().slice(0, 10)).trim();
    const month = cleanDate.slice(0, 7);

    const [newAdvance] = await db.insert(appAdvances).values({
      userId: user.id,
      app: (app || 'uber').toLowerCase(),
      amount: numAmount.toFixed(2),
      date: cleanDate,
      month,
      destination: destination || 'Mercado Pago',
      expenseId: expenseId || null,
      notes: notes ? notes.trim() : null,
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Adelanto registrado correctamente',
      advance: newAdvance,
    });
  } catch (error) {
    console.error('Error al guardar adelanto:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

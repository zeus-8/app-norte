import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { cashReconciliations, expenses, expensePayments, appAdvances } from '@/db/schema.js';
import { getCurrentUser } from '@/lib/auth.js';
import { getUserFinancialSummary } from '@/lib/summary.js';
import { eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // 1. Obtener balance financiero del mes
    const summary = await getUserFinancialSummary(user.id, targetMonth);
    const { netIncome, totalPaidObligations } = summary;

    // 2. Obtener adelantos registrados en el mes
    const advances = await db.query.appAdvances.findMany({
      where: and(
        eq(appAdvances.userId, user.id),
        eq(appAdvances.month, targetMonth)
      ),
    });
    const totalAdvances = advances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);

    // 3. Obtener reconciliaciones previas del mes
    const reconciliations = await db.query.cashReconciliations.findMany({
      where: and(
        eq(cashReconciliations.userId, user.id),
        eq(cashReconciliations.month, targetMonth)
      ),
      orderBy: (cr, { desc }) => [desc(cr.date), desc(cr.createdAt)],
    });

    // Sumar extracciones a ahorro y ajustes directos anteriores
    let totalSavingsTransfers = 0;
    let totalDirectAdjustments = 0;

    for (const rec of reconciliations) {
      const adjAmt = Number(rec.adjustmentAmount) || 0;
      if (rec.adjustmentType === 'savings_transfer') {
        totalSavingsTransfers += adjAmt;
      } else if (rec.adjustmentType === 'direct_adjustment') {
        totalDirectAdjustments += adjAmt;
      }
    }

    // Saldo teórico disponible en mano/cuentas:
    // Ingresos netos de jornadas - gastos pagados del mes - transferencias a ahorro + ajustes directos
    const theoreticalBalance = Math.round(netIncome - totalPaidObligations - totalSavingsTransfers + totalDirectAdjustments);

    return NextResponse.json({
      month: targetMonth,
      netIncome,
      totalPaidObligations,
      totalAdvances,
      totalSavingsTransfers,
      totalDirectAdjustments,
      theoreticalBalance,
      pendingAppBalances: summary.cashFlow?.pendingAppBalances || {},
      totalPendingApps: Object.values(summary.cashFlow?.pendingAppBalances || {}).reduce((a, b) => a + Number(b || 0), 0),
      reconciliations,
      latestReconciliation: reconciliations[0] || null,
    });
  } catch (error) {
    console.error('Error al obtener conciliación de caja:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const {
      date,
      realCash,
      realBank,
      realApps = 0,
      theoreticalBalance,
      difference,
      adjustmentType = 'none',
      adjustmentAmount = 0,
      notes,
      expenseName,
      expenseCategory,
    } = body;

    const cleanDate = (date || new Date().toISOString().slice(0, 10)).trim();
    const month = cleanDate.slice(0, 7);

    const cashNum = parseFloat(realCash) || 0;
    const bankNum = parseFloat(realBank) || 0;
    const appsNum = parseFloat(realApps) || 0;
    const totalRealNum = cashNum + bankNum + appsNum;
    const theoNum = parseFloat(theoreticalBalance) || 0;
    const diffNum = parseFloat(difference) || (totalRealNum - theoNum);
    const adjAmtNum = parseFloat(adjustmentAmount) || 0;

    // Si el usuario eligió "Registrar como gasto no anotado", creamos el gasto y lo marcamos pagado
    if (adjustmentType === 'unrecorded_expense' && adjAmtNum > 0) {
      const dueDay = parseInt(cleanDate.slice(8, 10), 10) || 5;
      const [newExpense] = await db.insert(expenses).values({
        userId: user.id,
        name: expenseName ? expenseName.trim() : 'Gasto no anotado (Arqueo)',
        category: expenseCategory || 'Varios / Otros',
        type: 'one_time',
        totalAmount: adjAmtNum.toFixed(2),
        installmentCount: 1,
        installmentAmount: adjAmtNum.toFixed(2),
        startMonth: month,
        endMonth: month,
        dueDay,
        isShared: false,
        userSharePct: '100',
        paymentMethod: cashNum > bankNum ? 'Efectivo' : 'Débito / Transferencia',
        status: 'paid',
        notes: `Generado automáticamente desde Arqueo de Caja el ${cleanDate}. ${notes || ''}`.trim(),
      }).returning();

      if (newExpense) {
        await db.insert(expensePayments).values({
          expenseId: newExpense.id,
          userId: user.id,
          month,
          isPaid: true,
          paidAt: new Date(),
          notes: 'Pagado en arqueo de caja',
        });
      }
    }

    // Insertar el arqueo en la tabla cash_reconciliations
    const [newRec] = await db.insert(cashReconciliations).values({
      userId: user.id,
      date: cleanDate,
      month,
      theoreticalBalance: theoNum.toFixed(2),
      realCash: cashNum.toFixed(2),
      realBank: bankNum.toFixed(2),
      realApps: appsNum.toFixed(2),
      totalReal: totalRealNum.toFixed(2),
      difference: diffNum.toFixed(2),
      adjustmentType,
      adjustmentAmount: adjAmtNum.toFixed(2),
      notes: notes ? notes.trim() : null,
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Arqueo de caja registrado correctamente',
      reconciliation: newRec,
    });
  } catch (error) {
    console.error('Error al registrar arqueo de caja:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

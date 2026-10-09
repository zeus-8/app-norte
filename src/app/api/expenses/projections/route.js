import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { expenses, households, householdMembers } from '@/db/schema.js';
import { eq, and, ne, or, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

function getMonthDiff(startStr, currentStr) {
  const [startY, startM] = startStr.split('-').map(Number);
  const [currY, currM] = currentStr.split('-').map(Number);
  return (currY - startY) * 12 + (currM - startM);
}

function addMonths(startStr, count) {
  const [year, month] = startStr.split('-').map(Number);
  const date = new Date(year, month - 1 + count, 1);
  const y = date.getFullYear();;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Proyección de obligaciones a 12 meses.
 *
 * Los tres cubos son MUTUAMENTE EXCLUYENTES — sin doble conteo:
 *
 *   userPersonal   → gastos fixed/one_time que son 100% tuyos (sin hogar compartido)
 *   userInstallments → cuotas 100% tuyas (sin hogar compartido)
 *   userHousehold  → tu parte de TODO lo del hogar (cualquier tipo: fixed, installment, etc.)
 *
 *   totalUser = userPersonal + userInstallments + userHousehold
 */
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('start_month') || new Date().toISOString().slice(0, 7);
    const monthsCount = parseInt(searchParams.get('months') || '12', 10);

    // ── Membresías de hogar aceptadas ──────────────────────────────────────
    const memberships = await db
      .select({
        householdId: householdMembers.householdId,
        defaultSharePct: householdMembers.defaultSharePct,
        householdName: households.name,
      })
      .from(householdMembers)
      .leftJoin(households, eq(householdMembers.householdId, households.id))
      .where(
        and(
          eq(householdMembers.userId, user.id),
          eq(householdMembers.status, 'accepted')
        )
      );

    const householdMap = {};
    const householdIds = [];
    memberships.forEach(m => {
      householdMap[m.householdId] = {
        pct: Number(m.defaultSharePct) || 50,
        name: m.householdName || 'Hogar Compartido',
      };
      householdIds.push(m.householdId);
    });

    // ── Gastos propios + del hogar (no cancelados) ─────────────────────────
    let allExpenses = [];
    if (householdIds.length > 0) {
      allExpenses = await db.query.expenses.findMany({
        where: and(
          ne(expenses.status, 'cancelled'),
          or(
            eq(expenses.userId, user.id),
            inArray(expenses.householdId, householdIds)
          )
        ),
      });
    } else {
      allExpenses = await db.query.expenses.findMany({
        where: and(
          eq(expenses.userId, user.id),
          ne(expenses.status, 'cancelled')
        ),
      });
    }

    // ── Proyección mes a mes ───────────────────────────────────────────────
    const projections = [];

    for (let i = 0; i < monthsCount; i++) {
      const monthStr = addMonths(startMonth, i);

      // Tres cubos sin solapamiento
      let userPersonal = 0;        // fijos/únicos 100% míos
      let userInstallments = 0;    // cuotas 100% mías
      let userHousehold = 0;       // mi parte del hogar (cualquier tipo)

      const activeInstallmentsList = [];

      for (const exp of allExpenses) {
        let isApplicable = false;
        let currentInstNum = 1;

        if (exp.type === 'fixed' && monthStr >= exp.startMonth) {
          isApplicable = true;
        } else if (exp.type === 'one_time' && monthStr === exp.startMonth) {
          isApplicable = true;
        } else if (exp.type === 'installment') {
          const diff = getMonthDiff(exp.startMonth, monthStr);
          if (diff >= 0 && diff < exp.installmentCount) {
            isApplicable = true;
            currentInstNum = diff + 1;
          }
        }

        if (!isApplicable) continue;

        const monthlyAmount = Number(exp.installmentAmount) || 0;

        // ¿Es gasto del hogar compartido?
        const isHousehold = Boolean(exp.householdId || exp.isShared);

        // Calcular porcentaje del usuario
        let userPct = 100;
        if (exp.householdId && householdMap[exp.householdId]) {
          userPct = householdMap[exp.householdId].pct;
        } else if (exp.isShared && exp.userSharePct !== null && exp.userSharePct !== undefined) {
          userPct = Number(exp.userSharePct);
        }

        const share = Math.round(monthlyAmount * (userPct / 100));

        if (isHousehold) {
          // ─ Cubo Hogar: toda la parte del hogar va aquí, sin importar el tipo ─
          userHousehold += share;

          // Cuotas del hogar también aparecen en la lista de cuotas activas (informativo)
          if (exp.type === 'installment') {
            activeInstallmentsList.push({
              id: exp.id,
              name: exp.name,
              payment_method: exp.paymentMethod,
              current_num: currentInstNum,
              total_count: exp.installmentCount,
              monthly_amount: monthlyAmount,
              is_last_installment: currentInstNum === exp.installmentCount,
              is_household: true,
            });
          }
        } else {
          // ─ Gastos 100% propios ─
          if (exp.type === 'installment') {
            userInstallments += share;
            activeInstallmentsList.push({
              id: exp.id,
              name: exp.name,
              payment_method: exp.paymentMethod,
              current_num: currentInstNum,
              total_count: exp.installmentCount,
              monthly_amount: monthlyAmount,
              is_last_installment: currentInstNum === exp.installmentCount,
              is_household: false,
            });
          } else {
            // fixed o one_time 100% propios
            userPersonal += share;
          }
        }
      }

      const totalUser = userPersonal + userInstallments + userHousehold;

      projections.push({
        month: monthStr,
        userPersonal,       // fijos/únicos 100% propios
        userInstallments,   // cuotas 100% propias
        userHousehold,      // mi parte del hogar
        totalUser,
        activeInstallmentsCount: activeInstallmentsList.filter(x => !x.is_household).length,
        installments: activeInstallmentsList,
      });
    }

    return NextResponse.json(projections);
  } catch (error) {
    console.error('Error generating projections:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

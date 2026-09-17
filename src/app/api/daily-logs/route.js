import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { dailyLogs, userSettings } from '@/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { dailyLogSchema } from '@/lib/validations.js';

export const dynamic = 'force-dynamic';

// GET: Obtener jornadas de un mes específico (ej: ?month=2026-03)
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // Consulta filtrada por usuario y mes
    const logs = await db.query.dailyLogs.findMany({
      where: and(
        eq(dailyLogs.userId, user.id),
        sql`SUBSTRING(${dailyLogs.date}, 1, 7) = ${month}`
      ),
      orderBy: (dailyLogs, { desc }) => [desc(dailyLogs.date)],
    });

    let totalGross = 0;
    let totalFuel = 0;
    let totalOther = 0;
    let totalMinutes = 0;
    let totalTrips = 0;

    const logsWithComputed = logs.map(log => {
      const gross = Number(log.grossIncome) || 0;
      const fuel = Number(log.fuelExpense) || 0;
      const other = Number(log.otherExpense) || 0;
      const netProfit = gross - fuel - other;

      totalGross += gross;
      totalFuel += fuel;
      totalOther += other;
      totalMinutes += (log.minutesWorked || 0);
      totalTrips += (log.tripsCount || 0);

      const hoursFormatted = `${Math.floor(log.minutesWorked / 60)}h ${log.minutesWorked % 60}m`;
      const hourlyRate = log.minutesWorked > 0 ? Math.round(netProfit / (log.minutesWorked / 60)) : 0;

      return {
        ...log,
        net_profit: netProfit,
        hours_formatted: hoursFormatted,
        hourly_rate: hourlyRate,
      };
    });

    const totalNet = totalGross - totalFuel - totalOther;
    const daysWorked = logs.length;
    const avgNetPerDay = daysWorked > 0 ? Math.round(totalNet / daysWorked) : 0;
    const avgGrossPerDay = daysWorked > 0 ? Math.round(totalGross / daysWorked) : 0;
    const totalHours = Number((totalMinutes / 60).toFixed(1));

    return NextResponse.json({
      month,
      logs: logsWithComputed,
      summary: {
        totalGross,
        totalFuel,
        totalOther,
        totalNet,
        daysWorked,
        totalMinutes,
        totalHours,
        totalTrips,
        avgNetPerDay,
        avgGrossPerDay,
        fuelRatioPct: totalGross > 0 ? Number(((totalFuel / totalGross) * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching daily logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear o actualizar una jornada diaria multiapp
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    
    // Validar con Zod
    const validation = dailyLogSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Datos de jornada inválidos';
      return NextResponse.json({ error: firstError, details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { date, grossIncome, appBreakdown, fuelExpense, otherExpense, odometerKm, hoursWorked, minutesWorked, tripsCount, notes } = validation.data;
    const totalMinutes = (hoursWorked * 60) + minutesWorked;

    const existing = body.id 
      ? await db.query.dailyLogs.findFirst({ where: and(eq(dailyLogs.id, body.id), eq(dailyLogs.userId, user.id)) })
      : await db.query.dailyLogs.findFirst({ where: and(eq(dailyLogs.date, date), eq(dailyLogs.userId, user.id)) });

    if (existing) {
      await db.update(dailyLogs).set({
        date,
        grossIncome: String(grossIncome),
        appBreakdown,
        fuelExpense: String(fuelExpense),
        otherExpense: String(otherExpense),
        odometerKm,
        minutesWorked: totalMinutes,
        tripsCount,
        notes,
        updatedAt: new Date(),
      }).where(eq(dailyLogs.id, existing.id));
    } else {
      await db.insert(dailyLogs).values({
        userId: user.id,
        date,
        grossIncome: String(grossIncome),
        appBreakdown,
        fuelExpense: String(fuelExpense),
        otherExpense: String(otherExpense),
        odometerKm,
        minutesWorked: totalMinutes,
        tripsCount,
        notes,
      });
    }

    // Actualizar odómetro en settings si es mayor
    if (odometerKm > 0) {
      const currentOdoSetting = await db.query.userSettings.findFirst({
        where: and(eq(userSettings.userId, user.id), eq(userSettings.key, 'current_odometer')),
      });
      const currentOdo = currentOdoSetting ? parseInt(currentOdoSetting.value, 10) : 0;
      if (odometerKm > currentOdo) {
        await db.insert(userSettings).values({
          userId: user.id,
          key: 'current_odometer',
          value: String(odometerKm),
        }).onConflictDoUpdate({
          target: [userSettings.userId, userSettings.key],
          set: { value: String(odometerKm), updatedAt: new Date() },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Jornada guardada correctamente' });
  } catch (error) {
    console.error('Error saving daily log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

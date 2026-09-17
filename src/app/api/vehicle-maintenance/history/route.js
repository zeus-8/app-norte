import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { maintenanceHistory } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const history = await db.query.maintenanceHistory.findMany({
      where: eq(maintenanceHistory.userId, user.id),
      orderBy: (maintenanceHistory, { desc }) => [desc(maintenanceHistory.serviceDate), desc(maintenanceHistory.createdAt)],
    });

    const mapped = history.map(h => ({
      ...h,
      service_date: h.serviceDate,
      service_km: h.serviceKm,
      cost_paid: Number(h.costPaid),
      maintenance_name: h.maintenanceName,
      workshop_notes: h.workshopNotes,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

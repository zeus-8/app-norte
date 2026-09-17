import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users, dailyLogs, expenses } from '@/db/schema.js';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado: se requieren permisos de administrador' }, { status: 403 });
    }

    const allUsers = await db.query.users.findMany();
    const allLogs = await db.query.dailyLogs.findMany();
    const allExpenses = await db.query.expenses.findMany();

    const totalUsers = allUsers.length;
    const activeSubscribers = allUsers.filter(u => u.subscriptionStatus === 'active').length;
    const trialSubscribers = allUsers.filter(u => u.subscriptionStatus === 'trial').length;
    const suspendedSubscribers = allUsers.filter(u => u.subscriptionStatus === 'suspended').length;

    const ownersCount = allUsers.filter(u => u.driverType === 'owner').length;
    const rentersCount = allUsers.filter(u => u.driverType === 'renter').length;

    const driverModuleCount = allUsers.filter(u => u.moduleDriver).length;
    const expensesModuleCount = allUsers.filter(u => u.moduleExpenses).length;
    const vehicleModuleCount = allUsers.filter(u => u.moduleVehicle).length;

    return NextResponse.json({
      totalUsers,
      activeSubscribers,
      trialSubscribers,
      suspendedSubscribers,
      ownersCount,
      rentersCount,
      driverModuleCount,
      expensesModuleCount,
      vehicleModuleCount,
      totalDailyLogsRecorded: allLogs.length,
      totalExpensesRecorded: allExpenses.length,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

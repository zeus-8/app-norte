import { db } from '@/db/index.js';
import { dailyLogs, maintenanceHistory, userSettings } from '@/db/schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Sincroniza y recalcula el odómetro actual del usuario (current_odometer).
 * 
 * Regla de negocio:
 * El odómetro actual del vehículo debe ser el valor MÁXIMO registrado entre:
 * 1. Todas las jornadas diarias activas del usuario (daily_logs.odometer_km).
 * 2. Todos los services completados en el historial (maintenance_history.service_km).
 * 
 * Si se elimina o edita una jornada, esta función recalcula inmediatamente
 * el odómetro real hacia atrás para evitar distorsiones en los semáforos
 * preventivos de mantenimiento (VTV, GNC, Aceite) y provisión de fondos.
 * 
 * @param {string} userId UUID del usuario
 * @returns {Promise<number>} Odómetro recalculado
 */
export async function syncUserOdometer(userId) {
  try {
    // 1. Obtener el máximo odómetro de las jornadas activas del usuario
    const [maxLog] = await db
      .select({
        maxOdo: sql`COALESCE(MAX(${dailyLogs.odometerKm}), 0)`,
      })
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, userId));

    // 2. Obtener el máximo kilometraje de los services registrados
    const [maxService] = await db
      .select({
        maxKm: sql`COALESCE(MAX(${maintenanceHistory.serviceKm}), 0)`,
      })
      .from(maintenanceHistory)
      .where(eq(maintenanceHistory.userId, userId));

    const maxFromLogs = Number(maxLog?.maxOdo) || 0;
    const maxFromServices = Number(maxService?.maxKm) || 0;
    const calculatedMax = Math.max(maxFromLogs, maxFromServices);

    if (calculatedMax > 0) {
      await db
        .insert(userSettings)
        .values({
          userId,
          key: 'current_odometer',
          value: String(calculatedMax),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userSettings.userId, userSettings.key],
          set: {
            value: String(calculatedMax),
            updatedAt: new Date(),
          },
        });

      return calculatedMax;
    }

    return 0;
  } catch (error) {
    console.error('Error al sincronizar odómetro del usuario:', error);
    return 0;
  }
}

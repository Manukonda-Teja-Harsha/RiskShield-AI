/**
 * RiskShield AI — Brand Monitor Repository
 * Manages database-backed scheduling records, atomic lease acquisition,
 * and concurrency locks for automated threat intelligence runs.
 */
import { prisma } from '../lib/db/prisma';

export interface BrandMonitorScheduleRecord {
  id: string;
  brandId: string;
  enabled: boolean;
  frequencyHours: number;
  status: string;
  lastRunAt: Date | null;
  nextRunAt: Date;
  lockedUntil: Date | null;
  lockedBy: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  lastFindingsFound: number;
  lastAssetsScanned: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BrandMonitorRepository {
  private get model() {
    return (prisma as any).brandMonitorSchedule;
  }

  async findByBrandId(brandId: string): Promise<BrandMonitorScheduleRecord | null> {
    return this.model.findUnique({
      where: { brandId }
    });
  }

  async upsertSchedule(
    brandId: string,
    data: {
      enabled?: boolean;
      frequencyHours?: number;
      nextRunAt?: Date;
    }
  ): Promise<BrandMonitorScheduleRecord> {
    const existing = await this.findByBrandId(brandId);

    if (existing) {
      return this.model.update({
        where: { brandId },
        data: {
          enabled: data.enabled !== undefined ? data.enabled : existing.enabled,
          frequencyHours: data.frequencyHours !== undefined ? data.frequencyHours : existing.frequencyHours,
          nextRunAt: data.nextRunAt !== undefined ? data.nextRunAt : existing.nextRunAt,
          updatedAt: new Date()
        }
      });
    }

    return this.model.create({
      data: {
        brandId,
        enabled: data.enabled ?? false,
        frequencyHours: data.frequencyHours ?? 24,
        status: 'IDLE',
        nextRunAt: data.nextRunAt ?? new Date()
      }
    });
  }

  /**
   * Atomically acquires an execution lease for a specific brand schedule.
   * Prevents concurrent duplicate runs across parallel worker invocations.
   */
  async acquireLease(brandId: string, workerId: string, leaseDurationMs = 120000): Promise<boolean> {
    const lockExpiry = new Date(Date.now() + leaseDurationMs);

    // Atomic update: only claim if unlocked or existing lease has expired (worker crash recovery)
    const result = await (prisma as any).$executeRawUnsafe(
      `
      UPDATE "brand_monitor_schedules"
      SET "lockedUntil" = $1, "lockedBy" = $2, "status" = 'RUNNING', "updatedAt" = NOW()
      WHERE "brandId" = $3::uuid
        AND ("lockedUntil" IS NULL OR "lockedUntil" < NOW())
      `,
      lockExpiry,
      workerId,
      brandId
    );

    return result > 0;
  }

  /**
   * Atomically acquires eligible schedules whose nextRunAt has passed and are unlocked.
   */
  async acquireEligibleSchedules(
    batchSize = 5,
    workerId: string,
    leaseDurationMs = 120000
  ): Promise<BrandMonitorScheduleRecord[]> {
    const lockExpiry = new Date(Date.now() + leaseDurationMs);

    // Select candidate IDs
    const candidates = (await (prisma as any).$queryRawUnsafe(
      `
      SELECT "id", "brandId"
      FROM "brand_monitor_schedules"
      WHERE "enabled" = TRUE
        AND "nextRunAt" <= NOW()
        AND ("lockedUntil" IS NULL OR "lockedUntil" < NOW())
      ORDER BY "nextRunAt" ASC
      LIMIT $1
      `,
      batchSize
    )) as Array<{ id: string; brandId: string }>;

    if (!candidates || candidates.length === 0) {
      return [];
    }

    const acquired: BrandMonitorScheduleRecord[] = [];

    for (const c of candidates) {
      const claimed = await this.acquireLease(c.brandId, workerId, leaseDurationMs);
      if (claimed) {
        const schedule = await this.findByBrandId(c.brandId);
        if (schedule) {
          acquired.push(schedule);
        }
      }
    }

    return acquired;
  }

  /**
   * Releases lease and updates schedule status, timestamps, and metrics.
   */
  async releaseLease(
    brandId: string,
    result: {
      status: 'COMPLETED' | 'FAILED';
      lastError?: string | null;
      findingsCount?: number;
      assetsScanned?: number;
      nextRunAt: Date;
    }
  ): Promise<BrandMonitorScheduleRecord> {
    const existing = await this.findByBrandId(brandId);
    const consecutiveFailures =
      result.status === 'FAILED' ? (existing?.consecutiveFailures || 0) + 1 : 0;

    return this.model.update({
      where: { brandId },
      data: {
        status: result.status,
        lastRunAt: new Date(),
        nextRunAt: result.nextRunAt,
        lockedUntil: null,
        lockedBy: null,
        consecutiveFailures,
        lastError: result.lastError || null,
        lastFindingsFound: result.findingsCount !== undefined ? result.findingsCount : existing?.lastFindingsFound || 0,
        lastAssetsScanned: result.assetsScanned !== undefined ? result.assetsScanned : existing?.lastAssetsScanned || 0,
        updatedAt: new Date()
      }
    });
  }
}

export const brandMonitorRepository = new BrandMonitorRepository();

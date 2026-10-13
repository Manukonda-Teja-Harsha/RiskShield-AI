import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { prisma } from '../src/lib/db/prisma';

async function applyPhaseE2Migration() {
  console.log('--- Applying Phase E2 Non-Destructive Migration ---');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "brand_monitor_schedules" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "brandId" UUID NOT NULL UNIQUE REFERENCES "brands"("id") ON DELETE CASCADE,
        "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
        "frequencyHours" INTEGER NOT NULL DEFAULT 24,
        "status" TEXT NOT NULL DEFAULT 'IDLE',
        "lastRunAt" TIMESTAMPTZ,
        "nextRunAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "lockedUntil" TIMESTAMPTZ,
        "lockedBy" TEXT,
        "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "lastFindingsFound" INTEGER NOT NULL DEFAULT 0,
        "lastAssetsScanned" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Created table brand_monitor_schedules');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "brand_monitor_schedules_enabled_nextRunAt_idx" 
      ON "brand_monitor_schedules"("enabled", "nextRunAt");
    `);
    console.log('✅ Created index brand_monitor_schedules_enabled_nextRunAt_idx');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "brand_monitor_schedules_lockedUntil_idx" 
      ON "brand_monitor_schedules"("lockedUntil");
    `);
    console.log('✅ Created index brand_monitor_schedules_lockedUntil_idx');

    // Add new enum values to FindingStatus if not already present
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "FindingStatus" ADD VALUE IF NOT EXISTS 'UNDER_INVESTIGATION';
    `);
    console.log('✅ Added UNDER_INVESTIGATION to FindingStatus enum');

    await prisma.$executeRawUnsafe(`
      ALTER TYPE "FindingStatus" ADD VALUE IF NOT EXISTS 'TAKEDOWN_REQUESTED';
    `);
    console.log('✅ Added TAKEDOWN_REQUESTED to FindingStatus enum');

    console.log('🎉 Phase E2 migration applied cleanly without data alteration.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyPhaseE2Migration();

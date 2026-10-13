import { prisma } from '../lib/db/prisma';

export interface DbScanRecord {
  id: string;
  userId: string | null;
  brandId: string | null;
  target: string;
  normalizedTarget: string;
  category: string;
  mode: string;
  status: 'KNOWN_THREAT' | 'HIGH_RISK' | 'SUSPICIOUS' | 'INCONCLUSIVE' | 'NO_KNOWN_THREAT_DETECTED';
  score: number;
  explanation: string;
  contextPayload?: Record<string, unknown> | null;
  evidence: unknown;
  sourcesChecked: string[];
  createdAt: Date;
}

export class ScanRepository {
  async createPersonalScanRecord(data: {
    userId: string;
    target: string;
    normalizedTarget: string;
    category: string;
    mode: string;
    status: 'KNOWN_THREAT' | 'HIGH_RISK' | 'SUSPICIOUS' | 'INCONCLUSIVE' | 'NO_KNOWN_THREAT_DETECTED';
    score: number;
    explanation: string;
    contextPayload?: Record<string, unknown> | null;
    evidence: unknown;
    sourcesChecked: string[];
  }): Promise<DbScanRecord> {
    const res = await prisma.scanRecord.create({
      data: {
        userId: data.userId,
        target: data.target,
        normalizedTarget: data.normalizedTarget,
        category: data.category,
        mode: data.mode,
        status: data.status,
        score: data.score,
        explanation: data.explanation,
        contextPayload: data.contextPayload ? (data.contextPayload as any) : undefined,
        evidence: data.evidence as any,
        sourcesChecked: data.sourcesChecked
      }
    });
    return res as unknown as DbScanRecord;
  }

  async findPersonalScansByUserId(userId: string, options?: { skip?: number; take?: number }): Promise<DbScanRecord[]> {
    const take = options?.take ? Math.min(Math.max(1, options.take), 100) : 50;
    const skip = options?.skip ? Math.max(0, options.skip) : 0;

    const res = await prisma.scanRecord.findMany({
      where: { userId, brandId: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });
    return res as unknown as DbScanRecord[];
  }

  async countPersonalScansByUserId(userId: string): Promise<number> {
    return prisma.scanRecord.count({
      where: { userId, brandId: null }
    });
  }

  async findBrandScansByBrandId(brandId: string): Promise<DbScanRecord[]> {
    const res = await prisma.scanRecord.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' }
    });
    return res as unknown as DbScanRecord[];
  }
}

export const scanRepository = new ScanRepository();

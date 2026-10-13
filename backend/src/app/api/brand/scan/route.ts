import { NextRequest, NextResponse } from 'next/server';
import { brandScanRequestSchema } from '@/schemas/scan.schema';
import { scannerService } from '@/services/scanner.service';
import { authorizeBrandRequest } from '@/lib/auth/brandAuthorization';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = brandScanRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid brand scan payload' },
        { status: 400 }
      );
    }

    // Require caller to have active membership in this brand workspace
    const auth = await authorizeBrandRequest(req, parsed.data.brandId, ['OWNER', 'ADMIN', 'MEMBER']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const execution = await scannerService.evaluateBrandIndicator(parsed.data);

    // Persist brand scan record to PostgreSQL
    const persisted = (await prisma.scanRecord.create({
      data: {
        userId: auth.data.session.userId,
        brandId: parsed.data.brandId,
        target: parsed.data.target,
        normalizedTarget: execution.scanResult.normalizedTarget || execution.scanResult.target,
        category: execution.scanResult.category,
        mode: execution.scanResult.mode,
        status: execution.scanResult.status,
        score: execution.scanResult.score,
        explanation: execution.scanResult.explanation,
        contextPayload: parsed.data.contextPayload ? (parsed.data.contextPayload as any) : undefined,
        evidence: execution.scanResult.evidence as any,
        sourcesChecked: execution.scanResult.sourcesChecked
      }
    })) as any;

    return NextResponse.json({
      ...execution,
      scanResult: {
        ...execution.scanResult,
        id: persisted.id,
        createdAt: persisted.createdAt ? new Date(persisted.createdAt).toISOString() : new Date().toISOString()
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Brand scan processing error';
    return NextResponse.json({ message }, { status: 422 });
  }
}

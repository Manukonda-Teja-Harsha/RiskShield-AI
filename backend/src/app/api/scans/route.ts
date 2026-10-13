import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestSession } from '@/lib/auth/session';
import { scanRepository } from '@/repositories/scan.repository';

export async function GET(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized: missing or invalid session token' },
        { status: 401 }
      );
    }

    const pageParam = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
    const limitParam = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      scanRepository.findPersonalScansByUserId(session.userId, { skip, take: limit }),
      scanRepository.countPersonalScansByUserId(session.userId)
    ]);

    const scans = records.map((record) => ({
      id: record.id,
      userId: record.userId,
      target: record.target,
      normalizedTarget: record.normalizedTarget,
      category: record.category,
      mode: record.mode,
      status: record.status,
      score: record.score,
      explanation: record.explanation,
      contextPayload: record.contextPayload,
      evidence: record.evidence,
      sourcesChecked: record.sourcesChecked,
      createdAt: record.createdAt.toISOString()
    }));

    return NextResponse.json({
      scans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve scan history';
    return NextResponse.json({ message }, { status: 500 });
  }
}

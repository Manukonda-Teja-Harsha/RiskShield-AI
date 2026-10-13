import { NextRequest, NextResponse } from 'next/server';
import { personalScanRequestSchema } from '@/schemas/scan.schema';
import { scannerService } from '@/services/scanner.service';
import { verifyRequestSession } from '@/lib/auth/session';
import { scanRepository } from '@/repositories/scan.repository';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized: missing or invalid session token' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = personalScanRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid scan request payload' },
        { status: 400 }
      );
    }

    const scanResult = await scannerService.evaluatePersonalIndicator(parsed.data);

    const record = await scanRepository.createPersonalScanRecord({
      userId: session.userId,
      target: parsed.data.target,
      normalizedTarget: scanResult.normalizedTarget || scanResult.target,
      category: scanResult.category,
      mode: scanResult.mode,
      status: scanResult.status,
      score: scanResult.score,
      explanation: scanResult.explanation,
      contextPayload: (parsed.data.contextPayload as Record<string, unknown>) || null,
      evidence: scanResult.evidence,
      sourcesChecked: scanResult.sourcesChecked
    });

    return NextResponse.json(
      {
        ...scanResult,
        id: record.id,
        userId: session.userId,
        createdAt: record.createdAt.toISOString()
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scan processing error';
    const isSecurityGuard = message.includes('SSRF') || message.includes('blocked');
    return NextResponse.json({ message }, { status: isSecurityGuard ? 400 : 500 });
  }
}

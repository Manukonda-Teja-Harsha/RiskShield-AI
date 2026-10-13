import { NextRequest, NextResponse } from 'next/server';
import { brandMonitorService } from '@/services/brandMonitor.service';

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRON SECURITY] CRON_SECRET is not set in production. Rejecting trigger.');
      return false;
    }
    // Local development fallback
    const fallback = 'riskshield-cron-secret-2026';
    const authHeader = req.headers.get('authorization');
    const headerSecret = req.headers.get('x-cron-secret');
    return headerSecret === fallback || authHeader === `Bearer ${fallback}`;
  }

  const authHeader = req.headers.get('authorization');
  const headerSecret = req.headers.get('x-cron-secret');

  if (headerSecret && headerSecret === cronSecret) {
    return true;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token === cronSecret) {
      return true;
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ message: 'Unauthorized cron runner trigger' }, { status: 401 });
  }

  try {
    const batchSize = Number(req.nextUrl.searchParams.get('batchSize')) || 5;
    const workerId = `cron-runner-${Date.now()}`;
    const report = await brandMonitorService.runCronBatch(workerId, batchSize);

    return NextResponse.json({
      success: true,
      report
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cron execution failed';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

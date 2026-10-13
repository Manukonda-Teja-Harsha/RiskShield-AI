import { NextRequest, NextResponse } from 'next/server';
import { authorizeBrandRequest } from '@/lib/auth/brandAuthorization';
import { brandMonitorService } from '@/services/brandMonitor.service';

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get('brandId');
    const auth = await authorizeBrandRequest(req, brandId, ['OWNER', 'ADMIN', 'MEMBER']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const schedule = await brandMonitorService.getOrCreateSchedule(auth.data.brand.id);
    return NextResponse.json({ schedule });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve monitor schedule';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brandId = body.brandId || req.nextUrl.searchParams.get('brandId');

    // Only OWNER or ADMIN can configure or manually trigger monitoring runs
    const auth = await authorizeBrandRequest(req, brandId, ['OWNER', 'ADMIN']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    // 1. If manual immediate execution requested
    if (body.runNow) {
      const result = await brandMonitorService.executeBrandMonitoring(auth.data.brand.id);
      const schedule = await brandMonitorService.getOrCreateSchedule(auth.data.brand.id);
      return NextResponse.json({
        message: 'Brand monitoring execution finished',
        runResult: result,
        schedule
      });
    }

    // 2. Otherwise update schedule parameters
    const schedule = await brandMonitorService.updateSchedule(auth.data.brand.id, {
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      frequencyHours: typeof body.frequencyHours === 'number' ? body.frequencyHours : undefined
    });

    return NextResponse.json({
      message: 'Schedule configuration updated successfully',
      schedule
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update monitor schedule';
    return NextResponse.json({ message }, { status: 400 });
  }
}

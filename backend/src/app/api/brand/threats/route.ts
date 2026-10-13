import { NextRequest, NextResponse } from 'next/server';
import { authorizeBrandRequest } from '@/lib/auth/brandAuthorization';
import { brandService } from '@/services/brand.service';

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get('brandId');
    const auth = await authorizeBrandRequest(req, brandId, ['OWNER', 'ADMIN', 'MEMBER']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const findings = await brandService.getBrandFindings(auth.data.brand.id);
    return NextResponse.json({ findings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve brand threats';
    return NextResponse.json({ message }, { status: 500 });
  }
}

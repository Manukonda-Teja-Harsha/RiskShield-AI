import { NextRequest, NextResponse } from 'next/server';
import { authorizeBrandRequest } from '@/lib/auth/brandAuthorization';
import { brandService } from '@/services/brand.service';
import { verifyAssetDnsSchema } from '@/schemas/brand.schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifyAssetDnsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid verification request payload' },
        { status: 400 }
      );
    }

    // Require OWNER or ADMIN to trigger asset verification challenge
    const auth = await authorizeBrandRequest(req, parsed.data.brandId, ['OWNER', 'ADMIN']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const result = await brandService.verifyAssetDns(parsed.data.brandId, parsed.data.assetId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Asset verification failed';
    return NextResponse.json({ message }, { status: 400 });
  }
}

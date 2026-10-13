import { NextRequest, NextResponse } from 'next/server';
import { authorizeBrandRequest } from '@/lib/auth/brandAuthorization';
import { brandService } from '@/services/brand.service';
import { addBrandAssetSchema } from '@/schemas/brand.schema';

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get('brandId');
    const auth = await authorizeBrandRequest(req, brandId, ['OWNER', 'ADMIN', 'MEMBER']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const assets = await brandService.getBrandAssets(auth.data.brand.id);
    return NextResponse.json({ assets });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve brand assets';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = addBrandAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid brand asset payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Require OWNER or ADMIN to add official assets
    const auth = await authorizeBrandRequest(req, parsed.data.brandId, ['OWNER', 'ADMIN']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const asset = await brandService.addBrandAsset(parsed.data.brandId, {
      type: parsed.data.type,
      value: parsed.data.value,
      platform: parsed.data.platform
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to register brand asset';
    const isDuplicate = message.includes('already registered');
    return NextResponse.json({ message }, { status: isDuplicate ? 409 : 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get('brandId');
    const assetId = req.nextUrl.searchParams.get('assetId');

    if (!assetId) {
      return NextResponse.json({ message: 'Missing required assetId parameter' }, { status: 400 });
    }

    // Require OWNER or ADMIN to delete brand assets
    const auth = await authorizeBrandRequest(req, brandId, ['OWNER', 'ADMIN']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const deleted = await brandService.deleteBrandAsset(auth.data.brand.id, assetId);
    if (!deleted) {
      return NextResponse.json({ message: 'Asset not found in this brand workspace' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Asset removed successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete brand asset';
    return NextResponse.json({ message }, { status: 500 });
  }
}

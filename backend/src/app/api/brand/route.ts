import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestSession } from '@/lib/auth/session';
import { authorizeBrandRequest } from '@/lib/auth/brandAuthorization';
import { brandService } from '@/services/brand.service';
import { brandOnboardingPayloadSchema } from '@/schemas/auth.schema';
import { updateBrandProfileSchema } from '@/schemas/brand.schema';

export async function GET(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized: Missing or invalid authentication token' },
        { status: 401 }
      );
    }

    const brandId = req.nextUrl.searchParams.get('brandId');

    // If specific brand requested, verify caller's active membership
    if (brandId) {
      const auth = await authorizeBrandRequest(req, brandId, ['OWNER', 'ADMIN', 'MEMBER']);
      if (!auth.success) {
        return NextResponse.json({ message: auth.message }, { status: auth.status });
      }

      const brandDetails = await brandService.getBrandDetails(brandId);
      return NextResponse.json({
        brand: brandDetails,
        callerMembership: {
          role: auth.data.membership.role,
          status: auth.data.membership.status
        }
      });
    }

    // Otherwise, return all workspaces for the authenticated user
    const workspaces = await brandService.getUserWorkspaces(session.userId);
    return NextResponse.json({ workspaces });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyRequestSession(req);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized: Missing or invalid authentication token' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = brandOnboardingPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid brand payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await brandService.createBrandWorkspace(session.userId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create brand workspace';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateBrandProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid brand profile update payload' },
        { status: 400 }
      );
    }

    // Require OWNER or ADMIN role to modify workspace profile
    const auth = await authorizeBrandRequest(req, parsed.data.brandId, ['OWNER', 'ADMIN']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const updated = await brandService.updateBrandProfile(parsed.data.brandId, parsed.data);
    return NextResponse.json({ brand: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update brand workspace profile';
    return NextResponse.json({ message }, { status: 500 });
  }
}

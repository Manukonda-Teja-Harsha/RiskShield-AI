import { NextRequest, NextResponse } from 'next/server';
import { authorizeBrandRequest } from '@/lib/auth/brandAuthorization';
import { threatInvestigationService } from '@/services/threatInvestigation.service';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const brandId = body.brandId || req.nextUrl.searchParams.get('brandId');

    const auth = await authorizeBrandRequest(req, brandId, ['OWNER', 'ADMIN', 'MEMBER']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    if (!body.targetStatus) {
      return NextResponse.json({ message: 'Missing targetStatus parameter' }, { status: 400 });
    }

    const result = await threatInvestigationService.transitionFindingStatus({
      findingId: id,
      brandId: auth.data.brand.id,
      callerEmail: auth.data.session.email,
      callerRole: auth.data.membership.role,
      targetStatus: body.targetStatus,
      note: body.note
    });

    return NextResponse.json({
      message: 'Finding status transitioned successfully',
      ...result
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update finding status';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const brandId = body.brandId || req.nextUrl.searchParams.get('brandId');

    const auth = await authorizeBrandRequest(req, brandId, ['OWNER', 'ADMIN', 'MEMBER']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    if (!body.note) {
      return NextResponse.json({ message: 'Note content is required' }, { status: 400 });
    }

    const entry = await threatInvestigationService.addInvestigationNote(
      id,
      auth.data.brand.id,
      auth.data.session.email,
      body.note
    );

    return NextResponse.json({
      message: 'Investigation note appended successfully',
      entry
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to append investigation note';
    return NextResponse.json({ message }, { status: 400 });
  }
}

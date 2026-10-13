import { NextRequest, NextResponse } from 'next/server';
import { authorizeBrandRequest } from '@/lib/auth/brandAuthorization';
import { threatInvestigationService } from '@/services/threatInvestigation.service';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const brandId = req.nextUrl.searchParams.get('brandId');

    const auth = await authorizeBrandRequest(req, brandId, ['OWNER', 'ADMIN', 'MEMBER']);
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const draft = await threatInvestigationService.generateAbuseReportDraft(
      id,
      auth.data.brand.id,
      auth.data.session.email
    );

    return NextResponse.json({ draft });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate abuse report draft';
    return NextResponse.json({ message }, { status: 400 });
  }
}

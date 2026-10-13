import { NextRequest, NextResponse } from 'next/server';
import { brandOnboardingPayloadSchema } from '@/schemas/auth.schema';
import { authService } from '@/services/auth.service';
import { SupabaseAuthError } from '@/lib/auth/supabaseAuth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required to complete brand workspace onboarding' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7).trim();
    const body = await req.json();
    const parsed = brandOnboardingPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid brand onboarding payload',
          issues: parsed.error.issues
        },
        { status: 400 }
      );
    }

    const result = await authService.completeBrandOnboardingForUser(accessToken, parsed.data);

    return NextResponse.json(
      {
        user: result.user,
        destination: result.destination,
        brandId: result.brandId,
        assetsCreatedCount: result.assetsCreatedCount
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof SupabaseAuthError) {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      {
        code: 'ONBOARDING_ERROR',
        message: err instanceof Error ? err.message : 'Failed to persist brand workspace onboarding'
      },
      { status: 500 }
    );
  }
}

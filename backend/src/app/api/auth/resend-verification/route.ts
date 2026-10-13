import { NextRequest, NextResponse } from 'next/server';
import { resendVerificationSchema } from '@/schemas/auth.schema';
import { authService } from '@/services/auth.service';
import { SupabaseAuthError } from '@/lib/auth/supabaseAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resendVerificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Valid email is required'
        },
        { status: 400 }
      );
    }

    await authService.resendVerification(parsed.data.email);

    return NextResponse.json({
      success: true,
      message: 'Verification email dispatched via Supabase Auth.'
    });
  } catch (err) {
    if (err instanceof SupabaseAuthError) {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      {
        code: 'RESEND_ERROR',
        message: err instanceof Error ? err.message : 'Unable to resend verification email'
      },
      { status: 500 }
    );
  }
}

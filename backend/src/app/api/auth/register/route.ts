import { NextRequest, NextResponse } from 'next/server';
import { registerRequestSchema, registerPersonalSchema } from '@/schemas/auth.schema';
import { authService } from '@/services/auth.service';
import { SupabaseAuthError } from '@/lib/auth/supabaseAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both explicit discriminated `accountType` and legacy personal registration payload
    const normalizedBody = body?.accountType
      ? body
      : { accountType: 'personal', ...body };

    const parsed =
      normalizedBody.accountType === 'personal'
        ? registerPersonalSchema.safeParse(normalizedBody)
        : registerRequestSchema.safeParse(normalizedBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid registration payload',
          issues: parsed.error.issues
        },
        { status: 400 }
      );
    }

    const input =
      normalizedBody.accountType === 'personal'
        ? ({ accountType: 'personal' as const, ...(parsed.data as { fullName: string; email: string; password: string }) })
        : (parsed.data as Extract<typeof parsed.data, { accountType: 'brand' }>);

    const result = await authService.register(input);

    return NextResponse.json(
      {
        user: result.user,
        session: result.session,
        destination: result.destination,
        requiresEmailConfirmation: result.requiresEmailConfirmation
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
        code: 'REGISTRATION_ERROR',
        message: err instanceof Error ? err.message : 'Unable to complete registration'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { loginRequestSchema } from '@/schemas/auth.schema';
import { authService } from '@/services/auth.service';
import { SupabaseAuthError } from '@/lib/auth/supabaseAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid credentials payload'
        },
        { status: 400 }
      );
    }

    const result = await authService.login(parsed.data);

    return NextResponse.json({
      user: result.user,
      session: result.session,
      destination: result.destination
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
        code: 'AUTH_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'Authentication server error'
      },
      { status: 500 }
    );
  }
}

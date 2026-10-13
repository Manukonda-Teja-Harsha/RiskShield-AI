import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { SupabaseAuthError } from '@/lib/auth/supabaseAuth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization Bearer token' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Empty Bearer token' },
        { status: 401 }
      );
    }

    const result = await authService.getCurrentUser(accessToken);

    return NextResponse.json({
      user: result.user,
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
        code: 'SESSION_LOOKUP_ERROR',
        message: err instanceof Error ? err.message : 'Failed to resolve authenticated user profile'
      },
      { status: 500 }
    );
  }
}

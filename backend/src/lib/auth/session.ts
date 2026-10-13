import { NextRequest } from 'next/server';
import type { AuthenticatedContext } from '../../types';
import { authService } from '../../services/auth.service';

/**
 * Extracts and validates the authenticated user session from Bearer JWT via Supabase Auth
 * and resolves authorized brand memberships from PostgreSQL.
 * Never trusts unverified client-supplied role or workspace flags.
 */
export async function verifyRequestSession(req: NextRequest): Promise<AuthenticatedContext | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  try {
    const { user } = await authService.getCurrentUser(token);
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      authorizedBrandIds: user.authorizedBrands.map((b) => b.brandId),
      accessToken: token
    };
  } catch {
    return null;
  }
}

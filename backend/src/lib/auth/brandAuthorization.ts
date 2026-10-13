import { NextRequest } from 'next/server';
import { prisma } from '../db/prisma';
import { verifyRequestSession } from './session';
import type { AuthenticatedContext } from '../../types';

export interface AuthorizedBrandContext {
  session: AuthenticatedContext;
  membership: {
    id: string;
    userId: string;
    brandId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    status: 'ACTIVE' | 'INVITED' | 'REVOKED';
  };
  brand: {
    id: string;
    name: string;
    slug: string;
    brandType: string;
    category: string;
    country: string | null;
    website: string | null;
    description: string | null;
    logoInitial: string;
    accentColor: string;
    businessEmail: string | null;
    supportEmail: string | null;
    securityContactEmail: string | null;
    officialPhone: string | null;
    status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'FEATURED_PARTNER' | 'REJECTED';
    dnsTxtToken: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export type BrandAuthResult =
  | { success: true; data: AuthorizedBrandContext }
  | { success: false; status: number; message: string };

/**
 * Validates the caller's session and verifies active membership in the target brand workspace.
 * If requiredRoles is provided, ensures the caller's brand role meets the minimum required permission.
 * Never trusts unverified client-supplied brandId or userId.
 */
export async function authorizeBrandRequest(
  req: NextRequest,
  brandId: string | null | undefined,
  requiredRoles: ('OWNER' | 'ADMIN' | 'MEMBER')[] = ['OWNER', 'ADMIN', 'MEMBER']
): Promise<BrandAuthResult> {
  const session = await verifyRequestSession(req);
  if (!session) {
    return {
      success: false,
      status: 401,
      message: 'Unauthorized: Missing or invalid authentication token'
    };
  }

  if (!brandId || typeof brandId !== 'string' || brandId.trim().length === 0) {
    return {
      success: false,
      status: 400,
      message: 'Bad Request: Missing or invalid brandId parameter'
    };
  }

  const cleanBrandId = brandId.trim();

  // Authoritative database check on brand membership
  const membershipRecord = (await prisma.brandMembership.findUnique({
    where: {
      userId_brandId: {
        userId: session.userId,
        brandId: cleanBrandId
      }
    },
    include: {
      brand: true
    }
  })) as any;

  if (!membershipRecord || membershipRecord.status !== 'ACTIVE' || !membershipRecord.brand) {
    return {
      success: false,
      status: 403,
      message: 'Forbidden: You do not have active membership in this brand workspace'
    };
  }

  const userBrandRole = membershipRecord.role as 'OWNER' | 'ADMIN' | 'MEMBER';
  if (!requiredRoles.includes(userBrandRole)) {
    return {
      success: false,
      status: 403,
      message: `Forbidden: This operation requires one of the following roles: ${requiredRoles.join(', ')}`
    };
  }

  return {
    success: true,
    data: {
      session,
      membership: membershipRecord,
      brand: membershipRecord.brand
    }
  };
}

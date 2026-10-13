import { prisma } from '../lib/db/prisma';

export interface UserWithMembershipsRecord {
  id: string;
  email: string;
  fullName?: string | null;
  displayName?: string | null;
  role: 'USER' | 'BRAND_OWNER' | 'ADMIN';
  accountStatus: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
  isEmailVerified: boolean;
  brandMemberships?: Array<{
    id: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    status: 'ACTIVE' | 'INVITED' | 'REVOKED';
    brand: {
      id: string;
      name: string;
      slug: string;
      status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'FEATURED_PARTNER' | 'REJECTED';
    };
  }>;
}

export class UserRepository {
  async findByIdWithMemberships(id: string): Promise<UserWithMembershipsRecord | null> {
    const record = await prisma.user.findUnique({
      where: { id },
      include: {
        brandMemberships: {
          where: { status: 'ACTIVE' },
          include: {
            brand: true
          }
        }
      }
    });
    return (record as unknown as UserWithMembershipsRecord) || null;
  }

  async findByEmail(email: string): Promise<UserWithMembershipsRecord | null> {
    const record = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        brandMemberships: {
          where: { status: 'ACTIVE' },
          include: {
            brand: true
          }
        }
      }
    });
    return (record as unknown as UserWithMembershipsRecord) || null;
  }

  /**
   * Idempotently syncs a Supabase Auth identity (`auth.users.id`) with the PostgreSQL `users` table.
   * Recovers cleanly if a prior signup created the auth user but failed to persist the profile row.
   */
  async upsertUserProfile(params: {
    id: string;
    email: string;
    fullName?: string;
    isEmailVerified: boolean;
    role?: 'USER' | 'BRAND_OWNER' | 'ADMIN';
  }): Promise<UserWithMembershipsRecord> {
    const cleanEmail = params.email.trim().toLowerCase();
    const display = params.fullName?.trim() || cleanEmail.split('@')[0];
    const accountStatus = params.isEmailVerified ? 'ACTIVE' : 'PENDING_VERIFICATION';

    // Find if user already exists either by Auth ID or by Email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ id: params.id }, { email: cleanEmail }]
      }
    });

    let record;
    if (existing) {
      // Update the existing profile record with latest verified status and ensure ID/email sync
      record = await prisma.user.update({
        where: { id: existing.id },
        data: {
          id: params.id, // Keep in sync with Supabase Auth UID
          email: cleanEmail,
          ...(params.fullName ? { fullName: display, displayName: display } : {}),
          isEmailVerified: params.isEmailVerified || existing.isEmailVerified,
          accountStatus: params.isEmailVerified || existing.isEmailVerified ? 'ACTIVE' : existing.accountStatus,
          ...(params.role ? { role: params.role } : {})
        },
        include: {
          brandMemberships: {
            where: { status: 'ACTIVE' },
            include: { brand: true }
          }
        }
      });
    } else {
      record = await prisma.user.create({
        data: {
          id: params.id,
          email: cleanEmail,
          fullName: display,
          displayName: display,
          role: params.role || 'USER',
          accountStatus,
          isEmailVerified: params.isEmailVerified
        },
        include: {
          brandMemberships: {
            where: { status: 'ACTIVE' },
            include: { brand: true }
          }
        }
      });
    }

    return record as unknown as UserWithMembershipsRecord;
  }
}

export const userRepository = new UserRepository();

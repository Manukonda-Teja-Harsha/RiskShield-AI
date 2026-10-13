import {
  signUpWithSupabase,
  signInWithSupabasePassword,
  verifySupabaseAccessToken,
  signOutSupabaseSession,
  resendSupabaseVerificationEmail,
  SupabaseSessionTokens
} from '../lib/auth/supabaseAuth';
import { userRepository, UserWithMembershipsRecord } from '../repositories/user.repository';
import { brandRepository } from '../repositories/brand.repository';
import { getSupabaseConfig } from '../lib/env';
import type {
  RegisterRequestInput,
  LoginRequestInput,
  BrandOnboardingPayloadInput
} from '../schemas/auth.schema';
import type {
  AuthenticatedUserDTO,
  AuthorizedBrandMembershipDTO,
  AuthDestinationDirective
} from '../types';

export function resolveDestinationDirective(
  user: AuthenticatedUserDTO
): AuthDestinationDirective {
  if (!user.isEmailVerified) {
    return 'VERIFY_EMAIL';
  }
  const activeCount = user.authorizedBrands.length;
  if (activeCount > 1) {
    return 'WORKSPACE_SELECTOR';
  }
  if (activeCount === 1) {
    return 'BRAND_DASHBOARD';
  }
  return 'USER_DASHBOARD';
}

export function mapUserRecordToDTO(record: UserWithMembershipsRecord): AuthenticatedUserDTO {
  const memberships: AuthorizedBrandMembershipDTO[] = (record.brandMemberships || [])
    .filter((m) => m.status === 'ACTIVE' && m.brand)
    .map((m) => ({
      brandId: m.brand.id,
      brandName: m.brand.name,
      slug: m.brand.slug,
      role: m.role === 'OWNER' ? 'owner' : m.role === 'ADMIN' ? 'admin' : 'member',
      verificationStatus: m.brand.status
    }));

  const primaryMembership = memberships[0];
  const resolvedRole: AuthenticatedUserDTO['role'] =
    record.role === 'ADMIN'
      ? 'admin'
      : memberships.length > 0 || record.role === 'BRAND_OWNER'
      ? 'brand_owner'
      : 'user';

  return {
    id: record.id,
    email: record.email,
    fullName: record.fullName || record.displayName || record.email.split('@')[0],
    role: resolvedRole,
    accountStatus: record.accountStatus || (record.isEmailVerified ? 'ACTIVE' : 'PENDING_VERIFICATION'),
    isEmailVerified: record.isEmailVerified,
    brandId: primaryMembership?.brandId,
    brandName: primaryMembership?.brandName,
    brandRole: primaryMembership?.role,
    authorizedBrands: memberships
  };
}

export class AuthService {
  /**
   * Registers a Personal Account or Brand Workspace in Supabase Auth and persists
   * corresponding User, Brand, BrandMembership, and BrandAsset records in PostgreSQL.
   */
  async register(input: RegisterRequestInput): Promise<{
    user: AuthenticatedUserDTO;
    session: SupabaseSessionTokens | null;
    destination: AuthDestinationDirective;
    requiresEmailConfirmation: boolean;
  }> {
    const signUpResult = await signUpWithSupabase({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      accountType: input.accountType
    });

    const authUser = signUpResult.user;
    const isEmailVerified = Boolean(authUser.email_confirmed_at || authUser.confirmed_at);
    const config = getSupabaseConfig();

    if (!config.hasDatabaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured in backend environment; cannot persist user profile to PostgreSQL.'
      );
    }

    // Idempotently persist User profile row in PostgreSQL
    let userRecord = await userRepository.upsertUserProfile({
      id: authUser.id,
      email: authUser.email || input.email,
      fullName: input.fullName,
      isEmailVerified,
      role: input.accountType === 'brand' ? 'BRAND_OWNER' : 'USER'
    });

    // If registering a Brand Workspace, persist Brand + OWNER Membership + Reference Assets (PENDING_VERIFICATION)
    if (input.accountType === 'brand') {
      await brandRepository.createBrandWorkspaceWithOwner(authUser.id, input.brandOnboarding);
      const refreshed = await userRepository.findByIdWithMemberships(authUser.id);
      if (refreshed) {
        userRecord = refreshed;
      }
    }

    const userDto = mapUserRecordToDTO(userRecord);
    const destination = resolveDestinationDirective(userDto);

    return {
      user: userDto,
      session: signUpResult.session,
      destination,
      requiresEmailConfirmation: signUpResult.requiresEmailConfirmation
    };
  }

  /**
   * Authenticates a user with email & password via Supabase Auth and loads
   * authoritative User profile + BrandMemberships from PostgreSQL.
   */
  async login(input: LoginRequestInput): Promise<{
    user: AuthenticatedUserDTO;
    session: SupabaseSessionTokens;
    destination: AuthDestinationDirective;
  }> {
    const signInResult = await signInWithSupabasePassword({
      email: input.email,
      password: input.password
    });

    const authUser = signInResult.user;
    const isEmailVerified = Boolean(authUser.email_confirmed_at || authUser.confirmed_at);
    const fullName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.display_name ||
      input.email.split('@')[0];

    const config = getSupabaseConfig();
    if (!config.hasDatabaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured in backend environment; cannot query user profile from PostgreSQL.'
      );
    }

    // Fetch or recover User profile from PostgreSQL
    const userRecord = await userRepository.upsertUserProfile({
      id: authUser.id,
      email: authUser.email || input.email,
      fullName,
      isEmailVerified
    });

    const userDto = mapUserRecordToDTO(userRecord);
    const destination = resolveDestinationDirective(userDto);

    return {
      user: userDto,
      session: signInResult.session,
      destination
    };
  }

  /**
   * Validates a Bearer JWT with Supabase Auth and returns the authoritative User profile
   * and BrandMemberships from PostgreSQL.
   */
  async getCurrentUser(accessToken: string): Promise<{
    user: AuthenticatedUserDTO;
    destination: AuthDestinationDirective;
  }> {
    const authUser = await verifySupabaseAccessToken(accessToken);
    const isEmailVerified = Boolean(authUser.email_confirmed_at || authUser.confirmed_at);
    const fullName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.display_name ||
      (authUser.email ? authUser.email.split('@')[0] : 'User');

    const config = getSupabaseConfig();
    if (!config.hasDatabaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured in backend environment; cannot query user profile from PostgreSQL.'
      );
    }

    const userRecord = await userRepository.upsertUserProfile({
      id: authUser.id,
      email: authUser.email,
      fullName,
      isEmailVerified
    });

    const userDto = mapUserRecordToDTO(userRecord);
    const destination = resolveDestinationDirective(userDto);

    return {
      user: userDto,
      destination
    };
  }

  /**
   * Persists Brand Workspace onboarding for an already-authenticated user.
   */
  async completeBrandOnboardingForUser(
    accessToken: string,
    payload: BrandOnboardingPayloadInput
  ): Promise<{
    user: AuthenticatedUserDTO;
    destination: AuthDestinationDirective;
    brandId: string;
    assetsCreatedCount: number;
  }> {
    const authUser = await verifySupabaseAccessToken(accessToken);
    const isEmailVerified = Boolean(authUser.email_confirmed_at || authUser.confirmed_at);
    const fullName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.display_name ||
      (authUser.email ? authUser.email.split('@')[0] : 'Brand Owner');

    await userRepository.upsertUserProfile({
      id: authUser.id,
      email: authUser.email,
      fullName,
      isEmailVerified,
      role: 'BRAND_OWNER'
    });

    const created = await brandRepository.createBrandWorkspaceWithOwner(authUser.id, payload);
    const refreshed = await userRepository.findByIdWithMemberships(authUser.id);
    if (!refreshed) {
      throw new Error('Failed to load updated brand membership profile after onboarding.');
    }

    const userDto = mapUserRecordToDTO(refreshed);
    const destination = resolveDestinationDirective(userDto);

    return {
      user: userDto,
      destination,
      brandId: String(created.brand.id),
      assetsCreatedCount: created.assetsCreatedCount
    };
  }

  async logout(accessToken: string): Promise<void> {
    await signOutSupabaseSession(accessToken);
  }

  async resendVerification(email: string): Promise<void> {
    await resendSupabaseVerificationEmail(email);
  }
}

export const authService = new AuthService();

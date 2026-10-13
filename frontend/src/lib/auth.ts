import { AuthorizedBrandMembership, BrandOnboardingData, UserSession } from '../types';

export const SUPABASE_PROJECT_REF = 'xsadxqhuefmvcuvpfoeh';
export const SUPABASE_PROJECT_URL =
  import.meta.env.VITE_SUPABASE_URL?.trim() || `https://${SUPABASE_PROJECT_REF}.supabase.co`;

const TOKENS_STORAGE_KEY = 'riskshield_auth_tokens';

export interface StoredAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  issuedAt: number;
}

export type PostLoginDestination =
  | { type: 'VERIFY_EMAIL'; email: string; fullName: string }
  | { type: 'USER_DASHBOARD' }
  | { type: 'BRAND_DASHBOARD'; brandId: string; brandName: string }
  | { type: 'WORKSPACE_SELECTOR'; memberships: AuthorizedBrandMembership[] }
  | { type: 'RECOVERY_REQUIRED'; email: string; reason: string };

export interface AuthLookupResult {
  success: boolean;
  error?: string;
  errorCode?:
    | 'INVALID_CREDENTIALS'
    | 'EMAIL_ALREADY_EXISTS'
    | 'UNVERIFIED_EMAIL'
    | 'RECOVERY_REQUIRED'
    | 'CONFIG_MISSING';
  requiresEmailVerification?: boolean;
  user?: UserSession;
  account?: {
    id: string;
    email: string;
    fullName: string;
    role: 'user' | 'brand_owner' | 'admin';
    isEmailVerified: boolean;
    authorizedBrands: AuthorizedBrandMembership[];
    accessToken?: string;
  };
  destination?: PostLoginDestination;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too Short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  colorClass: string;
  isAcceptable: boolean;
  feedback: string;
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length < 8) {
    return {
      score: 0,
      label: 'Too Short',
      colorClass: 'bg-red-500',
      isAcceptable: false,
      feedback: 'Must be at least 8 characters long.'
    };
  }

  let points = 1;
  if (password.length >= 10) points++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) points++;

  const score = Math.min(4, points) as 0 | 1 | 2 | 3 | 4;
  const labels: Record<number, PasswordStrength['label']> = {
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong'
  };
  const colors: Record<number, string> = {
    1: 'bg-red-500',
    2: 'bg-amber-500',
    3: 'bg-emerald-500',
    4: 'bg-emerald-500'
  };
  const feedbacks: Record<number, string> = {
    1: 'Add numbers, symbols, or uppercase letters.',
    2: 'Good start — mix uppercase and special characters for higher security.',
    3: 'Strong password ready for workspace security.',
    4: 'Excellent cryptographic entropy.'
  };

  return {
    score,
    label: labels[score],
    colorClass: colors[score],
    isAcceptable: score >= 2,
    feedback: feedbacks[score]
  };
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured && typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim().replace(/\/+$/, '');
  }
  return '';
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    localStorage.removeItem('riskshield_registered_accounts');
    const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthTokens;
    return parsed?.accessToken || null;
  } catch {
    return null;
  }
}

export function saveStoredTokens(tokens: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}): void {
  if (typeof window === 'undefined' || !tokens?.accessToken) return;
  try {
    const payload: StoredAuthTokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      issuedAt: Date.now()
    };
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage quota errors
  }
}

export function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKENS_STORAGE_KEY);
    localStorage.removeItem('riskshield_registered_accounts');
  } catch {
    // ignore
  }
}

function mapServerDestination(
  user: {
    email: string;
    fullName?: string;
    isEmailVerified: boolean;
    authorizedBrands?: AuthorizedBrandMembership[];
  },
  serverDirective?: string
): PostLoginDestination {
  const fullName = user.fullName || user.email.split('@')[0];
  const memberships = user.authorizedBrands || [];

  if (!user.isEmailVerified || serverDirective === 'VERIFY_EMAIL') {
    return { type: 'VERIFY_EMAIL', email: user.email, fullName };
  }
  if (serverDirective === 'RECOVERY_REQUIRED') {
    return {
      type: 'RECOVERY_REQUIRED',
      email: user.email,
      reason: 'Your workspace onboarding profile is incomplete.'
    };
  }
  if (memberships.length > 1 || serverDirective === 'WORKSPACE_SELECTOR') {
    return { type: 'WORKSPACE_SELECTOR', memberships };
  }
  if (memberships.length === 1 || serverDirective === 'BRAND_DASHBOARD') {
    const m = memberships[0];
    if (m) {
      return { type: 'BRAND_DASHBOARD', brandId: m.brandId, brandName: m.brandName };
    }
  }
  return { type: 'USER_DASHBOARD' };
}

/**
 * Authenticates a user via the Next.js API Route Handler (`POST /api/auth/login`),
 * which verifies credentials against Supabase Auth (`https://xsadxqhuefmvcuvpfoeh.supabase.co`)
 * and loads authoritative User + BrandMembership records from PostgreSQL.
 */
export async function authenticateCredentials(
  emailOrParams: string | { email: string; password: string },
  maybePassword?: string
): Promise<AuthLookupResult> {
  const rawEmail = typeof emailOrParams === 'string' ? emailOrParams : emailOrParams.email;
  const password = typeof emailOrParams === 'string' ? maybePassword || '' : emailOrParams.password;
  const cleanEmail = (rawEmail || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    return {
      success: false,
      error: 'Please enter both your email address and password.',
      errorCode: 'INVALID_CREDENTIALS'
    };
  }

  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error:
          'Authentication API endpoint (/api/auth/login) is unreachable. Ensure the Next.js backend is running and VITE_API_BASE_URL is configured.',
        errorCode: 'CONFIG_MISSING'
      };
    }

    const data = await response.json();

    if (!response.ok) {
      if (data?.code === 'EMAIL_NOT_VERIFIED') {
        return {
          success: false,
          requiresEmailVerification: true,
          error: data.message || 'Please verify your email address before signing in.',
          errorCode: 'UNVERIFIED_EMAIL',
          destination: {
            type: 'VERIFY_EMAIL',
            email: cleanEmail,
            fullName: cleanEmail.split('@')[0]
          }
        };
      }
      return {
        success: false,
        error: data?.message || 'Invalid email or password.',
        errorCode: data?.code === 'SUPABASE_CONFIG_MISSING' ? 'CONFIG_MISSING' : 'INVALID_CREDENTIALS'
      };
    }

    if (data?.session?.accessToken) {
      saveStoredTokens(data.session);
    }

    const serverUser = data.user;
    const authorizedBrands: AuthorizedBrandMembership[] = Array.isArray(serverUser?.authorizedBrands)
      ? serverUser.authorizedBrands
      : [];
    const primaryBrand = authorizedBrands[0];

    const account = {
      id: serverUser.id,
      email: serverUser.email || cleanEmail,
      fullName: serverUser.fullName || cleanEmail.split('@')[0],
      role: (serverUser.role || (authorizedBrands.length > 0 ? 'brand_owner' : 'user')) as
        | 'user'
        | 'brand_owner'
        | 'admin',
      isEmailVerified: Boolean(serverUser.isEmailVerified),
      authorizedBrands,
      accessToken: data?.session?.accessToken
    };

    const userSession: UserSession = {
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      role: account.role,
      brandId: serverUser.brandId || primaryBrand?.brandId,
      brandName: serverUser.brandName || primaryBrand?.brandName,
      brandRole: serverUser.brandRole || primaryBrand?.role,
      authorizedBrands,
      isEmailVerified: account.isEmailVerified,
      accessToken: account.accessToken
    };

    const destination = mapServerDestination(account, data.destination);

    return {
      success: true,
      requiresEmailVerification: destination.type === 'VERIFY_EMAIL',
      user: userSession,
      account,
      destination
    };
  } catch {
    return {
      success: false,
      error:
        'Unable to reach the authentication server (/api/auth/login). Ensure the backend API is running and connected to Supabase.',
      errorCode: 'CONFIG_MISSING'
    };
  }
}

/**
 * Registers a new Personal Account via `POST /api/auth/register` (Supabase Auth + PostgreSQL `users` table).
 * Never stores plaintext passwords or fake password hashes in localStorage.
 */
export async function registerPersonalAccount(params: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): Promise<AuthLookupResult> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim();

  if (params.confirmPassword !== undefined && params.password !== params.confirmPassword) {
    return {
      success: false,
      error: 'Passwords do not match.',
      errorCode: 'INVALID_CREDENTIALS'
    };
  }

  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountType: 'personal',
        fullName: cleanName,
        email: cleanEmail,
        password: params.password
      })
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error:
          'Registration API endpoint (/api/auth/register) is unreachable. Ensure the Next.js backend is running and VITE_API_BASE_URL is configured.',
        errorCode: 'CONFIG_MISSING'
      };
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || 'Unable to register personal account.',
        errorCode:
          data?.code === 'EMAIL_ALREADY_EXISTS'
            ? 'EMAIL_ALREADY_EXISTS'
            : data?.code === 'SUPABASE_CONFIG_MISSING'
            ? 'CONFIG_MISSING'
            : 'INVALID_CREDENTIALS'
      };
    }

    if (data?.session?.accessToken) {
      saveStoredTokens(data.session);
    }

    const serverUser = data.user;
    const account = {
      id: serverUser.id,
      email: serverUser.email || cleanEmail,
      fullName: serverUser.fullName || cleanName,
      role: 'user' as const,
      isEmailVerified: Boolean(serverUser.isEmailVerified),
      authorizedBrands: [],
      accessToken: data?.session?.accessToken
    };

    const userSession: UserSession = {
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      role: 'user',
      authorizedBrands: [],
      isEmailVerified: account.isEmailVerified,
      accessToken: account.accessToken
    };

    const destination = mapServerDestination(account, data.destination);

    return {
      success: true,
      requiresEmailVerification: destination.type === 'VERIFY_EMAIL',
      user: userSession,
      account,
      destination
    };
  } catch (err) {
    console.error('Registration fetch failed:', err);
    return {
      success: false,
      error:
        'Unable to reach the registration server (/api/auth/register). Ensure the backend API is running and connected to Supabase.',
      errorCode: 'CONFIG_MISSING'
    };
  }
}

function mapFrontendBrandTypeToApi(
  brandType: BrandOnboardingData['brandType']
): 'company_product' | 'creator_public_figure' | 'government_institution' | 'marketplace_seller' {
  switch (brandType) {
    case 'creator':
      return 'creator_public_figure';
    case 'small_business':
      return 'marketplace_seller';
    default:
      return 'company_product';
  }
}

/**
 * Registers or completes Brand Workspace onboarding via `/api/auth/register` (unauthenticated new owner)
 * or `/api/auth/onboarding` (existing authenticated user).
 * Persists Brand (`PENDING_VERIFICATION`), BrandAssets (`PENDING_VERIFICATION`), and OWNER BrandMembership.
 */
export async function submitBrandWorkspaceOnboarding(
  data: BrandOnboardingData
): Promise<AuthLookupResult> {
  const apiBase = getApiBaseUrl();
  const activeToken = getStoredAccessToken();

  const onboardingPayload = {
    brandType: mapFrontendBrandTypeToApi(data.brandType),
    name: data.name.trim(),
    primaryIdentityUrl: data.primaryIdentityUrl?.trim() || '',
    industry: data.industry?.trim() || 'Digital Brand',
    country: data.country?.trim() || 'Global',
    description: data.description?.trim() || `${data.name.trim()} official brand identity.`,
    officialWebsite: data.officialWebsite?.trim() || data.primaryIdentityUrl?.trim() || '',
    additionalDomains: data.additionalDomains || [],
    alternativeNames: data.alternativeNames || [],
    socialProfiles: (data.socialProfiles || []).map((s) => ({
      platform: s.platform,
      urlOrHandle: s.urlOrHandle
    })),
    apps: (data.apps || []).map((a) => ({
      platform: (a.playStoreUrl || a.packageId ? 'Android' : 'iOS') as 'Android' | 'iOS',
      name: a.name,
      packageId: a.packageId,
      bundleId: a.bundleId,
      storeUrl: a.playStoreUrl || a.appStoreUrl
    })),
    contacts: {
      businessEmail: (data.contacts?.businessEmail || data.ownerEmail || '').trim(),
      supportEmail: data.contacts?.supportEmail?.trim() || undefined,
      officialPhone: data.contacts?.phone?.trim() || undefined
    }
  };

  try {
    const endpoint = activeToken ? `${apiBase}/api/auth/onboarding` : `${apiBase}/api/auth/register`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken) {
      headers.Authorization = `Bearer ${activeToken}`;
    }

    const requestBody = activeToken
      ? onboardingPayload
      : {
          accountType: 'brand',
          fullName: (data.ownerFullName || `${data.name} Owner`).trim(),
          email: (data.ownerEmail || data.contacts?.businessEmail || '').trim().toLowerCase(),
          password: data.ownerPassword || '',
          brandOnboarding: onboardingPayload
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error:
          'Brand onboarding API endpoint is unreachable. Ensure the Next.js backend is running and VITE_API_BASE_URL is configured.',
        errorCode: 'CONFIG_MISSING'
      };
    }

    const body = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: body?.message || 'Unable to persist Brand Workspace onboarding.',
        errorCode:
          body?.code === 'EMAIL_ALREADY_EXISTS'
            ? 'EMAIL_ALREADY_EXISTS'
            : body?.code === 'SUPABASE_CONFIG_MISSING'
            ? 'CONFIG_MISSING'
            : 'INVALID_CREDENTIALS'
      };
    }

    if (body?.session?.accessToken) {
      saveStoredTokens(body.session);
    }

    const serverUser = body.user;
    const authorizedBrands: AuthorizedBrandMembership[] = Array.isArray(serverUser?.authorizedBrands)
      ? serverUser.authorizedBrands
      : [];

    const account = {
      id: serverUser.id,
      email: serverUser.email,
      fullName: serverUser.fullName,
      role: 'brand_owner' as const,
      isEmailVerified: Boolean(serverUser.isEmailVerified),
      authorizedBrands,
      accessToken: body?.session?.accessToken || activeToken || undefined
    };

    const destination = mapServerDestination(account, body.destination);

    return {
      success: true,
      account,
      destination
    };
  } catch {
    return {
      success: false,
      error:
        'Unable to reach the brand onboarding server. Ensure the backend API is running and connected to Supabase.',
      errorCode: 'CONFIG_MISSING'
    };
  }
}

/**
 * Restores and validates the active user session from `/api/auth/me` on page load.
 */
export async function fetchCurrentUserSession(): Promise<{
  authenticated: boolean;
  user?: UserSession;
  destination?: PostLoginDestination;
}> {
  const token = getStoredAccessToken();
  if (!token) {
    return { authenticated: false };
  }

  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401 || response.status === 403) {
      clearStoredTokens();
      return { authenticated: false };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      return { authenticated: false };
    }

    const data = await response.json();
    const serverUser = data?.user;
    if (!serverUser?.id) {
      return { authenticated: false };
    }

    const authorizedBrands: AuthorizedBrandMembership[] = Array.isArray(serverUser.authorizedBrands)
      ? serverUser.authorizedBrands
      : [];

    const primaryBrand = authorizedBrands[0];
    const sessionUser: UserSession = {
      id: serverUser.id,
      email: serverUser.email,
      fullName: serverUser.fullName,
      role: serverUser.role || (authorizedBrands.length > 0 ? 'brand_owner' : 'user'),
      accountStatus: serverUser.accountStatus,
      brandId: serverUser.brandId || primaryBrand?.brandId,
      brandName: serverUser.brandName || primaryBrand?.brandName,
      brandRole: serverUser.brandRole || primaryBrand?.role,
      authorizedBrands,
      isEmailVerified: Boolean(serverUser.isEmailVerified),
      accessToken: token
    };

    return {
      authenticated: true,
      user: sessionUser,
      destination: mapServerDestination(sessionUser, data.destination)
    };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Signs out the active Supabase session via `POST /api/auth/logout` and clears stored tokens.
 */
export async function signOutSession(): Promise<void> {
  const token = getStoredAccessToken();
  clearStoredTokens();

  if (!token) return;
  const apiBase = getApiBaseUrl();

  try {
    await fetch(`${apiBase}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    // Ignore network failures during sign-out cleanup
  }
}

/**
 * Verifies an email OTP or checks whether the user's Supabase email confirmation has completed.
 */
export async function verifyUserEmailCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string; destination?: PostLoginDestination }> {
  const cleanCode = code.trim();
  if (!cleanCode || cleanCode.length < 6) {
    return { success: false, error: 'Please enter the verification code sent to your email.' };
  }

  // First check if the user already has an active verified session on the backend
  const current = await fetchCurrentUserSession();
  if (current.authenticated && current.user?.isEmailVerified) {
    return {
      success: true,
      destination: current.destination
    };
  }

  // If VITE_SUPABASE_ANON_KEY is configured, verify the OTP directly with Supabase Auth
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anonKey) {
    try {
      const res = await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey
        },
        body: JSON.stringify({
          type: 'signup',
          email: email.trim().toLowerCase(),
          token: cleanCode
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data?.msg || data?.error_description || 'Invalid or expired verification code.'
        };
      }
      if (data?.access_token) {
        saveStoredTokens({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in
        });
      }
      const verifiedSession = await fetchCurrentUserSession();
      return {
        success: true,
        destination: verifiedSession.destination || { type: 'USER_DASHBOARD' }
      };
    } catch {
      return {
        success: false,
        error: 'Unable to verify code with Supabase Auth.'
      };
    }
  }

  return {
    success: false,
    error:
      'Supabase Auth verification requires VITE_SUPABASE_ANON_KEY or clicking the confirmation link in your email.'
  };
}

/**
 * Requests a verification email resend from `/api/auth/resend-verification`.
 */
export async function resendVerificationCode(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  const apiBase = getApiBaseUrl();
  try {
    const response = await fetch(`${apiBase}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Could not resend verification email.'
      };
    }
    return {
      success: true,
      message: data?.message || `Verification email sent to ${email}. Please check your inbox.`
    };
  } catch {
    return {
      success: false,
      message: 'Unable to reach verification endpoint (/api/auth/resend-verification).'
    };
  }
}

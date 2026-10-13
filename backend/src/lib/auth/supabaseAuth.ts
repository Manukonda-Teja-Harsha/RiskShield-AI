import { getSupabaseConfig } from '../env';

export interface SupabaseAuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: {
    full_name?: string;
    display_name?: string;
    account_type?: string;
  };
  created_at?: string;
}

export interface SupabaseSessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface SupabaseSignUpResult {
  user: SupabaseAuthUser;
  session: SupabaseSessionTokens | null;
  requiresEmailConfirmation: boolean;
}

export interface SupabaseSignInResult {
  user: SupabaseAuthUser;
  session: SupabaseSessionTokens;
}

export class SupabaseAuthError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = 'SUPABASE_AUTH_ERROR') {
    super(message);
    this.name = 'SupabaseAuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getAuthHeaders(apiKey: string, bearerToken?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: apiKey,
    Authorization: `Bearer ${bearerToken || apiKey}`
  };
}

/**
 * Registers a user in Supabase Auth (`POST /auth/v1/signup`).
 * Never stores plaintext passwords or password hashes in application tables.
 */
export async function signUpWithSupabase(params: {
  email: string;
  password: string;
  fullName: string;
  accountType?: 'personal' | 'brand';
}): Promise<SupabaseSignUpResult> {
  const config = getSupabaseConfig();
  const apiKey = config.anonKey || config.serviceRoleKey;

  if (!apiKey) {
    throw new SupabaseAuthError(
      'Supabase Auth API key (SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY) is not configured in backend environment.',
      503,
      'SUPABASE_CONFIG_MISSING'
    );
  }

  const response = await fetch(`${config.url}/auth/v1/signup`, {
    method: 'POST',
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({
      email: params.email.trim().toLowerCase(),
      password: params.password,
      data: {
        full_name: params.fullName.trim(),
        display_name: params.fullName.trim(),
        account_type: params.accountType || 'personal'
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const rawMsg = data?.msg || data?.error_description || data?.message || 'Unable to register account with Supabase Auth.';
    if (rawMsg.toLowerCase().includes('already registered') || response.status === 422) {
      throw new SupabaseAuthError('An account with this email address already exists.', 409, 'EMAIL_ALREADY_EXISTS');
    }
    throw new SupabaseAuthError(rawMsg, response.status, 'SIGNUP_FAILED');
  }

  const userObj: SupabaseAuthUser = data.user || data;
  if (!userObj?.id) {
    throw new SupabaseAuthError('Supabase Auth did not return a valid user ID.', 502, 'INVALID_AUTH_RESPONSE');
  }

  const isConfirmed = Boolean(userObj.email_confirmed_at || userObj.confirmed_at);
  const session: SupabaseSessionTokens | null = data.access_token
    ? {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresIn: data.expires_in || 3600,
        tokenType: data.token_type || 'bearer'
      }
    : null;

  return {
    user: userObj,
    session,
    requiresEmailConfirmation: !isConfirmed && !session
  };
}

/**
 * Authenticates an existing user with email and password via Supabase Auth (`POST /auth/v1/token?grant_type=password`).
 */
export async function signInWithSupabasePassword(params: {
  email: string;
  password: string;
}): Promise<SupabaseSignInResult> {
  const config = getSupabaseConfig();
  const apiKey = config.anonKey || config.serviceRoleKey;

  if (!apiKey) {
    throw new SupabaseAuthError(
      'Supabase Auth API key (SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY) is not configured in backend environment.',
      503,
      'SUPABASE_CONFIG_MISSING'
    );
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({
      email: params.email.trim().toLowerCase(),
      password: params.password
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const rawMsg = data?.error_description || data?.msg || data?.message || 'Invalid email or password.';
    if (rawMsg.toLowerCase().includes('email not confirmed')) {
      throw new SupabaseAuthError(
        'Email address has not been verified yet. Please check your inbox for the verification link.',
        403,
        'EMAIL_NOT_VERIFIED'
      );
    }
    throw new SupabaseAuthError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (!data?.access_token || !data?.user?.id) {
    throw new SupabaseAuthError('Supabase Auth returned an incomplete session.', 502, 'INVALID_AUTH_RESPONSE');
  }

  return {
    user: data.user as SupabaseAuthUser,
    session: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresIn: data.expires_in || 3600,
      tokenType: data.token_type || 'bearer'
    }
  };
}

/**
 * Verifies a Bearer access token with Supabase Auth (`GET /auth/v1/user`).
 */
export async function verifySupabaseAccessToken(accessToken: string): Promise<SupabaseAuthUser> {
  const config = getSupabaseConfig();
  const apiKey = config.anonKey || config.serviceRoleKey;

  if (!apiKey) {
    throw new SupabaseAuthError(
      'Supabase Auth API key is not configured in backend environment.',
      503,
      'SUPABASE_CONFIG_MISSING'
    );
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    method: 'GET',
    headers: getAuthHeaders(apiKey, accessToken)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.id) {
    throw new SupabaseAuthError('Invalid or expired session token.', 401, 'UNAUTHORIZED');
  }

  return data as SupabaseAuthUser;
}

/**
 * Revokes an active Supabase Auth session token (`POST /auth/v1/logout`).
 */
export async function signOutSupabaseSession(accessToken: string): Promise<void> {
  const config = getSupabaseConfig();
  const apiKey = config.anonKey || config.serviceRoleKey;
  if (!apiKey || !accessToken) return;

  await fetch(`${config.url}/auth/v1/logout`, {
    method: 'POST',
    headers: getAuthHeaders(apiKey, accessToken)
  }).catch(() => undefined);
}

/**
 * Triggers a verification email resend via Supabase Auth (`POST /auth/v1/resend`).
 */
export async function resendSupabaseVerificationEmail(email: string): Promise<void> {
  const config = getSupabaseConfig();
  const apiKey = config.anonKey || config.serviceRoleKey;

  if (!apiKey) {
    throw new SupabaseAuthError(
      'Supabase Auth API key is not configured in backend environment.',
      503,
      'SUPABASE_CONFIG_MISSING'
    );
  }

  const response = await fetch(`${config.url}/auth/v1/resend`, {
    method: 'POST',
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({
      type: 'signup',
      email: email.trim().toLowerCase()
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new SupabaseAuthError(
      data?.msg || data?.error_description || 'Could not resend verification email.',
      response.status,
      'RESEND_FAILED'
    );
  }
}

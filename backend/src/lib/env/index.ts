import { z } from 'zod';

export const EXPECTED_SUPABASE_PROJECT_REF = 'xsadxqhuefmvcuvpfoeh';
export const EXPECTED_SUPABASE_URL = `https://${EXPECTED_SUPABASE_PROJECT_REF}.supabase.co`;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  SUPABASE_URL: z.string().default(EXPECTED_SUPABASE_URL),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CORS_ALLOWED_ORIGIN: z.string().default('*'),
  // Threat Intelligence Credentials & Licensing Flags (Backend-only)
  GOOGLE_WEB_RISK_API_KEY: z.string().optional(),
  PHISHTANK_API_KEY: z.string().optional(),
  URLHAUS_AUTH_KEY: z.string().optional(),
  OPENPHISH_LICENSE_KEY: z.string().optional(),
  OPENPHISH_COMMUNITY_CONSENT: z.string().optional()
});

export type BackendEnv = z.infer<typeof envSchema>;

export function getEnv(): BackendEnv {
  return envSchema.parse(process.env);
}

export function getSupabaseConfig() {
  const env = getEnv();
  const url = (env.SUPABASE_URL || EXPECTED_SUPABASE_URL).replace(/\/+$/, '');
  const anonKey = env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const hasDatabaseUrl = Boolean(env.DATABASE_URL && env.DATABASE_URL.trim().length > 0);

  return {
    url,
    projectRef: EXPECTED_SUPABASE_PROJECT_REF,
    anonKey,
    serviceRoleKey,
    isSupabaseConfigured: Boolean(url && (anonKey || serviceRoleKey)),
    hasDatabaseUrl
  };
}

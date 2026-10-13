import { NextResponse } from 'next/server';
import { getSupabaseConfig } from '@/lib/env';

export async function GET() {
  const supabase = getSupabaseConfig();

  return NextResponse.json({
    status: 'ok',
    service: 'RiskShield AI Headless API',
    version: '1.0.0',
    supabase: {
      projectRef: supabase.projectRef,
      url: supabase.url,
      isAuthConfigured: supabase.isSupabaseConfigured,
      isDatabaseConfigured: supabase.hasDatabaseUrl
    },
    timestamp: new Date().toISOString()
  });
}

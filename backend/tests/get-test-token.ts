import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { getSupabaseConfig } from '../src/lib/env';

async function testSupabaseAuth() {
  const config = getSupabaseConfig();
  console.log('Supabase URL configured:', Boolean(config.url));
  console.log('Service role key configured:', Boolean(config.serviceRoleKey));
  console.log('Anon key configured:', Boolean(config.anonKey));

  // Try creating an admin confirmed test user via service role key
  const testEmail = `e2e.test.${Date.now()}@riskshield.internal`;
  const testPassword = `TestPass!9876543210!`;

  try {
    const res = await fetch(`${config.url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: { full_name: 'E2E Gate Tester' }
      })
    });

    console.log('Admin user creation HTTP status:', res.status);
    const data = await res.json();
    console.log('User created:', Boolean(data?.id));

    // Now sign in via password to get access token
    const loginRes = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey || config.serviceRoleKey
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    console.log('Login HTTP status:', loginRes.status);
    const loginData = await loginRes.json();
    console.log('Received access token:', Boolean(loginData?.access_token));

    // Clean up created user in Supabase Auth
    if (data?.id) {
      const delRes = await fetch(`${config.url}/auth/v1/admin/users/${data.id}`, {
        method: 'DELETE',
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`
        }
      });
      console.log('Admin user cleanup HTTP status:', delRes.status);
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
}

testSupabaseAuth();

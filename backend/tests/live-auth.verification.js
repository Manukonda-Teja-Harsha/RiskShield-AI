import { PrismaClient } from '@prisma/client';
import { supabaseAuth } from '../src/lib/auth/supabaseAuth.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function runLiveTest() {
  console.log('--- STARTING LIVE DATABASE & AUTH TEST ---');
  
  // 1. Database Connectivity Check
  try {
    const tableCount = await prisma.user.count();
    console.log('✅ [PASS] Direct Database connection successful via Prisma. Existing user count:', tableCount);
  } catch (err) {
    console.error('❌ [FAIL] Prisma database connection failed:', err.message);
    process.exit(1);
  }

  // 2. Disposable User Registration Test
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const testEmail = `test.user.${Date.now()}.${randomSuffix}@example.com`;
  const testPassword = `P@ssw0rdSecure!${randomSuffix}`;

  console.log('\nTesting Auth Registration with disposable account:', testEmail);

  let authUser;
  try {
    const signUpRes = await supabaseAuth.signUp({
      email: testEmail,
      password: testPassword,
      data: {
        fullName: 'Test Automation User',
        role: 'USER'
      }
    });

    if (signUpRes.error) {
      console.error('❌ [FAIL] Supabase Auth sign up returned error:', signUpRes.error);
      process.exit(1);
    }

    authUser = signUpRes.data.user;
    console.log('✅ [PASS] Supabase Auth sign up successful. User ID:', authUser?.id);
    console.log('         Email confirmed at creation:', authUser?.email_confirmed_at ?? 'Unconfirmed (as expected for email verification flow)');
  } catch (err) {
    console.error('❌ [FAIL] Auth registration exception:', err.message);
    process.exit(1);
  }

  // 3. User Profile Persistence in Database
  try {
    const createdProfile = await prisma.user.create({
      data: {
        id: authUser.id,
        email: testEmail,
        fullName: 'Test Automation User',
        displayName: 'Test Automation User',
        role: 'USER',
        accountStatus: 'PENDING_VERIFICATION',
        isEmailVerified: false
      }
    });

    console.log('✅ [PASS] User Profile created in PostgreSQL with ID matching Supabase Auth UID:', createdProfile.id);

    // 4. Verification of Read / Session Restoration lookup
    const queriedProfile = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { brandMemberships: true }
    });

    if (queriedProfile && queriedProfile.email === testEmail) {
      console.log('✅ [PASS] User profile fetched successfully via findUnique.');
    } else {
      console.error('❌ [FAIL] User profile fetch mismatch.');
      process.exit(1);
    }

    // 5. Cleanup Disposable Test Account from database
    await prisma.user.delete({
      where: { id: authUser.id }
    });
    console.log('✅ [PASS] Cleaned up disposable user from database.');

  } catch (err) {
    console.error('❌ [FAIL] Database persistence test failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🎉 ALL LIVE DATABASE & AUTH FOUNDATION TESTS PASSED!');
}

runLiveTest().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});

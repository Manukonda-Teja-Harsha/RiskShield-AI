/**
 * RiskShield AI — Backend API Contracts, Auth Foundation & Guardrails Verification Suite
 */
import { personalScanRequestSchema, brandScanRequestSchema } from '../src/schemas/scan.schema';
import {
  loginRequestSchema,
  registerPersonalSchema,
  brandOnboardingPayloadSchema,
  registerRequestSchema
} from '../src/schemas/auth.schema';
import { resolveDestinationDirective, mapUserRecordToDTO } from '../src/services/auth.service';
import { getSupabaseConfig, EXPECTED_SUPABASE_PROJECT_REF, EXPECTED_SUPABASE_URL } from '../src/lib/env';
import { sanitizeAndGuardInput } from '../src/lib/security/ssrfGuard';
import { scannerService } from '../src/services/scanner.service';

async function verifyBackendContracts() {
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      throw new Error(`Failed assertion: ${name}`);
    }
  }

  // 1. Supabase project reference & URL verification
  const supabaseCfg = getSupabaseConfig();
  assert(
    supabaseCfg.projectRef === EXPECTED_SUPABASE_PROJECT_REF &&
      supabaseCfg.url === EXPECTED_SUPABASE_URL &&
      supabaseCfg.projectRef === 'xsadxqhuefmvcuvpfoeh',
    'Supabase target project reference (xsadxqhuefmvcuvpfoeh) and URL match expected configuration'
  );

  // 2. Personal Registration Zod validation
  const validPersonalReg = registerPersonalSchema.safeParse({
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    password: 'StrongPassword!2026'
  });
  assert(validPersonalReg.success, 'Personal registration Zod schema accepts valid input');

  const invalidPersonalReg = registerPersonalSchema.safeParse({
    fullName: 'P',
    email: 'not-an-email',
    password: '123'
  });
  assert(!invalidPersonalReg.success, 'Personal registration Zod schema rejects invalid email and weak password');

  // 3. Brand Workspace Registration & Onboarding Zod validation
  const validBrandReg = registerRequestSchema.safeParse({
    accountType: 'brand',
    fullName: 'Alex Mercer',
    email: 'security@novastudio.io',
    password: 'EnterprisePassword#2026',
    brandOnboarding: {
      brandType: 'company_product',
      name: 'Nova Studio',
      primaryIdentityUrl: 'https://novastudio.io',
      industry: 'SaaS',
      country: 'United States',
      additionalDomains: ['nova-app.io'],
      socialProfiles: [{ platform: 'X', urlOrHandle: '@novastudio' }],
      contacts: {
        businessEmail: 'security@novastudio.io'
      }
    }
  });
  assert(validBrandReg.success, 'Brand registration & onboarding Zod schema accepts valid brand workspace payload');

  // 4. User DTO & Pending Verification Brand Membership mapping
  const mappedBrandOwner = mapUserRecordToDTO({
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'security@novastudio.io',
    fullName: 'Alex Mercer',
    role: 'BRAND_OWNER',
    accountStatus: 'ACTIVE',
    isEmailVerified: true,
    brandMemberships: [
      {
        id: 'bm-1',
        role: 'OWNER',
        status: 'ACTIVE',
        brand: {
          id: 'brand-1',
          name: 'Nova Studio',
          slug: 'nova-studio',
          status: 'PENDING_VERIFICATION'
        }
      }
    ]
  });

  assert(
    mappedBrandOwner.role === 'brand_owner' &&
      mappedBrandOwner.authorizedBrands.length === 1 &&
      mappedBrandOwner.authorizedBrands[0].verificationStatus === 'PENDING_VERIFICATION' &&
      mappedBrandOwner.authorizedBrands[0].role === 'owner',
    'Brand owner DTO preserves PENDING_VERIFICATION status and OWNER membership role'
  );

  // 5. Role-Based Redirection Directives
  const unverifiedDest = resolveDestinationDirective({
    ...mappedBrandOwner,
    isEmailVerified: false
  });
  assert(unverifiedDest === 'VERIFY_EMAIL', 'Unverified user resolves to VERIFY_EMAIL directive');

  const personalDest = resolveDestinationDirective({
    ...mappedBrandOwner,
    role: 'user',
    authorizedBrands: []
  });
  assert(personalDest === 'USER_DASHBOARD', 'Verified personal user with 0 brands resolves to USER_DASHBOARD');

  const singleBrandDest = resolveDestinationDirective(mappedBrandOwner);
  assert(singleBrandDest === 'BRAND_DASHBOARD', 'Verified user with 1 active brand resolves to BRAND_DASHBOARD');

  const multiBrandDest = resolveDestinationDirective({
    ...mappedBrandOwner,
    authorizedBrands: [
      ...mappedBrandOwner.authorizedBrands,
      {
        brandId: 'brand-2',
        brandName: 'Nova Labs',
        slug: 'nova-labs',
        role: 'admin',
        verificationStatus: 'VERIFIED'
      }
    ]
  });
  assert(multiBrandDest === 'WORKSPACE_SELECTOR', 'Verified user with multiple brands resolves to WORKSPACE_SELECTOR');

  // 6. Scanner contracts & SSRF guard
  const validScan = personalScanRequestSchema.safeParse({
    target: 'https://suspicious-login-verify.top',
    contextPayload: {
      category: 'url',
      primaryInput: 'https://suspicious-login-verify.top',
      requestedAction: 'Share OTP / PIN'
    }
  });
  assert(validScan.success, 'Personal scan schema accepts valid payload');

  const ssrfCheck = sanitizeAndGuardInput('http://169.254.169.254/latest/meta-data');
  assert(ssrfCheck.isBlocked, 'SSRF guard blocks cloud metadata IP');

  const brandCheck = brandScanRequestSchema.safeParse({
    target: 'https://acme-verify.xyz',
    brandId: 'RB-01',
    brandName: 'Acme Financial'
  });
  assert(brandCheck.success, 'Brand scan schema accepts valid payload');

  const evalRes = await scannerService.evaluatePersonalIndicator(validScan.data!);
  assert(evalRes.score >= 50, 'Scanner service elevates risk score for OTP + high-abuse TLD');

  console.log(`\n🎉 Backend Verification Suite Complete: ${passed}/${total} checks passed.`);
}

verifyBackendContracts();

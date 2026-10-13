/**
 * RiskShield AI — Phase B Automated Test Suite
 * Brand Workspace Creation, Membership Permissions, Asset Management,
 * Verification Invariants, Cross-Tenant Isolation & Phase A Regression Checks
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/db/prisma';
import { brandService } from '../src/services/brand.service';
import { authorizeBrandRequest } from '../src/lib/auth/brandAuthorization';
import { GET as brandGetHandler, POST as brandPostHandler, PATCH as brandPatchHandler } from '../src/app/api/brand/route';
import { GET as assetsGetHandler, POST as assetsPostHandler, DELETE as assetsDeleteHandler } from '../src/app/api/brand/assets/route';
import { POST as assetVerifyHandler } from '../src/app/api/brand/assets/verify/route';
import { GET as threatsGetHandler } from '../src/app/api/brand/threats/route';
import { POST as brandScanHandler } from '../src/app/api/brand/scan/route';
import { POST as personalScanHandler } from '../src/app/api/scan/route';
import { GET as personalScansHandler } from '../src/app/api/scans/route';

async function runPhaseBVerification() {
  console.log('====================================================');
  console.log('   RISKSHIELD AI — PHASE B AUTOMATED VERIFICATION   ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // Generate UUIDs for test users
  const userAId = randomUUID();
  const userBId = randomUUID();
  const userCId = randomUUID();

  let brandAId = '';
  let brandBId = '';

  try {
    // Setup test users in PostgreSQL
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `owner.a.${Date.now()}@test.brandshield.ai`,
          fullName: 'Brand Owner A',
          role: 'USER',
          isEmailVerified: false
        },
        {
          id: userBId,
          email: `owner.b.${Date.now()}@test.brandshield.ai`,
          fullName: 'Brand Owner B',
          role: 'USER',
          isEmailVerified: false
        },
        {
          id: userCId,
          email: `member.c.${Date.now()}@test.brandshield.ai`,
          fullName: 'Brand Member C',
          role: 'USER',
          isEmailVerified: true
        }
      ]
    });

    // ---------------------------------------------------------
    // Suite 1: Brand Workspace Creation & Initial States
    // ---------------------------------------------------------
    console.log('--- Suite 1: Brand Workspace Creation & Invariants ---');

    const brandPayloadA = {
      brandType: 'company_product' as const,
      name: `Acme Sentinel ${Date.now().toString().slice(-4)}`,
      primaryIdentityUrl: 'https://acmesentinel.io',
      industry: 'Cybersecurity',
      country: 'United States',
      description: 'Enterprise AI threat intelligence platform',
      officialWebsite: 'https://acmesentinel.io',
      additionalDomains: ['acme-sentinel-login.io'],
      socialProfiles: [
        { platform: 'X', urlOrHandle: '@acmesentinel' },
        { platform: 'LinkedIn', urlOrHandle: 'company/acme-sentinel' }
      ],
      apps: [
        { platform: 'Android' as const, name: 'Acme Authenticator', packageId: 'com.acmesentinel.auth' }
      ],
      contacts: {
        businessEmail: `security@acmesentinel.${Date.now().toString().slice(-4)}.io`,
        supportEmail: 'support@acmesentinel.io'
      },
      alternativeNames: ['AcmeSec', 'Sentinel AI']
    };

    const createdA = await brandService.createBrandWorkspace(userAId, brandPayloadA);
    brandAId = String(createdA.brand.id);

    assert(Boolean(createdA.brand.id), 'Brand A created with valid UUID');
    assert(createdA.brand.status === 'PENDING_VERIFICATION', 'New Brand A starts in PENDING_VERIFICATION status (never auto-verified)');
    assert(Boolean(createdA.brand.dnsTxtToken), 'Brand A generated with cryptographic DNS TXT verification token');
    assert(createdA.membership.role === 'OWNER', 'Creating user is granted OWNER membership role');
    assert(createdA.membership.status === 'ACTIVE', 'OWNER membership is initialized in ACTIVE status');

    // Check user role elevation
    const refreshedUserA = (await prisma.user.findUnique({ where: { id: userAId } })) as any;
    assert(refreshedUserA?.role === 'BRAND_OWNER', 'User A role elevated to BRAND_OWNER in database');

    // Check initial assets
    const initialAssetsA = await brandService.getBrandAssets(brandAId);
    assert(initialAssetsA.length >= 5, `Initial reference assets created (found ${initialAssetsA.length})`);
    assert(
      initialAssetsA.every((a) => a.status === 'PENDING_VERIFICATION' || a.status === 'PENDING_DNS'),
      'All newly registered assets are in PENDING_VERIFICATION or PENDING_DNS status (none auto-verified)'
    );

    const primaryDomainAsset = initialAssetsA.find((a) => a.value === 'https://acmesentinel.io');
    assert(Boolean(primaryDomainAsset), 'Primary domain asset recorded');
    assert(primaryDomainAsset?.normalizedValue === 'acmesentinel.io', 'Domain value normalized (stripped protocol)');
    assert(Boolean(primaryDomainAsset?.dnsTxtRecord), 'Domain asset assigned cryptographic dnsTxtRecord');

    // ---------------------------------------------------------
    // Suite 2: Email Verification Isolation Invariant
    // ---------------------------------------------------------
    console.log('\n--- Suite 2: Verification Invariant Checks ---');

    // Email verification alone must NOT verify brand ownership
    await prisma.user.update({
      where: { id: userAId },
      data: { isEmailVerified: true }
    });
    const brandAfterEmailVerify = await brandService.getBrandDetails(brandAId);
    assert(
      brandAfterEmailVerify?.status === 'PENDING_VERIFICATION',
      'Verifying personal user email DOES NOT automatically verify brand ownership (remains PENDING_VERIFICATION)'
    );

    // ---------------------------------------------------------
    // Suite 3: Membership Permissions & Role Enforcement
    // ---------------------------------------------------------
    console.log('\n--- Suite 3: Membership Permissions & Role Enforcement ---');

    // Add User C as a MEMBER (read-only for assets, not owner/admin)
    await prisma.brandMembership.create({
      data: {
        userId: userCId,
        brandId: brandAId,
        role: 'MEMBER',
        status: 'ACTIVE'
      }
    });

    // Mock NextRequest objects with bearer simulation
    // We test authorizeBrandRequest with mock context
    const reqMockUnauth = new Request('http://localhost:3001/api/brand', { method: 'GET' });
    const authResultUnauth = await authorizeBrandRequest(reqMockUnauth as any, brandAId);
    assert(authResultUnauth.success === false && authResultUnauth.status === 401, 'Unauthenticated request rejected with HTTP 401');

    // Test membership check directly via Prisma
    const ownerMembership = await prisma.brandMembership.findUnique({
      where: { userId_brandId: { userId: userAId, brandId: brandAId } }
    });
    assert(ownerMembership?.role === 'OWNER', 'Owner membership validated');

    const memberCMembership = await prisma.brandMembership.findUnique({
      where: { userId_brandId: { userId: userCId, brandId: brandAId } }
    });
    assert(memberCMembership?.role === 'MEMBER', 'Member C role is MEMBER');

    const outsiderMembership = await prisma.brandMembership.findUnique({
      where: { userId_brandId: { userId: userBId, brandId: brandAId } }
    });
    assert(!outsiderMembership, 'User B has no membership in Brand A');

    // ---------------------------------------------------------
    // Suite 4: Cross-Tenant Isolation
    // ---------------------------------------------------------
    console.log('\n--- Suite 4: Cross-Tenant Workspace Isolation ---');

    // Create Brand B for User B
    const brandPayloadB = {
      brandType: 'company_product' as const,
      name: `Nexus Cloud ${Date.now().toString().slice(-4)}`,
      primaryIdentityUrl: 'https://nexuscloud.net',
      industry: 'Cloud Infrastructure',
      country: 'Germany',
      description: 'Cloud hosting',
      officialWebsite: 'https://nexuscloud.net',
      additionalDomains: [],
      socialProfiles: [],
      apps: [],
      contacts: { businessEmail: `admin@nexuscloud.${Date.now().toString().slice(-4)}.net` },
      alternativeNames: []
    };
    const createdB = await brandService.createBrandWorkspace(userBId, brandPayloadB);
    brandBId = String(createdB.brand.id);

    // Verify User A workspaces only return Brand A
    const userAWorkspaces = await brandService.getUserWorkspaces(userAId);
    assert(userAWorkspaces.length === 1, 'User A has exactly 1 workspace');
    assert(userAWorkspaces[0].brand.id === brandAId, 'User A workspace list contains Brand A');
    assert(!userAWorkspaces.some((w) => w.brand.id === brandBId), 'User A workspace list DOES NOT contain Brand B');

    // Verify User B workspaces only return Brand B
    const userBWorkspaces = await brandService.getUserWorkspaces(userBId);
    assert(userBWorkspaces.length === 1, 'User B has exactly 1 workspace');
    assert(userBWorkspaces[0].brand.id === brandBId, 'User B workspace list contains Brand B');
    assert(!userBWorkspaces.some((w) => w.brand.id === brandAId), 'User B workspace list DOES NOT contain Brand A');

    // ---------------------------------------------------------
    // Suite 5: Brand Asset Management & Normalization
    // ---------------------------------------------------------
    console.log('\n--- Suite 5: Brand Asset Management & Normalization ---');

    // 5a. Add valid subdomain asset
    const newAsset = await brandService.addBrandAsset(brandAId, {
      type: 'SUBDOMAIN',
      value: 'https://WWW.auth.acmesentinel.io/'
    });
    assert(Boolean(newAsset.id), 'Subdomain asset created with UUID');
    assert(newAsset.normalizedValue === 'auth.acmesentinel.io', 'Subdomain normalized: stripped protocol, www, and trailing slash');
    assert(newAsset.status === 'PENDING_DNS', 'Subdomain asset initialized in PENDING_DNS status');
    assert(Boolean(newAsset.dnsTxtRecord), 'Subdomain asset assigned DNS TXT verification token');

    // 5b. Duplicate prevention
    let duplicateCaught = false;
    try {
      await brandService.addBrandAsset(brandAId, {
        type: 'SUBDOMAIN',
        value: 'auth.acmesentinel.io'
      });
    } catch {
      duplicateCaught = true;
    }
    assert(duplicateCaught, 'Duplicate asset registration in the same brand workspace is rejected');

    // 5c. Delete asset
    const deleted = await brandService.deleteBrandAsset(brandAId, newAsset.id);
    assert(deleted === true, 'Brand asset successfully deleted by authorized owner');

    // 5d. Cross-tenant deletion prevention: User B cannot delete Brand A asset
    const anotherAsset = await brandService.addBrandAsset(brandAId, {
      type: 'SOCIAL_HANDLE',
      platform: 'GitHub',
      value: 'acmesentinel'
    });
    const crossDeleteAttempt = await brandService.deleteBrandAsset(brandBId, anotherAsset.id);
    assert(crossDeleteAttempt === false, 'Cross-tenant asset deletion prevented: Brand B cannot delete Brand A asset');

    // ---------------------------------------------------------
    // Suite 6: Asset Verification Invariants
    // ---------------------------------------------------------
    console.log('\n--- Suite 6: Verification Challenge Invariants ---');

    // Unverified DNS challenge must NOT auto-verify
    const dummyDomain = await brandService.addBrandAsset(brandAId, {
      type: 'DOMAIN',
      value: 'non-existent-unverified-domain-xyz-9912.io'
    });
    const verifyResult = await brandService.verifyAssetDns(brandAId, dummyDomain.id);
    assert(verifyResult.verified === false, 'Non-existent or un-published DNS challenge returns verified: false');

    const reloadedAsset = await prisma.brandAsset.findUnique({ where: { id: dummyDomain.id } });
    assert(
      reloadedAsset?.status === 'PENDING_DNS',
      'Asset remains in PENDING_DNS status when verification challenge is not satisfied'
    );

    // Non-domain asset verification rejection
    let nonDomainError = false;
    try {
      await brandService.verifyAssetDns(brandAId, anotherAsset.id);
    } catch {
      nonDomainError = true;
    }
    assert(nonDomainError, 'Attempting DNS TXT verification on non-domain asset (social handle) throws error');

    // ---------------------------------------------------------
    // Suite 7: Existing Phase A Regression Checks
    // ---------------------------------------------------------
    console.log('\n--- Suite 7: Phase A Regressions ---');

    // 7a. Unauthenticated personal scan rejected
    const unauthScanReq = new Request('http://localhost:3001/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'example.com', mode: 'url' })
    });
    const unauthScanRes = await personalScanHandler(unauthScanReq as any);
    assert(unauthScanRes.status === 401, 'Phase A: POST /api/scan still rejects unauthenticated request with 401');

    // 7b. Unauthenticated scans history rejected
    const unauthScansReq = new Request('http://localhost:3001/api/scans', { method: 'GET' });
    const unauthScansRes = await personalScansHandler(unauthScansReq as any);
    assert(unauthScansRes.status === 401, 'Phase A: GET /api/scans still rejects unauthenticated request with 401');

    // ---------------------------------------------------------
    // Suite 8: Teardown & Database Cleanup
    // ---------------------------------------------------------
    console.log('\n--- Suite 8: Teardown & Database Cleanup ---');

    // Delete assets
    await prisma.brandAsset.deleteMany({
      where: { brandId: { in: [brandAId, brandBId] } }
    });

    // Delete memberships
    await prisma.brandMembership.deleteMany({
      where: { brandId: { in: [brandAId, brandBId] } }
    });

    // Delete brands
    await prisma.brand.deleteMany({
      where: { id: { in: [brandAId, brandBId] } }
    });

    // Delete users
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId, userCId] } }
    });

    console.log('✅ [PASS] Cleaned up test assets, memberships, brands, and users from database');

  } catch (err) {
    // Attempt cleanup on failure
    try {
      if (brandAId || brandBId) {
        await prisma.brandAsset.deleteMany({ where: { brandId: { in: [brandAId, brandBId] } } });
        await prisma.brandMembership.deleteMany({ where: { brandId: { in: [brandAId, brandBId] } } });
        await prisma.brand.deleteMany({ where: { id: { in: [brandAId, brandBId] } } });
      }
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId, userCId] } } });
    } catch {}
    throw err;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} PHASE B TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runPhaseBVerification().catch((err) => {
  console.error('\n❌ Phase B verification suite failed:', err);
  process.exit(1);
});

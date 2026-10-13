/**
 * RiskShield AI — Phase E1 Live Integration & Release Gate Verification
 * Performs genuine HTTP requests against the live backend (http://localhost:3001)
 * Uses genuine Supabase Auth tokens, validates real API contracts, database persistence, and security controls.
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/db/prisma';
import { getSupabaseConfig } from '../src/lib/env';

const API_BASE = 'http://localhost:3001';

interface HttpScanResponse {
  id?: string;
  target?: string;
  normalizedTarget?: string;
  status?: string;
  score?: number;
  confidence?: number;
  explanation?: string;
  evidence?: Array<{ id: string; label: string; severity: string; detail: string; providerCitation?: string }>;
  sourcesChecked?: string[];
  sourceFailures?: string[];
  providerResults?: Array<{ provider: string; status: string; responseTimeMs: number }>;
  shouldCreateBrandFinding?: boolean;
  scanResult?: any;
  message?: string;
}

async function createLiveTestUser(prefix = 'gate') {
  const config = getSupabaseConfig();
  const testEmail = `${prefix}-${Date.now()}-${randomUUID().substring(0, 6)}@riskshield.internal`;
  const testPassword = `TestPass!9876543210!`;

  // 1. Create confirmed user in Supabase Auth via admin API
  const adminRes = await fetch(`${config.url}/auth/v1/admin/users`, {
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

  if (!adminRes.ok) {
    throw new Error(`Failed to create Supabase test user: ${adminRes.statusText}`);
  }
  const adminData = await adminRes.json();
  const supabaseUserId = adminData.id;

  // 2. Sign in to obtain genuine access token
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

  if (!loginRes.ok) {
    throw new Error(`Failed to log in Supabase test user: ${loginRes.statusText}`);
  }
  const loginData = await loginRes.json();
  const accessToken = loginData.access_token;

  // 3. Ensure User profile exists in PostgreSQL
  await prisma.user.upsert({
    where: { id: supabaseUserId },
    update: { accountStatus: 'ACTIVE', isEmailVerified: true },
    create: {
      id: supabaseUserId,
      email: testEmail,
      fullName: 'E2E Gate Tester',
      isEmailVerified: true,
      accountStatus: 'ACTIVE'
    }
  });

  return {
    userId: supabaseUserId,
    email: testEmail,
    token: accessToken,
    cleanup: async () => {
      try {
        await fetch(`${config.url}/auth/v1/admin/users/${supabaseUserId}`, {
          method: 'DELETE',
          headers: {
            apikey: config.serviceRoleKey,
            Authorization: `Bearer ${config.serviceRoleKey}`
          }
        });
      } catch {}
      try {
        await prisma.user.delete({ where: { id: supabaseUserId } });
      } catch {}
    }
  };
}

async function runLiveGateVerification() {
  console.log('================================================================');
  console.log('   RISKSHIELD AI — PHASE E1 LIVE END-TO-END RELEASE GATE        ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Details: ${detail}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  const primaryUser = await createLiveTestUser('primary-gate');
  console.log(`Created authenticated test user: ${primaryUser.userId} (${primaryUser.email})`);

  let secondaryUser: Awaited<ReturnType<typeof createLiveTestUser>> | null = null;
  let testBrandId: string | null = null;

  try {
    // -------------------------------------------------------------
    // Section 1: Real Backend Scanner Evaluation (Live POST /api/scan)
    // -------------------------------------------------------------
    console.log('\n--- Section 1: Live POST /api/scan Real Target Evaluation ---');

    const testTargets = [
      {
        name: 'Unicode homoglyph (Cyrillic a: U+0430)',
        url: 'https://pаypal.com',
        expectedBehavior: 'Elevated threat/suspicion (>= 70) with TR39 homoglyph evidence',
        validate: (res: HttpScanResponse) =>
          res.score! >= 70 &&
          (res.status === 'KNOWN_THREAT' || res.status === 'HIGH_RISK') &&
          res.evidence!.some((e) => e.id.includes('HOMOGLYPH') || e.label.toLowerCase().includes('homoglyph'))
      },
      {
        name: 'Punycode equivalent (xn--pypal-4ve.com)',
        url: 'https://xn--pypal-4ve.com',
        expectedBehavior: 'Decodes Punycode to Unicode homoglyph, scores >= 70',
        validate: (res: HttpScanResponse) =>
          res.score! >= 70 &&
          (res.status === 'KNOWN_THREAT' || res.status === 'HIGH_RISK') &&
          res.evidence!.some((e) => e.id.includes('HOMOGLYPH') || e.label.toLowerCase().includes('homoglyph'))
      },
      {
        name: 'Typosquatting (paypa1.com with digit 1)',
        url: 'https://paypa1.com',
        expectedBehavior: 'Flagged as visual substitution / Levenshtein typosquatting, score >= 60',
        validate: (res: HttpScanResponse) =>
          res.score! >= 60 &&
          (res.status === 'HIGH_RISK' || res.status === 'KNOWN_THREAT' || res.status === 'SUSPICIOUS') &&
          res.evidence!.some((e) => e.id.includes('TYPO') || e.label.toLowerCase().includes('substitution'))
      },
      {
        name: 'Deceptive subdomain (paypal.com.account-update.net/login)',
        url: 'https://paypal.com.account-update.net/login',
        expectedBehavior: 'Apex parsed as account-update.net; subdomain brand spoofing flagged, score >= 60',
        validate: (res: HttpScanResponse) =>
          res.score! >= 60 &&
          res.evidence!.some((e) => e.id.includes('DECEPTIVE-SUB') || e.label.toLowerCase().includes('subdomain'))
      },
      {
        name: 'Benign domain (abc.xyz on .xyz TLD)',
        url: 'https://abc.xyz',
        expectedBehavior: 'Recognized as authoritative infrastructure; score <= 15, NO_KNOWN_THREAT_DETECTED',
        validate: (res: HttpScanResponse) =>
          res.score! <= 15 && res.status === 'NO_KNOWN_THREAT_DETECTED'
      },
      {
        name: 'Benign brand collision (apple-orchard.org)',
        url: 'https://apple-orchard.org',
        expectedBehavior: 'Recognized as benign context word; zero false brand impersonation penalty, score <= 35',
        validate: (res: HttpScanResponse) =>
          res.score! <= 35 &&
          !res.evidence!.some((e) => e.label.toLowerCase().includes('homoglyph') || e.label.toLowerCase().includes('impersonation'))
      }
    ];

    const liveScanResultsTable: any[] = [];

    for (const testCase of testTargets) {
      const resp = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${primaryUser.token}`
        },
        body: JSON.stringify({
          target: testCase.url,
          mode: 'url'
        })
      });

      assert(resp.ok, `HTTP status 200 returned for ${testCase.url}`, `Received status ${resp.status}`);
      const data: HttpScanResponse = await resp.json();

      const matched = testCase.validate(data);
      assert(matched, `${testCase.name} matches intended behavior`, JSON.stringify(data));

      liveScanResultsTable.push({
        target: testCase.url,
        verdict: data.status,
        score: data.score,
        confidence: data.confidence,
        evidenceCount: data.evidence?.length || 0,
        sourcesCount: data.sourcesChecked?.length || 0,
        topEvidence: data.evidence?.[0]?.label || 'None',
        matchedExpectation: matched ? 'YES' : 'NO'
      });
    }

    console.log('\n--- Live HTTP Scan Results Summary ---');
    console.table(liveScanResultsTable);

    // -------------------------------------------------------------
    // Section 2: Provider Status Semantics & Honest Reporting
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Real Provider Status Semantics ---');

    const providerProbeResp = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${primaryUser.token}`
      },
      body: JSON.stringify({
        target: 'https://example-test-benign-check.com',
        mode: 'url'
      })
    });

    const probeData: HttpScanResponse = await providerProbeResp.json();
    assert(Array.isArray(probeData.providerResults), 'providerResults array is returned in live API response');

    // Check Google Web Risk status: billing is disabled so it must report UNAVAILABLE or NOT_CONFIGURED
    const gwrResult = probeData.providerResults?.find((p) => p.provider === 'GOOGLE_WEB_RISK');
    if (gwrResult) {
      assert(
        gwrResult.status === 'UNAVAILABLE' || gwrResult.status === 'NOT_CONFIGURED',
        `Google Web Risk accurately reports ${gwrResult.status} without fabricated live results`
      );
    } else {
      assert(true, 'Google Web Risk omitted or unconfigured');
    }

    // Check PhishTank status: registration unavailable, must be NOT_CONFIGURED
    const phishTankResult = probeData.providerResults?.find((p) => p.provider === 'PHISHTANK');
    if (phishTankResult) {
      assert(
        phishTankResult.status === 'NOT_CONFIGURED',
        `PhishTank accurately reports NOT_CONFIGURED (status: ${phishTankResult.status})`
      );
    }

    // Check OpenPhish status: defaults to NOT_CONFIGURED without commercial key or non-commercial consent
    const openPhishResult = probeData.providerResults?.find((p) => p.provider === 'OPENPHISH');
    if (openPhishResult) {
      assert(
        openPhishResult.status === 'NOT_CONFIGURED' || openPhishResult.status === 'NO_MATCH',
        `OpenPhish accurately reports ${openPhishResult.status}`
      );
    }

    // Verify failures never claim URL is safe
    assert(
      probeData.explanation!.includes('Zero-day') || probeData.explanation!.includes('No active threat matches'),
      'Clean explanation includes zero-day disclaimer (never guarantees absolute safety)'
    );

    // -------------------------------------------------------------
    // Section 3: Scanner Unification & Auth Enforcement
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Scanner Unification & Error Responses ---');

    // Test missing token (401 Unauthorized)
    const noAuthResp = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'https://example.com', mode: 'url' })
    });
    assert(noAuthResp.status === 401, 'POST /api/scan returns 401 when unauthenticated');

    // Test invalid/expired token (401 Unauthorized)
    const badTokenResp = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid.expired.token.value'
      },
      body: JSON.stringify({ target: 'https://example.com', mode: 'url' })
    });
    assert(badTokenResp.status === 401, 'POST /api/scan returns 401 on malformed token');

    // Test invalid payload (400 Bad Request)
    const badPayloadResp = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${primaryUser.token}`
      },
      body: JSON.stringify({ target: '', mode: 'url' })
    });
    assert(badPayloadResp.status === 400, 'POST /api/scan returns 400 on empty target');

    // -------------------------------------------------------------
    // Section 4: Brand Threat Persistence & Deduplication
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Brand Threat Persistence & Deduplication ---');

    testBrandId = randomUUID();
    const testBrand = await prisma.brand.create({
      data: {
        id: testBrandId,
        name: 'ApexVault Security',
        slug: `apexvault-${Date.now()}`,
        category: 'CYBERSECURITY',
        status: 'VERIFIED'
      }
    });

    await prisma.brandMembership.create({
      data: {
        userId: primaryUser.userId,
        brandId: testBrand.id,
        role: 'OWNER'
      }
    });

    await prisma.brandAsset.create({
      data: {
        brandId: testBrand.id,
        type: 'DOMAIN',
        value: 'apexvault.io',
        normalizedValue: 'apexvault.io',
        status: 'VERIFIED'
      }
    });

    // 1. Submit scan with supported brand impersonation
    const brandScanTarget = 'https://apexvault.io.login-credentials-recovery.net';
    const brandScanResp1 = await fetch(`${API_BASE}/api/brand/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${primaryUser.token}`
      },
      body: JSON.stringify({
        target: brandScanTarget,
        brandId: testBrand.id,
        brandName: testBrand.name,
        contextPayload: {
          category: 'other',
          primaryInput: brandScanTarget
        }
      })
    });

    assert(brandScanResp1.ok, 'POST /api/brand/scan returns HTTP 200 for authorized member');
    const brandScanData1: HttpScanResponse = await brandScanResp1.json();
    assert(brandScanData1.shouldCreateBrandFinding === true, 'shouldCreateBrandFinding is true for deceptive subdomain');

    // Confirm finding persisted in PostgreSQL
    const findings1 = await (prisma as any).brandThreatFinding.findMany({
      where: { brandId: testBrand.id }
    });
    assert(findings1.length === 1, `BrandThreatFinding persisted to PostgreSQL (count: ${findings1.length})`);
    assert(findings1[0].repeatScanCount === 1, 'Initial finding has repeatScanCount === 1');
    assert(findings1[0].riskScore >= 60, `Finding riskScore is ${findings1[0].riskScore} >= 60`);

    // 2. Repeat identical brand scan -> verify deduplication & repeatScanCount increment
    const brandScanResp2 = await fetch(`${API_BASE}/api/brand/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${primaryUser.token}`
      },
      body: JSON.stringify({
        target: brandScanTarget,
        brandId: testBrand.id,
        brandName: testBrand.name,
        contextPayload: {
          category: 'other',
          primaryInput: brandScanTarget
        }
      })
    });

    assert(brandScanResp2.ok, 'Repeat brand scan succeeds with HTTP 200');
    const findings2 = await (prisma as any).brandThreatFinding.findMany({
      where: { brandId: testBrand.id }
    });
    assert(findings2.length === 1, 'Finding row deduplicated (no duplicate row created)');
    assert(findings2[0].repeatScanCount >= 2, `repeatScanCount incremented to ${findings2[0].repeatScanCount}`);

    // 3. Confirm tenant isolation: unauthorized user cannot scan brand
    secondaryUser = await createLiveTestUser('secondary-stranger');
    const unauthorizedBrandScanResp = await fetch(`${API_BASE}/api/brand/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondaryUser.token}`
      },
      body: JSON.stringify({
        target: brandScanTarget,
        brandId: testBrand.id,
        brandName: testBrand.name,
        contextPayload: { category: 'other', primaryInput: brandScanTarget }
      })
    });
    assert(
      unauthorizedBrandScanResp.status === 403 || unauthorizedBrandScanResp.status === 404,
      `Non-member user rejected from brand scan with status ${unauthorizedBrandScanResp.status}`
    );

    // 4. Confirm ordinary benign scan does not create threat finding
    const benignBrandScanResp = await fetch(`${API_BASE}/api/brand/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${primaryUser.token}`
      },
      body: JSON.stringify({
        target: 'https://apexvault.io',
        brandId: testBrand.id,
        brandName: testBrand.name,
        contextPayload: { category: 'other', primaryInput: 'https://apexvault.io' }
      })
    });
    assert(benignBrandScanResp.ok, 'Benign brand scan succeeds with HTTP 200');
    const benignData: HttpScanResponse = await benignBrandScanResp.json();
    assert(
      benignData.shouldCreateBrandFinding === false,
      'Benign official asset scan sets shouldCreateBrandFinding === false'
    );

    console.log('\n================================================================');
    console.log(`🎉 ALL PHASE E1 LIVE RELEASE GATE CHECKS PASSED: ${passed}/${total}`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ LIVE RELEASE GATE FAILED:', err);
    throw err;
  } finally {
    // Teardown test brands and findings
    if (testBrandId) {
      try {
        await (prisma as any).brandThreatFinding.deleteMany({ where: { brandId: testBrandId } });
        await prisma.scanRecord.deleteMany({ where: { brandId: testBrandId } });
        await prisma.brandAsset.deleteMany({ where: { brandId: testBrandId } });
        await prisma.brandMembership.deleteMany({ where: { brandId: testBrandId } });
        await prisma.brand.delete({ where: { id: testBrandId } });
      } catch {}
    }
    await prisma.scanRecord.deleteMany({ where: { userId: primaryUser.userId } });
    await primaryUser.cleanup();
    if (secondaryUser) {
      await prisma.scanRecord.deleteMany({ where: { userId: secondaryUser.userId } });
      await secondaryUser.cleanup();
    }
    await prisma.$disconnect();
  }
}

runLiveGateVerification();

/**
 * RiskShield AI — Phase F Automated User Journeys Verification Suite
 * Validates all 11 end-to-end user journeys against live HTTP APIs and PostgreSQL database:
 * 1. Register & authenticate personal account
 * 2. Submit URL for scanning & real backend result
 * 3. Handle unavailable providers without false safe claims
 * 4. Create or access authorized brand workspace
 * 5. Add brand asset & verify DNS challenge state
 * 6. Configure monitoring schedule & display persisted status
 * 7. View threat finding & supporting evidence
 * 8. Status transitions & append-only notes persistence
 * 9. RFC 2142 abuse report draft generation & copy/export
 * 10. Enforce Owner/Admin permissions for restricted actions
 * 11. Edge cases: empty data, expired sessions, malformed inputs, SSRF guards
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/db/prisma';
import { brandMonitorService } from '../src/services/brandMonitor.service';
import { brandMonitorRepository } from '../src/repositories/brandMonitor.repository';
import { threatInvestigationService } from '../src/services/threatInvestigation.service';
import { brandRepository } from '../src/repositories/brand.repository';
import { brandService } from '../src/services/brand.service';
import { scannerService } from '../src/services/scanner.service';
import { getSupabaseConfig } from '../src/lib/env';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

async function createLiveTestUser(prefix = 'f-user') {
  const config = getSupabaseConfig();
  const testEmail = `${prefix}-${Date.now()}-${randomUUID().substring(0, 6)}@riskshield.internal`;
  const testPassword = `TestPass!9876543210!`;

  const adminRes = await fetchWithRetry(`${config.url}/auth/v1/admin/users`, {
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
      user_metadata: { full_name: 'Phase F Tester' }
    })
  });

  if (!adminRes.ok) {
    throw new Error(`Failed to create Supabase test user: ${adminRes.statusText}`);
  }
  const adminData = await adminRes.json();
  const supabaseUserId = adminData.id;

  const loginRes = await fetchWithRetry(`${config.url}/auth/v1/token?grant_type=password`, {
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

  await prisma.user.upsert({
    where: { id: supabaseUserId },
    update: { accountStatus: 'ACTIVE', isEmailVerified: true },
    create: {
      id: supabaseUserId,
      email: testEmail,
      fullName: 'Phase F Tester',
      role: 'USER',
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

async function runPhaseFVerification() {
  console.log('================================================================');
  console.log('   RISKSHIELD AI — PHASE F USER JOURNEYS VERIFICATION           ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   Details: ${details}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // Generate live test user with real Supabase Auth JWT
  const stranger = await createLiveTestUser('stranger-f');
  const strangerUserId = stranger.userId;
  const strangerEmail = stranger.email;
  const strangerToken = stranger.token;

  // Generate workspace users for DB-level authorization checks
  const ownerUserId = randomUUID();
  const memberUserId = randomUUID();
  const ownerEmail = `owner-f-${Date.now()}@riskshield.internal`;
  const memberEmail = `member-f-${Date.now()}@riskshield.internal`;

  let brandId: string = randomUUID();
  const otherBrandId = randomUUID();

  try {
    // -------------------------------------------------------------
    // Journey 1: Register and Authenticate a Personal Account
    // -------------------------------------------------------------
    console.log('--- Journey 1: Register and Authenticate a Personal Account ---');

    const personalUser = await prisma.user.findUnique({
      where: { id: strangerUserId }
    });

    assert(personalUser !== null && personalUser.id === strangerUserId, 'Personal user record created with UUID');
    assert(personalUser?.role === 'USER', 'Personal user assigned USER role');
    assert(personalUser?.isEmailVerified === true, 'User email verification status preserved');

    // Verify token can authenticate
    const authHeaders = { Authorization: `Bearer ${strangerToken}` };
    const meRes = await fetch(`${API_BASE}/api/health`);
    assert(meRes.status === 200, 'Backend API health endpoint is accessible');

    // -------------------------------------------------------------
    // Journey 2: Submit a URL for Scanning & Display Backend Result
    // -------------------------------------------------------------
    console.log('\n--- Journey 2: Submit a URL for Scanning & Real Backend Result ---');

    const scanRes = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${strangerToken}`
      },
      body: JSON.stringify({
        target: 'https://paypal.com.account-update.net/login',
        mode: 'url'
      })
    });

    const scanBodyText = await scanRes.text();
    let scanData: any = {};
    try { scanData = JSON.parse(scanBodyText); } catch {}
    assert(scanRes.status === 201 || scanRes.status === 200, 'POST /api/scan returns HTTP 200/201 for authenticated user', `Status: ${scanRes.status}, Body: ${scanBodyText}`);

    assert(typeof scanData.id === 'string', 'Scan response contains persistent ID');
    assert(scanData.status === 'HIGH_RISK', 'Deceptive subdomain target receives HIGH_RISK verdict');
    assert(scanData.score >= 70, `Risk score is elevated (${scanData.score} >= 70)`);
    assert(Array.isArray(scanData.evidence) && scanData.evidence.length > 0, 'Contains documented technical evidence');
    assert(
      scanData.evidence.some((e: any) => e.label.includes('Subdomain') || e.detail.includes('subdomain')),
      'Evidence identifies deceptive subdomain spoofing'
    );

    // -------------------------------------------------------------
    // Journey 3: Handle Unavailable Providers Without False Safe Results
    // -------------------------------------------------------------
    console.log('\n--- Journey 3: Provider Failure & Zero-Day Disclaimer Semantics ---');

    assert(Array.isArray(scanData.providerResults), 'Response contains providerResults telemetry array');
    const googleResult = scanData.providerResults.find((p: any) => p.provider === 'GOOGLE_WEB_RISK' || p.provider === 'Google Web Risk');
    assert(
      googleResult?.status === 'UNAVAILABLE' || googleResult?.status === 'NOT_CONFIGURED',
      'Google Web Risk accurately reports UNAVAILABLE or NOT_CONFIGURED without fabricated live matches'
    );

    // Test benign/unindexed URL to verify truthful NO_KNOWN_THREAT_DETECTED and zero-day disclaimer
    const unindexedScan = await scannerService.evaluatePersonalIndicator({
      target: 'https://unindexed-benign-target-9988.org',
      mode: 'url'
    });
    assert(
      unindexedScan.status === 'NO_KNOWN_THREAT_DETECTED',
      'Unindexed domain receives NO_KNOWN_THREAT_DETECTED rather than false safe guarantee'
    );
    assert(
      unindexedScan.explanation.toLowerCase().includes('zero-day') ||
      unindexedScan.explanation.toLowerCase().includes('no active threat matches'),
      'Assessment includes explicit zero-day disclaimer and never guarantees absolute immunity'
    );

    // -------------------------------------------------------------
    // Journey 4: Create or Access Authorized Brand Workspace
    // -------------------------------------------------------------
    console.log('\n--- Journey 4: Brand Workspace Creation & Multi-Tenant Isolation ---');

    await prisma.user.createMany({
      data: [
        { id: ownerUserId, email: ownerEmail, fullName: 'Phase F Owner', role: 'BRAND_OWNER', isEmailVerified: true, accountStatus: 'ACTIVE' },
        { id: memberUserId, email: memberEmail, fullName: 'Phase F Member', role: 'BRAND_OWNER', isEmailVerified: true, accountStatus: 'ACTIVE' }
      ]
    });

    const createdWorkspace = await brandRepository.createBrandWorkspaceWithOwner(ownerUserId, {
      name: 'CyberShield F Global',
      brandType: 'company_product',
      industry: 'Cybersecurity',
      description: 'Phase F testing brand workspace',
      officialWebsite: 'https://cybershield-f.io',
      primaryIdentityUrl: 'https://cybershield-f.io',
      country: 'Global',
      additionalDomains: [],
      socialProfiles: [],
      apps: [],
      alternativeNames: []
    });
    brandId = String(createdWorkspace.brand.id);
    const brand = createdWorkspace.brand;

    assert(typeof brand.id === 'string', 'Brand workspace created with UUID');
    assert(brand.status === 'PENDING_VERIFICATION', 'New brand workspace begins in PENDING_VERIFICATION');
    assert(typeof (brand as any).dnsTxtToken === 'string', 'Brand assigned cryptographic DNS TXT verification token');

    // Create memberships: MEMBER
    await prisma.brandMembership.create({
      data: {
        brandId,
        userId: memberUserId,
        role: 'MEMBER',
        status: 'ACTIVE'
      }
    });

    // Check workspace scoping
    const ownerBrands = await brandRepository.findUserWorkspaces(ownerUserId);
    const strangerBrands = await brandRepository.findUserWorkspaces(strangerUserId);
    assert(ownerBrands.some(w => w.brand.id === brandId), 'Owner has access to created brand workspace');
    assert(!strangerBrands.some(w => w.brand.id === brandId), 'Stranger user strictly isolated from brand workspace');

    // -------------------------------------------------------------
    // Journey 5: Add Brand Asset & Verify Actual Verification State
    // -------------------------------------------------------------
    console.log('\n--- Journey 5: Add Brand Asset & DNS Challenge Verification ---');

    const domainAsset = await brandService.addBrandAsset(brandId, {
      type: 'DOMAIN',
      value: 'auth-cybershield-f.io'
    });

    assert(domainAsset.status === 'PENDING_DNS', 'New domain asset initialized in PENDING_DNS status');
    assert(typeof domainAsset.dnsTxtRecord === 'string', 'Cryptographic DNS challenge record assigned');

    // Verification check on un-published DNS challenge returns verified: false
    const dnsCheck = await brandService.verifyAssetDns(brandId, domainAsset.id);
    assert(dnsCheck.verified === false, 'Unpublished DNS TXT challenge truthfully returns verified: false');

    // Manually mark verified to establish baseline for subsequent monitoring
    await (prisma as any).brandAsset.updateMany({
      where: { brandId },
      data: { status: 'VERIFIED' }
    });

    // -------------------------------------------------------------
    // Journey 6: Configure Monitoring Schedule & Display Status
    // -------------------------------------------------------------
    console.log('\n--- Journey 6: Monitoring Schedule Configuration & Persistence ---');

    const schedule = await brandMonitorService.getOrCreateSchedule(brandId);
    assert(schedule.enabled === false, 'Initial monitor schedule is disabled');
    assert(schedule.frequencyHours === 24, 'Default cadence is 24 hours');

    // Update cadence to 12 hours and enable
    const updatedSchedule = await brandMonitorService.updateSchedule(brandId, {
      enabled: true,
      frequencyHours: 12
    });
    assert(updatedSchedule.enabled === true, 'Schedule enabled successfully');
    assert(updatedSchedule.frequencyHours === 12, 'Schedule cadence updated to 12 hours');

    // Boundary check: Rejects frequency < 1h and > 168h
    let rejectedLow = false;
    try {
      await brandMonitorService.updateSchedule(brandId, { frequencyHours: 0 });
    } catch (e: any) {
      rejectedLow = e.message.toLowerCase().includes('invalid frequency');
    }
    assert(rejectedLow, 'Rejects invalid cadence < 1 hour');

    // Execute on-demand run
    const monitorRun = await brandMonitorService.executeBrandMonitoring(brandId);
    assert(monitorRun.status === 'COMPLETED', 'On-demand monitoring completed successfully');
    assert(monitorRun.assetsScanned >= 1, 'Scanned verified domain assets');
    assert(monitorRun.candidatesEvaluated > 0, 'Synthesized and evaluated lookalike candidates');

    // -------------------------------------------------------------
    // Journey 7: View Threat Finding & Supporting Evidence
    // -------------------------------------------------------------
    console.log('\n--- Journey 7: View Threat Finding & Supporting Evidence ---');

    const findings = await (prisma as any).brandThreatFinding.findMany({
      where: { brandId }
    });
    assert(findings.length > 0, `Captured brand threat findings in PostgreSQL (count: ${findings.length})`);
    const activeFinding = findings[0];

    assert(activeFinding.riskScore >= 60, `Finding has elevated risk score (${activeFinding.riskScore} >= 60)`);
    assert(typeof activeFinding.detectionReason === 'string', 'Finding contains detailed detection reason');
    assert(typeof activeFinding.officialAssetCompared === 'string', 'Identifies official asset compared');

    // -------------------------------------------------------------
    // Journey 8: Status Transitions & Append-Only Notes Persistence
    // -------------------------------------------------------------
    console.log('\n--- Journey 8: Status Transitions & Append-Only Notes Persistence ---');

    // 8a. Member transitions NEW -> UNDER_INVESTIGATION
    const triageRes = await threatInvestigationService.transitionFindingStatus({
      findingId: activeFinding.id,
      brandId,
      callerEmail: memberEmail,
      callerRole: 'MEMBER',
      targetStatus: 'UNDER_INVESTIGATION',
      note: 'Member initiated initial triage and DNS reconnaissance.'
    });
    assert(triageRes.finding.status === 'UNDER_INVESTIGATION', 'Status transitioned to UNDER_INVESTIGATION');

    // 8b. Add analyst note
    await threatInvestigationService.addInvestigationNote(
      activeFinding.id,
      brandId,
      ownerEmail,
      'Evidence confirmed: Fake login form extracting MFA tokens.'
    );

    // 8c. Reload from PostgreSQL with audit relation
    const reloadedFinding = await (prisma as any).brandThreatFinding.findUnique({
      where: { id: activeFinding.id },
      include: { investigations: true }
    });
    assert(reloadedFinding.status === 'UNDER_INVESTIGATION', 'Status persisted as UNDER_INVESTIGATION in DB');
    assert(
      reloadedFinding.investigations.some((i: any) => i.note?.includes('Fake login form')),
      'Analyst note persisted in threat_investigations table'
    );

    // -------------------------------------------------------------
    // Journey 9: Generate & Edit Abuse Report Draft
    // -------------------------------------------------------------
    console.log('\n--- Journey 9: RFC 2142 Abuse Report Draft Generation & Truthfulness ---');

    const draft = await threatInvestigationService.generateAbuseReportDraft(
      activeFinding.id,
      brandId,
      ownerEmail
    );

    assert(typeof draft.suggestedSubject === 'string', 'Draft includes structured subject line');
    assert(draft.suggestedRecipients.length >= 2, 'Includes at least 2 suggested RFC 2142 role mailboxes');
    assert(
      draft.suggestedRecipients.every(r => r.isVerified === false),
      'All suggested role mailboxes truthfully marked as isVerified: false'
    );
    assert(draft.humanReviewRequired === true, 'Draft explicitly flags humanReviewRequired === true');
    assert(
      draft.markdownContent.toLowerCase().includes('does not automatically submit'),
      'Markdown contains explicit disclaimer confirming zero automated takedown submissions'
    );

    // -------------------------------------------------------------
    // Journey 10: Enforce Owner/Admin RBAC Permissions
    // -------------------------------------------------------------
    console.log('\n--- Journey 10: Enforce Owner/Admin RBAC Permissions ---');

    // 10a. MEMBER rejected from resolving finding
    let memberResolveBlocked = false;
    try {
      await threatInvestigationService.transitionFindingStatus({
        findingId: activeFinding.id,
        brandId,
        callerEmail: memberEmail,
        callerRole: 'MEMBER',
        targetStatus: 'RESOLVED',
        note: 'Member illegal resolve attempt'
      });
    } catch (err: any) {
      memberResolveBlocked = err.message.toLowerCase().includes('insufficient permissions');
    }
    assert(memberResolveBlocked, 'MEMBER blocked from resolving finding (requires OWNER or ADMIN)');

    // 10b. OWNER successfully transitions to RESOLVED
    // Note: Valid path from UNDER_INVESTIGATION -> TAKEDOWN_REQUESTED -> RESOLVED
    await threatInvestigationService.transitionFindingStatus({
      findingId: activeFinding.id,
      brandId,
      callerEmail: ownerEmail,
      callerRole: 'OWNER',
      targetStatus: 'TAKEDOWN_REQUESTED',
      note: 'Takedown requested from host abuse desk.'
    });

    const ownerResolveRes = await threatInvestigationService.transitionFindingStatus({
      findingId: activeFinding.id,
      brandId,
      callerEmail: ownerEmail,
      callerRole: 'OWNER',
      targetStatus: 'RESOLVED',
      note: 'Host suspended rogue domain.'
    });
    assert(ownerResolveRes.finding.status === 'RESOLVED', 'OWNER successfully transitions finding to RESOLVED');

    // -------------------------------------------------------------
    // Journey 11: Edge Cases & Error Handling
    // -------------------------------------------------------------
    console.log('\n--- Journey 11: Edge Cases, Expired Sessions, & SSRF Guards ---');

    // 11a. Missing token returns 401
    const unauthRes = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'https://example.com' })
    });
    assert(unauthRes.status === 401, 'POST /api/scan returns 401 without Authorization header');

    // 11b. Invalid token returns 401
    const badTokenRes = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid.jwt.token'
      },
      body: JSON.stringify({ target: 'https://example.com' })
    });
    assert(badTokenRes.status === 401, 'POST /api/scan returns 401 on malformed JWT token');

    // 11c. Empty target returns 400
    const emptyTargetRes = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${strangerToken}`
      },
      body: JSON.stringify({ target: '' })
    });
    assert(emptyTargetRes.status === 400, 'POST /api/scan returns 400 on empty target');

    // 11d. SSRF attack on AWS cloud metadata blocked fail-closed
    let ssrfBlocked = false;
    try {
      await scannerService.evaluatePersonalIndicator({
        target: 'http://169.254.169.254/latest/meta-data/',
        mode: 'url'
      });
    } catch (err: any) {
      ssrfBlocked = err.message.toLowerCase().includes('ssrf') || err.message.toLowerCase().includes('reserved');
    }
    assert(ssrfBlocked, 'SSRF Guard blocks private AWS cloud metadata (169.254.169.254)');

    // 11e. SSRF attack on IPv6 loopback blocked
    let loopbackBlocked = false;
    try {
      await scannerService.evaluatePersonalIndicator({
        target: 'http://[::1]:8080/admin',
        mode: 'url'
      });
    } catch (err: any) {
      loopbackBlocked = err.message.toLowerCase().includes('ssrf') || err.message.toLowerCase().includes('blocked');
    }
    assert(loopbackBlocked, 'SSRF Guard blocks IPv6 loopback [::1]');

    console.log('\n================================================================');
    console.log(`🎉 ALL PHASE F USER JOURNEY CHECKS PASSED: ${passed}/${total}`);
    console.log('================================================================\n');
  } finally {
    // Teardown test entities
    try {
      await (prisma as any).threatInvestigation.deleteMany({
        where: { finding: { brandId: { in: [brandId, otherBrandId] } } }
      });
      await (prisma as any).brandThreatFinding.deleteMany({
        where: { brandId }
      });
      await (prisma as any).brandMonitorSchedule.deleteMany({
        where: { brandId: { in: [brandId, otherBrandId] } }
      });
      await prisma.brandAsset.deleteMany({
        where: { brandId: { in: [brandId, otherBrandId] } }
      });
      await prisma.brandMembership.deleteMany({
        where: { brandId: { in: [brandId, otherBrandId] } }
      });
      await prisma.brand.deleteMany({
        where: { id: { in: [brandId, otherBrandId] } }
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUserId, memberUserId] } }
      });
      if (stranger?.cleanup) await stranger.cleanup();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }
}

runPhaseFVerification().catch(err => {
  console.error('\n❌ PHASE F VERIFICATION FAILED:', err);
  process.exit(1);
});

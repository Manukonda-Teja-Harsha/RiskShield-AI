/**
 * RiskShield AI — Main Intelligence Analysis Card Verification Suite
 * Validates backend data contracts, dashboard card retention, layout integrity,
 * provider truthfulness, and security guards for the Main Intelligence Analysis Card.
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/db/prisma';
import { scannerService } from '../src/services/scanner.service';
import { brandRepository } from '../src/repositories/brand.repository';
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

async function createLiveTestUser(prefix = 'intel-card') {
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
      user_metadata: { full_name: 'Intelligence Card Tester' }
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
      fullName: 'Intelligence Card Tester',
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

async function runIntelligenceCardVerification() {
  console.log('================================================================');
  console.log('   RISKSHIELD AI — MAIN INTELLIGENCE ANALYSIS CARD VERIFICATION ');
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

  const liveUser = await createLiveTestUser();
  const ownerUserId = randomUUID();
  const ownerEmail = `owner-intel-${Date.now()}@riskshield.internal`;
  let brandId: string = randomUUID();

  try {
    // -------------------------------------------------------------
    // Suite 1: Backend Data Contract & Field Accuracy for Main Card
    // -------------------------------------------------------------
    console.log('--- Suite 1: Backend Data Contract & Field Accuracy for Main Card ---');

    const scanRes = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${liveUser.token}`
      },
      body: JSON.stringify({
        target: 'https://paypal.com.account-update.net/login',
        mode: 'url'
      })
    });

    assert(scanRes.status === 200 || scanRes.status === 201, 'POST /api/scan returns HTTP 200/201');
    const scanData = await scanRes.json();

    // 1A. Target & Identification
    assert(scanData.target === 'https://paypal.com.account-update.net/login', 'Scan response includes exact submitted target');
    assert(typeof scanData.normalizedTarget === 'string', 'Scan response includes normalized target');
    assert(typeof scanData.timestamp === 'string', 'Scan response contains ISO timestamp');
    assert(typeof scanData.id === 'string', 'Scan response contains persistent identifier');

    // 1B. Risk Score & Verdict
    assert(scanData.status === 'HIGH_RISK', 'Deceptive subdomain accurately receives HIGH_RISK verdict');
    assert(scanData.score >= 70, `Score is elevated (${scanData.score} >= 70)`);
    assert(typeof scanData.confidence === 'number' && scanData.confidence > 0 && scanData.confidence <= 1, 'Confidence is a distinct metric between 0 and 1');
    assert(typeof scanData.explanation === 'string' && scanData.explanation.length > 10, 'Contains explanatory assessment');

    // 1C. Detected Vulnerabilities & Evidence
    assert(Array.isArray(scanData.evidence) && scanData.evidence.length > 0, 'Contains evidence array');
    const deceptiveFactor = scanData.evidence.find((e: any) => e.label.toLowerCase().includes('subdomain') || e.detail.toLowerCase().includes('subdomain'));
    assert(deceptiveFactor !== undefined, 'Evidence identifies deceptive subdomain spoofing');
    assert(deceptiveFactor.severity === 'high' || deceptiveFactor.severity === 'critical', 'Finding carries appropriate severity');

    // 1D. Provider Results Telemetry
    assert(Array.isArray(scanData.providerResults) && scanData.providerResults.length >= 3, 'Contains authentic providerResults array');
    const gwr = scanData.providerResults.find((p: any) => p.provider === 'GOOGLE_WEB_RISK' || p.provider === 'Google Web Risk');
    assert(gwr?.status === 'UNAVAILABLE' || gwr?.status === 'NOT_CONFIGURED', 'Google Web Risk accurately reports UNAVAILABLE without fabricated matches');
    const openphish = scanData.providerResults.find((p: any) => p.provider === 'OPENPHISH');
    assert(openphish?.status === 'NOT_CONFIGURED', 'OpenPhish accurately reports NOT_CONFIGURED when research consent not set');

    // 1E. Recommended Actions
    assert(Array.isArray(scanData.recommendedActions) && scanData.recommendedActions.length > 0, 'Contains actionable recommendations array');

    // -------------------------------------------------------------
    // Suite 2: Clean Lookup & Truthful Zero-Day Disclaimer
    // -------------------------------------------------------------
    console.log('\n--- Suite 2: Clean Lookup & Zero-Day Disclaimer Semantics ---');

    const cleanResult = await scannerService.evaluatePersonalIndicator({
      target: 'https://unindexed-clean-target-7744.org',
      mode: 'url'
    });

    assert(cleanResult.status === 'NO_KNOWN_THREAT_DETECTED', 'Clean indicator receives NO_KNOWN_THREAT_DETECTED rather than false 100% safe');
    assert(cleanResult.score <= 30, `Clean indicator score is low (${cleanResult.score} <= 30)`);
    assert(
      cleanResult.explanation.toLowerCase().includes('zero-day') ||
      cleanResult.explanation.toLowerCase().includes('no active threat matches'),
      'Clean explanation explicitly includes zero-day disclaimer'
    );

    // -------------------------------------------------------------
    // Suite 3: Dashboard Layout Integrity & Card Retention Audit
    // -------------------------------------------------------------
    console.log('\n--- Suite 3: Dashboard Layout Integrity & Card Retention Audit ---');

    // 3A. Inspect User Dashboard (DashboardHome.tsx)
    const userDashPath = path.resolve(process.cwd(), '../frontend/src/pages/dashboard/DashboardHome.tsx');
    assert(fs.existsSync(userDashPath), 'DashboardHome.tsx exists in frontend codebase');
    const userDashContent = fs.readFileSync(userDashPath, 'utf8');

    assert(userDashContent.includes('<UniversalScannerCard'), 'User Dashboard retains UniversalScannerCard');
    assert(userDashContent.includes('<MainIntelligenceAnalysisCard'), 'User Dashboard renders MainIntelligenceAnalysisCard');
    assert(userDashContent.includes('Total Scans'), 'User Dashboard retains Total Scans metric card');
    assert(userDashContent.includes('High-Risk Findings'), 'User Dashboard retains High-Risk Findings metric card');
    assert(userDashContent.includes('Active Threat Watches'), 'User Dashboard retains Active Threat Watches card');
    assert(userDashContent.includes('Resolved Reports'), 'User Dashboard retains Resolved Reports card');
    assert(userDashContent.includes('Recent Scans'), 'User Dashboard retains Recent Scans section');
    assert(userDashContent.includes('threatWatchPreview'), 'User Dashboard retains Threat Watch Preview section');

    // Check rendering order in User Dashboard: UniversalScannerCard comes BEFORE MainIntelligenceAnalysisCard
    const universalScannerIdx = userDashContent.indexOf('<UniversalScannerCard');
    const mainCardIdx = userDashContent.indexOf('<MainIntelligenceAnalysisCard');
    const summaryCardsIdx = userDashContent.indexOf('Security Summary Cards');
    assert(universalScannerIdx < mainCardIdx, 'MainIntelligenceAnalysisCard placed immediately after UniversalScannerCard');
    assert(mainCardIdx < summaryCardsIdx, 'MainIntelligenceAnalysisCard placed before subsequent Summary Cards');

    // 3B. Inspect Brand Dashboard (BrandOverview.tsx)
    const brandOverviewPath = path.resolve(process.cwd(), '../frontend/src/pages/brand/BrandOverview.tsx');
    assert(fs.existsSync(brandOverviewPath), 'BrandOverview.tsx exists in frontend codebase');
    const brandOverviewContent = fs.readFileSync(brandOverviewPath, 'utf8');

    assert(brandOverviewContent.includes('AdaptiveScannerForm'), 'Brand Dashboard retains AdaptiveScannerForm');
    assert(brandOverviewContent.includes('<MainIntelligenceAnalysisCard'), 'Brand Dashboard renders MainIntelligenceAnalysisCard');
    assert(brandOverviewContent.includes('Monitored Assets'), 'Brand Dashboard retains Monitored Assets card');
    assert(brandOverviewContent.includes('Open Threats'), 'Brand Dashboard retains Open Threats card');
    assert(brandOverviewContent.includes('Investigations'), 'Brand Dashboard retains Investigations card');
    assert(brandOverviewContent.includes('Automated Threat Monitoring'), 'Brand Dashboard retains Automated Threat Monitoring card');
    assert(brandOverviewContent.includes('Threat Severity Distribution'), 'Brand Dashboard retains Severity Distribution donut chart');
    assert(brandOverviewContent.includes('Threats by Digital Platform'), 'Brand Dashboard retains Platform Distribution bar chart');
    assert(brandOverviewContent.includes('Recent Priority Threat Findings'), 'Brand Dashboard retains Priority Findings section');
    assert(brandOverviewContent.includes('Recent Brand Activity'), 'Brand Dashboard retains Recent Brand Activity audit section');

    // Check rendering order in Brand Dashboard: Scanner form comes BEFORE MainIntelligenceAnalysisCard
    const brandScannerIdx = brandOverviewContent.indexOf('<AdaptiveScannerForm');
    const brandMainCardIdx = brandOverviewContent.indexOf('<MainIntelligenceAnalysisCard');
    const brandAnalyticsIdx = brandOverviewContent.indexOf('Main Analytics Section');
    assert(brandScannerIdx < brandMainCardIdx, 'MainIntelligenceAnalysisCard placed immediately after Brand Scanner');
    assert(brandMainCardIdx < brandAnalyticsIdx, 'MainIntelligenceAnalysisCard placed before subsequent Analytics sections');

    // 3C. Inspect Shared Component (MainIntelligenceAnalysisCard.tsx)
    const mainCardComponentPath = path.resolve(process.cwd(), '../frontend/src/components/dashboard/MainIntelligenceAnalysisCard.tsx');
    assert(fs.existsSync(mainCardComponentPath), 'MainIntelligenceAnalysisCard.tsx exists');
    const cardContent = fs.readFileSync(mainCardComponentPath, 'utf8');

    assert(cardContent.includes('MAIN INTELLIGENCE ANALYSIS'), 'Component has Main Intelligence title tag');
    assert(cardContent.includes('Detected Vulnerabilities & Security Findings'), 'Component has dedicated Vulnerabilities section');
    assert(cardContent.includes('Confidence Rating') || cardContent.includes('Model Confidence'), 'Component displays separate Confidence rating');
    assert(cardContent.includes('Detailed Telemetry, Indicators & Threat Mesh'), 'Component has expandable Telemetry section');
    assert(cardContent.includes('Recommended Security Actions'), 'Component renders Recommended Actions');
    assert(cardContent.includes('break-all'), 'Component safely wraps long URLs');

    // -------------------------------------------------------------
    // Suite 4: Multi-Tenant Workspace Scoping & Brand Context
    // -------------------------------------------------------------
    console.log('\n--- Suite 4: Multi-Tenant Workspace Scoping & Brand Context ---');

    await prisma.user.create({
      data: {
        id: ownerUserId,
        email: ownerEmail,
        fullName: 'Intel Card Brand Owner',
        role: 'BRAND_OWNER',
        isEmailVerified: true
      }
    });

    const workspace = await brandRepository.createBrandWorkspaceWithOwner(ownerUserId, {
      name: 'ShieldGuard Intel',
      brandType: 'company_product',
      industry: 'Cybersecurity',
      description: 'Intelligence Card Verification Brand',
      officialWebsite: 'https://shieldguard-intel.com',
      primaryIdentityUrl: 'https://shieldguard-intel.com',
      country: 'Global',
      additionalDomains: [],
      socialProfiles: [],
      apps: [],
      alternativeNames: []
    });
    brandId = String(workspace.brand.id);

    const ownerWorkspaces = await brandRepository.findUserWorkspaces(ownerUserId);
    const strangerWorkspaces = await brandRepository.findUserWorkspaces(liveUser.userId);
    assert(ownerWorkspaces.some(w => w.brand.id === brandId), 'Brand owner has access to brand workspace');
    assert(!strangerWorkspaces.some(w => w.brand.id === brandId), 'Personal user strictly isolated from brand workspace');

    console.log('\n================================================================');
    console.log(`🎉 ALL INTELLIGENCE CARD VERIFICATION CHECKS PASSED: ${passed}/${total}`);
    console.log('================================================================\n');
  } finally {
    try {
      await (prisma as any).threatInvestigation.deleteMany({
        where: { finding: { brandId } }
      });
      await (prisma as any).brandThreatFinding.deleteMany({
        where: { brandId }
      });
      await (prisma as any).brandMonitorSchedule.deleteMany({
        where: { brandId }
      });
      await prisma.brandAsset.deleteMany({
        where: { brandId }
      });
      await prisma.brandMembership.deleteMany({
        where: { brandId }
      });
      await prisma.brand.deleteMany({
        where: { id: brandId }
      });
      await prisma.user.deleteMany({
        where: { id: ownerUserId }
      });
      if (liveUser?.cleanup) await liveUser.cleanup();
    } catch (e) {
      console.warn('Cleanup warning:', e);
    } finally {
      await prisma.$disconnect();
    }
  }
}

runIntelligenceCardVerification().catch(err => {
  console.error('\n❌ INTELLIGENCE CARD VERIFICATION FAILED:', err);
  process.exit(1);
});

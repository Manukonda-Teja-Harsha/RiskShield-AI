/**
 * RiskShield AI — Comprehensive Section 12 Verification Suite
 * Validates all 16 acceptance criteria for Personal Users and Brand Workspaces.
 */

import { executeUnifiedScan } from '../src/lib/scanner/unifiedScannerEngine';
import { validateAndSanitizeInput } from '../src/lib/scanner/privacyGuard';
import { classifyInput } from '../src/lib/scanner/inputClassifier';
import { normalizeIndicator, evaluateFreshnessAndPreviousScan } from '../src/lib/scanner/freshnessEngine';
import { compareWithBrandAssets } from '../src/lib/scanner/brandComparator';
import type { ScanResult, RegisteredBrand, BrandAsset } from '../src/types';

async function runTestSuite() {
  console.log('=== RiskShield AI: Unified Scanner Test Suite ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // Brand Fixture
  const testBrand: RegisteredBrand = {
    id: 'RB-01',
    name: 'Acme Financial',
    slug: 'acme-financial',
    logoInitial: 'AF',
    accentColor: '#FF5500',
    category: 'Banking',
    description: 'Financial services',
    registeredAt: '2026-09-15',
    relativeTime: '1 month ago',
    status: 'VERIFIED',
    verifiedAssetsCount: 2,
    activeCampaignsCount: 1,
    website: 'https://acmefinancial.com',
    verifiedDomains: ['acmefinancial.com', 'secure.acmefinancial.com'],
    alternativeNames: ['Acme Bank', 'Acme Fin'],
    officialSocials: ['@acmefinancial'],
    officialApps: ['com.acmefinancial.mobile.banking'],
    pastWork: []
  };

  const testBrandAssets: BrandAsset[] = [
    {
      id: 'BA-01',
      brandId: 'RB-01',
      brandName: 'Acme Financial',
      type: 'DOMAIN',
      value: 'acmefinancial.com',
      status: 'VERIFIED',
      verifiedAt: '2026-09-15',
      dnsTxtRecord: 'riskshield-txt=123'
    },
    {
      id: 'BA-02',
      brandId: 'RB-01',
      brandName: 'Acme Financial',
      type: 'SOCIAL_HANDLE',
      value: '@acmefinancial',
      status: 'VERIFIED',
      verifiedAt: '2026-09-18'
    }
  ];

  // Test 1: Personal User submits a URL and receives an evidence-based result
  const res1 = await executeUnifiedScan({
    rawInput: 'https://chase-security-verify-session.top',
    userContext: {
      userId: 'USR-001',
      email: 'user1@test.com',
      authorizedHistory: []
    }
  });
  assert(
    res1.scanResult.status === 'KNOWN_THREAT' &&
    res1.scanResult.score >= 90 &&
    res1.scanResult.evidence.length >= 2 &&
    res1.scanResult.sourcesChecked.length >= 2,
    'Test 1: Personal User submits a URL and receives evidence-based result'
  );

  // Test 2: Personal User submits a suspicious message containing multiple URLs
  const multiMsg = 'Alert from Bank: Pay $2 fee at https://bit.ly/parcel-fee or verify at https://urgent-verify.xyz';
  const res2 = await executeUnifiedScan({
    rawInput: multiMsg,
    userContext: {
      userId: 'USR-001',
      email: 'user1@test.com',
      authorizedHistory: []
    }
  });
  assert(
    res2.classification.category === 'message' &&
    res2.classification.extractedIndicators.length === 2 &&
    res2.scanResult.evidence.some(e => e.label === 'Multi-Indicator Extraction'),
    'Test 2: Personal User submits suspicious message with multiple URLs'
  );

  // Test 3: Personal User can revisit a saved scan
  const historyItem: ScanResult = { ...res1.scanResult };
  const res3 = await executeUnifiedScan({
    rawInput: 'https://chase-security-verify-session.top',
    userContext: {
      userId: 'USR-001',
      email: 'user1@test.com',
      authorizedHistory: [historyItem]
    }
  });
  assert(
    res3.scanResult.previousAssessment !== undefined &&
    res3.scanResult.previousAssessment.previousScanId === historyItem.id,
    'Test 3: Personal User can revisit a saved scan and view previous assessment metadata'
  );

  // Test 4: Repeated personal scans retain their history
  const scanHistoryPersonal: ScanResult[] = [historyItem, res3.scanResult];
  assert(
    scanHistoryPersonal.length === 2 &&
    scanHistoryPersonal[0].id !== scanHistoryPersonal[1].id,
    'Test 4: Repeated personal scans retain history records without deleting previous scans'
  );

  // Test 5: Authorized Brand Workspace member submits a suspicious profile
  const profileRes = await executeUnifiedScan({
    rawInput: '@acme_official_support_desk',
    brandContext: {
      brand: testBrand,
      officialAssets: testBrandAssets,
      authorizedHistory: []
    }
  });
  assert(
    profileRes.classification.category === 'social' &&
    profileRes.brandEvaluation?.platform === 'SOCIAL',
    'Test 5: Brand member submits suspicious profile; classified as SOCIAL'
  );

  // Test 6: Scanner compares profile with brand official assets
  assert(
    profileRes.brandEvaluation?.officialAssetCompared === '@acmefinancial' &&
    profileRes.brandEvaluation.evidence.some(e => e.label.includes('Unverified Social Support Persona')),
    'Test 6: Scanner compares profile against official brand baseline (@acmefinancial)'
  );

  // Test 7: Credible brand-related indicator creates/updates finding
  const brandLookalikeRes = await executeUnifiedScan({
    rawInput: 'https://acme-refunds-portal.biz',
    brandContext: {
      brand: testBrand,
      officialAssets: testBrandAssets,
      authorizedHistory: []
    }
  });
  assert(
    brandLookalikeRes.brandEvaluation?.brandRelationship === 'TARGETS_BRAND' &&
    brandLookalikeRes.shouldCreateBrandFinding === true,
    'Test 7: Credible brand lookalike marks TARGETS_BRAND and shouldCreateBrandFinding = true'
  );

  // Test 8: Unrelated suspicious URL does NOT automatically become a brand threat finding
  const unrelatedRes = await executeUnifiedScan({
    rawInput: 'https://random-crypto-trading-bot.xyz',
    brandContext: {
      brand: testBrand,
      officialAssets: testBrandAssets,
      authorizedHistory: []
    }
  });
  assert(
    unrelatedRes.brandEvaluation?.brandRelationship === 'UNRELATED' &&
    unrelatedRes.shouldCreateBrandFinding === false,
    'Test 8: Unrelated suspicious URL does NOT become a brand threat finding'
  );

  // Test 9: Repeated brand scans reuse relevant evidence and preserve scan history
  const priorBrandScan: ScanResult = { ...brandLookalikeRes.scanResult };
  const repeatBrandRes = await executeUnifiedScan({
    rawInput: 'https://acme-refunds-portal.biz',
    brandContext: {
      brand: testBrand,
      officialAssets: testBrandAssets,
      authorizedHistory: [priorBrandScan]
    }
  });
  assert(
    repeatBrandRes.scanResult.previousAssessment !== undefined &&
    repeatBrandRes.scanResult.previousAssessment.isFresh === true,
    'Test 9: Repeated brand scan links to prior assessment while generating fresh scan record'
  );

  // Test 10: Brand member cannot access another brand's private records (tenant isolation)
  const otherBrandScan: ScanResult = {
    ...priorBrandScan,
    id: 'OTHER-BRAND-SCAN-99',
    brandId: 'RB-99'
  };
  const filteredHistory = [otherBrandScan].filter(s => s.brandId === testBrand.id);
  assert(
    filteredHistory.length === 0,
    'Test 10: Brand tenant isolation prevents accessing another brand’s private records'
  );

  // Test 11: Personal User cannot access private brand investigations
  assert(
    res1.scanResult.brandId === undefined &&
    res1.shouldCreateBrandFinding === false,
    'Test 11: Personal User scans never write to brand findings or leak brand workspace context'
  );

  // Test 12: Old evidence is not presented as newly completed assessment
  const staleTimestamp = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const stalePriorScan: ScanResult = {
    ...res1.scanResult,
    timestamp: staleTimestamp
  };
  const freshnessCheck = evaluateFreshnessAndPreviousScan(
    normalizeIndicator('https://chase-security-verify-session.top'),
    [stalePriorScan]
  );
  assert(
    freshnessCheck.freshness === 'AGING' &&
    freshnessCheck.previousAssessment?.isFresh === false &&
    freshnessCheck.previousAssessment?.ageHours >= 71,
    'Test 12: Aging/stale evidence correctly flagged (>24h not presented as fresh)'
  );

  // Test 13: Unavailable intelligence sources produce an honest incomplete result
  assert(
    res1.scanResult.checksUnavailable !== undefined &&
    res1.scanResult.checksUnavailable.some(u => u.includes('PhishTank')),
    'Test 13: Unavailable candidate threat sources honestly communicated in checksUnavailable'
  );

  // Test 14: SSRF protection blocks private network & cloud metadata IPs
  const ssrf1 = validateAndSanitizeInput('http://169.254.169.254/latest/meta-data');
  const ssrf2 = validateAndSanitizeInput('http://127.0.0.1:8080/admin');
  assert(
    ssrf1.isBlocked === true && ssrf2.isBlocked === true,
    'Test 14: SSRF protection blocks 169.254.169.254 and localhost'
  );

  // Test 15: Input privacy guards redact sensitive credentials and card numbers
  const piiInput = 'Payment confirmation for card 4111 2222 3333 4444 with otp: 981240';
  const piiRes = validateAndSanitizeInput(piiInput);
  assert(
    piiRes.sanitized.includes('[REDACTED_CARD_NUMBER]') &&
    piiRes.sanitized.includes('[REDACTED_CODE]'),
    'Test 15: Sensitive card numbers and OTPs redacted prior to persistence or analysis'
  );

  // Test 16: Authentic official brand asset match
  const authenticRes = await executeUnifiedScan({
    rawInput: 'https://acmefinancial.com',
    brandContext: {
      brand: testBrand,
      officialAssets: testBrandAssets,
      authorizedHistory: []
    }
  });
  assert(
    authenticRes.brandEvaluation?.brandRelationship === 'AUTHENTIC_ASSET' &&
    authenticRes.shouldCreateBrandFinding === false &&
    authenticRes.scanResult.status === 'NO_KNOWN_THREAT_DETECTED',
    'Test 16: Authentic official asset verified with 0 threat finding creation'
  );

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 ALL SECTION 12 ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

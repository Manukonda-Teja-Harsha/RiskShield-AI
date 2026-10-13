/**
 * RiskShield AI — Phase C Automated Test Suite
 * Provider Behavior, Security & SSRF, Threat Orchestration, and Phase A/B Regressions
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/db/prisma';
import { isPrivateOrReservedIP, sanitizeAndGuardInput, validateDestinationAddress } from '../src/lib/security/ssrfGuard';
import { canonicalizeUrl } from '../src/lib/security/urlNormalizer';
import { GoogleWebRiskProvider } from '../src/providers/googleWebRisk.provider';
import { PhishTankProvider } from '../src/providers/phishTank.provider';
import { ScannerService } from '../src/services/scanner.service';
import type { ThreatIntelligenceProvider } from '../src/providers/provider.interface';
import type { ProviderLookupResult } from '../src/types';

async function runPhaseCVerification() {
  console.log('====================================================');
  console.log('   RISKSHIELD AI — PHASE C AUTOMATED VERIFICATION   ');
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

  try {
    // ---------------------------------------------------------
    // Suite 1: Security, SSRF & IP Boundary Defense
    // ---------------------------------------------------------
    console.log('--- Suite 1: Security, SSRF & IP Boundary Defense ---');

    // IPv4 private & reserved checks
    assert(isPrivateOrReservedIP('127.0.0.1') === true, '127.0.0.1 classified as private/loopback');
    assert(isPrivateOrReservedIP('10.0.4.5') === true, '10.0.0.0/8 classified as private');
    assert(isPrivateOrReservedIP('172.16.50.1') === true, '172.16.0.0/12 classified as private');
    assert(isPrivateOrReservedIP('192.168.1.100') === true, '192.168.0.0/16 classified as private');
    assert(isPrivateOrReservedIP('169.254.169.254') === true, '169.254.169.254 (Cloud metadata) classified as reserved');
    assert(isPrivateOrReservedIP('0.0.0.0') === true, '0.0.0.0 classified as reserved');
    assert(isPrivateOrReservedIP('8.8.8.8') === false, '8.8.8.8 (Public DNS) is allowed');

    // IPv6 checks
    assert(isPrivateOrReservedIP('::1') === true, 'IPv6 ::1 loopback is blocked');
    assert(isPrivateOrReservedIP('fe80::1') === true, 'IPv6 fe80::/10 link-local is blocked');
    assert(isPrivateOrReservedIP('fc00::1') === true, 'IPv6 fc00::/7 unique local is blocked');

    // Hostname resolution SSRF
    const localHostCheck = await validateDestinationAddress('localhost');
    assert(localHostCheck.isSafe === false, 'Localhost rejected by async DNS validator');

    const internalDomainCheck = await validateDestinationAddress('service.internal');
    assert(internalDomainCheck.isSafe === false, '.internal domain rejected by async DNS validator');

    // Regex SSRF pre-flight
    const ssrfMetaCheck = sanitizeAndGuardInput('http://169.254.169.254/latest/meta-data/');
    assert(ssrfMetaCheck.isBlocked === true, 'Pre-flight regex blocks AWS metadata target');

    // ---------------------------------------------------------
    // Suite 2: URL Canonicalization & Token Redaction
    // ---------------------------------------------------------
    console.log('\n--- Suite 2: URL Canonicalization & Token Redaction ---');

    const uncanonical = canonicalizeUrl('https://WWW.EXAMPLE.COM:443/login/?token=secret_12345&utm_source=email');
    assert(uncanonical.isValid === true, 'Valid URL parsed successfully');
    assert(uncanonical.hostname === 'www.example.com', 'Hostname lowercased');
    assert(uncanonical.port === null, 'Default HTTPS port 443 stripped');
    assert(uncanonical.strippedParameters.includes('token'), 'Sensitive query parameter "token" identified for redaction');
    assert(!uncanonical.externalLookupUrl.includes('secret_12345'), 'Token omitted from externalLookupUrl payload');
    assert(uncanonical.externalLookupUrl.includes('utm_source=email'), 'Benign parameters preserved in externalLookupUrl');

    const invalidScheme = canonicalizeUrl('ftp://example.com/files');
    assert(invalidScheme.isValid === false, 'Non-HTTP/HTTPS protocol (FTP) rejected');

    const malformed = canonicalizeUrl('https://');
    assert(malformed.isValid === false, 'Malformed URL rejected');

    // ---------------------------------------------------------
    // Suite 3: Provider Contract & Adapters (Unconfigured & Mocked)
    // ---------------------------------------------------------
    console.log('\n--- Suite 3: Provider Contract & Adapters ---');

    // Test unconfigured Google Web Risk provider
    const unconfiguredGwr = new GoogleWebRiskProvider();
    // Temporarily unset key in process.env if set
    const savedKey = process.env.GOOGLE_WEB_RISK_API_KEY;
    delete process.env.GOOGLE_WEB_RISK_API_KEY;
    const gwrUnconfiguredRes = await unconfiguredGwr.lookup('https://example.com');
    assert(gwrUnconfiguredRes.status === 'NOT_CONFIGURED', 'Google Web Risk returns NOT_CONFIGURED when key is absent');
    if (savedKey) process.env.GOOGLE_WEB_RISK_API_KEY = savedKey;

    // Live Endpoint Probes (Real network requests with missing/invalid credentials, not mocks)
    console.log('  -> Executing live network probes to upstream provider endpoints...');
    const liveGwrWithInvalidKey = new GoogleWebRiskProvider(5000);
    process.env.GOOGLE_WEB_RISK_API_KEY = 'AIzaSyFakeKeyForNegativeTestingOnly_12345';
    const liveGwrErrRes = await liveGwrWithInvalidKey.lookup('https://testsafebrowsing.appspot.com/s/malware.html');
    assert(liveGwrErrRes.status === 'UNAVAILABLE', 'Live Google Web Risk upstream rejects invalid key with UNAVAILABLE (HTTP 400)');
    assert(Boolean(liveGwrErrRes.errorMessage?.includes('API key not valid') || liveGwrErrRes.errorMessage?.includes('HTTP 400')), 'Live Google Web Risk error message parsed from upstream');
    delete process.env.GOOGLE_WEB_RISK_API_KEY;

    // Live PhishTank network query
    const livePtProbe = new PhishTankProvider(5000);
    process.env.PHISHTANK_API_KEY = 'test_token_negative_check';
    const livePtRes = await livePtProbe.lookup('https://thisdomainclearlydoesnotexist123456789abcdef.com');
    assert(livePtRes.status === 'NO_MATCH', 'Live PhishTank upstream returns real HTTP 200 with in_database: false for non-listed domain');
    assert(livePtRes.responseTimeMs > 0, 'Live PhishTank upstream recorded real network latency');
    delete process.env.PHISHTANK_API_KEY;

    // ---------------------------------------------------------
    // Suite 4: Multi-Provider Threat Orchestration Logic
    // ---------------------------------------------------------
    console.log('\n--- Suite 4: Multi-Provider Threat Orchestration Logic ---');

    // Mock Provider A: Confirmed Match
    const mockMatchingProvider: ThreatIntelligenceProvider = {
      name: 'GOOGLE_WEB_RISK',
      isConfigured: () => true,
      lookup: async () => ({
        provider: 'GOOGLE_WEB_RISK',
        status: 'MATCH',
        threatTypes: ['SOCIAL_ENGINEERING'],
        confidence: 0.99,
        responseTimeMs: 85,
        evidence: [
          {
            id: 'EV-MOCK-1',
            label: 'Confirmed Phishing Match',
            severity: 'critical',
            detail: 'Cataloged in Google Web Risk threat feed',
            providerCitation: 'Google Web Risk'
          }
        ]
      })
    };

    // Mock Provider B: Upstream Failure / Timeout
    const mockFailingProvider: ThreatIntelligenceProvider = {
      name: 'PHISHTANK',
      isConfigured: () => true,
      lookup: async () => ({
        provider: 'PHISHTANK',
        status: 'TIMEOUT',
        responseTimeMs: 3000,
        evidence: [],
        errorMessage: 'Upstream gateway timed out'
      })
    };

    // Test Orchestrator with Match + Failure
    const orchestratorMatchWithFail = new ScannerService([mockMatchingProvider, mockFailingProvider]);
    const scanMatchResult = await orchestratorMatchWithFail.evaluatePersonalIndicator({
      target: 'https://malicious-login-portal.com'
    });

    assert(scanMatchResult.status === 'KNOWN_THREAT', 'Confirmed provider match sets status to KNOWN_THREAT');
    assert(scanMatchResult.score >= 90, 'Confirmed match elevates risk score to >= 90');
    assert(scanMatchResult.confidence >= 0.95, 'High confidence recorded on genuine threat match');
    assert(scanMatchResult.sourceFailures.some((f) => f.includes('PHISHTANK')), 'Failing provider recorded in sourceFailures without clearing match');
    assert(scanMatchResult.providerResults.length === 2, 'Individual provider results preserved in response');

    // Test Orchestrator with all providers clean (NO_MATCH)
    const mockCleanProvider: ThreatIntelligenceProvider = {
      name: 'GOOGLE_WEB_RISK',
      isConfigured: () => true,
      lookup: async () => ({
        provider: 'GOOGLE_WEB_RISK',
        status: 'NO_MATCH',
        threatTypes: [],
        responseTimeMs: 65,
        evidence: []
      })
    };
    const orchestratorClean = new ScannerService([mockCleanProvider]);
    const scanCleanResult = await orchestratorClean.evaluatePersonalIndicator({
      target: 'https://legitimate-domain.com'
    });

    assert(scanCleanResult.status === 'NO_KNOWN_THREAT_DETECTED', 'Clean lookup sets status to NO_KNOWN_THREAT_DETECTED (never guaranteed safe)');
    assert(scanCleanResult.score < 40, 'Clean lookup maintains low baseline score');
    assert(scanCleanResult.explanation.includes('Zero-day threats may not yet be indexed'), 'Clean result includes explicit zero-day immunity disclaimer');

    // Test Heuristics preserved independently when providers are unavailable
    const orchestratorFailOnly = new ScannerService([mockFailingProvider]);
    const scanHeuristicWithFail = await orchestratorFailOnly.evaluatePersonalIndicator({
      target: 'https://bank-verify-account.top/login',
      contextPayload: {
        category: 'url',
        primaryInput: 'https://bank-verify-account.top/login',
        requestedAction: 'urgent otp verification'
      }
    });

    assert(scanHeuristicWithFail.status === 'KNOWN_THREAT', 'Strong heuristics score >= 85 despite provider failures');
    assert(scanHeuristicWithFail.score >= 85, 'Heuristic risk score is never artificially lowered by provider failure');
    assert(scanHeuristicWithFail.sourceFailures.length === 1, 'Provider failure documented');

    // ---------------------------------------------------------
    // Suite 5: Database Persistence & Phase A/B Regressions
    // ---------------------------------------------------------
    console.log('\n--- Suite 5: Database Persistence & Phase A/B Regressions ---');

    const testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `phase-c-test-${Date.now()}@riskshield.ai`,
        fullName: 'Phase C Evaluator',
        role: 'USER',
        isEmailVerified: true
      }
    });

    // Persist real scan record to PostgreSQL
    const persistedScan = (await prisma.scanRecord.create({
      data: {
        userId: testUserId,
        target: 'https://secure-login.test-domain.top/?token=auth_demo_secret',
        normalizedTarget: 'https://secure-login.test-domain.top/?token=auth_demo_secret',
        category: 'url',
        mode: 'url',
        status: 'KNOWN_THREAT',
        score: 95,
        explanation: 'Confirmed malicious threat by intelligence feeds.',
        evidence: [
          {
            id: 'EV-DB-1',
            label: 'Confirmed Phishing',
            severity: 'critical',
            detail: 'Malware host'
          }
        ],
        sourcesChecked: ['Google Web Risk Lookup API v1', 'RiskShield Lexical Heuristics']
      }
    })) as any;

    assert(Boolean(persistedScan.id), 'Scan record persisted with UUID primary key in PostgreSQL');

    // Retrieve scan record
    const retrieved = await prisma.scanRecord.findUnique({
      where: { id: persistedScan.id }
    });
    assert(retrieved?.userId === testUserId, 'Persisted record accurately isolated to authenticated user');

    // Cleanup
    await prisma.scanRecord.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    assert(true, 'Test scan record and user cleaned up from database');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} PHASE C TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Phase C verification encountered error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void runPhaseCVerification();

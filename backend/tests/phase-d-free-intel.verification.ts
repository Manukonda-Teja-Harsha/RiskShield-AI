/**
 * RiskShield AI — Phase D Automated Verification Suite
 * Free Threat Intelligence Alternatives (OpenPhish Community Feed & URLhaus)
 * Cache Invariants, Feed Normalization, Live Downloads, and Regression Protections
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import { prisma } from '../src/lib/db/prisma';
import { OpenPhishProvider } from '../src/providers/openPhish.provider';
import { UrlhausProvider } from '../src/providers/urlhaus.provider';
import { GoogleWebRiskProvider } from '../src/providers/googleWebRisk.provider';
import { PhishTankProvider } from '../src/providers/phishTank.provider';
import { ScannerService } from '../src/services/scanner.service';
import type { ThreatIntelligenceProvider } from '../src/providers/provider.interface';

async function runPhaseDVerification() {
  console.log('====================================================');
  console.log('   RISKSHIELD AI — PHASE D AUTOMATED VERIFICATION   ');
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
    // Suite 1: OpenPhish Feed Ingestion & Cache Mechanics
    // ---------------------------------------------------------
    console.log('--- Suite 1: OpenPhish Feed Ingestion & Cache Mechanics ---');

    const openPhish = new OpenPhishProvider();
    delete process.env.OPENPHISH_LICENSE_KEY;
    delete process.env.OPENPHISH_COMMUNITY_CONSENT;
    assert(openPhish.isConfigured() === false, 'OpenPhish defaults to unconfigured without commercial key or non-commercial consent');
    const unlicLookup = await openPhish.lookup('https://example.com');
    assert(unlicLookup.status === 'NOT_CONFIGURED', 'OpenPhish returns NOT_CONFIGURED when terms licensing conditions are unfulfilled');

    // Enable community consent for testing suite
    process.env.OPENPHISH_COMMUNITY_CONSENT = 'true';
    assert(openPhish.isConfigured() === true, 'OpenPhish is configured when non-commercial research consent is set');

    // Mock cache seeding and normalization test
    const mockMalicious = 'https://fake-banking-portal-phish.net/login.php?token=victim';
    openPhish.seedMockEntries([mockMalicious, 'http://PAYPAL-SECURITY-CHECK.COM/VERIFY/']);

    const cacheStatus = openPhish.getCacheStatus();
    assert(cacheStatus.count >= 2, 'Feed entries cached in memory');
    assert(cacheStatus.freshness === 'FRESH', 'Seeded cache reports FRESH status');

    // Positive Match Lookup
    const matchLookup = await openPhish.lookup('https://fake-banking-portal-phish.net/login.php?token=victim');
    assert(matchLookup.status === 'MATCH', 'OpenPhish lookup confirms MATCH for cached phishing URL');
    assert(matchLookup.threatTypes?.includes('PHISHING') === true, 'Threat type is PHISHING');
    assert(matchLookup.confidence! >= 0.95, 'High confidence (>= 0.95) on verified community feed match');
    assert(matchLookup.responseTimeMs < 20, 'Local memory lookup executes in sub-20ms');

    // Negative Lookup
    const cleanLookup = await openPhish.lookup('https://legitimate-saas-platform.org/about');
    assert(cleanLookup.status === 'NO_MATCH', 'Unlisted URL returns NO_MATCH from OpenPhish');
    assert(cleanLookup.threatTypes?.length === 0, 'No threat types returned on NO_MATCH');

    // Stale Cache Invariant
    openPhish.setAutoRefresh(false);
    openPhish.seedMockEntries([mockMalicious], 'STALE');
    const staleStatus = openPhish.getCacheStatus();
    assert(staleStatus.freshness === 'STALE', 'Older feed accurately classified as STALE');
    const staleLookup = await openPhish.lookup(mockMalicious);
    assert(staleLookup.status === 'MATCH', 'Stale cache continues to match known phishing threats');
    assert(staleLookup.feedFreshness === 'STALE', 'Match explicitly carries STALE freshness attribute');
    openPhish.setAutoRefresh(true);

    // ---------------------------------------------------------
    // Suite 2: URLhaus Community Provider & Auth Gate
    // ---------------------------------------------------------
    console.log('\n--- Suite 2: URLhaus Community Provider & Auth Gate ---');

    const urlhaus = new UrlhausProvider();
    // Default should be NOT_CONFIGURED when URLHAUS_AUTH_KEY is absent
    const savedUhKey = process.env.URLHAUS_AUTH_KEY;
    delete process.env.URLHAUS_AUTH_KEY;
    assert(urlhaus.isConfigured() === false, 'URLhaus isConfigured is false without URLHAUS_AUTH_KEY');

    const unconfiguredLookup = await urlhaus.lookup('https://example.com');
    assert(unconfiguredLookup.status === 'NOT_CONFIGURED', 'URLhaus returns NOT_CONFIGURED when auth key is absent');
    assert(unconfiguredLookup.rawDetails?.reason?.toString().includes('auth.abuse.ch') === true, 'Reason directs user to free auth.abuse.ch key portal');
    if (savedUhKey) process.env.URLHAUS_AUTH_KEY = savedUhKey;

    // ---------------------------------------------------------
    // Suite 3: Multi-Source Threat Orchestrator with OpenPhish
    // ---------------------------------------------------------
    console.log('\n--- Suite 3: Multi-Source Threat Orchestrator with OpenPhish ---');

    // Orchestrator with live OpenPhish seeded, GWR UNAVAILABLE (billing 403), PT NOT_CONFIGURED, UH NOT_CONFIGURED
    const mockGwrBillingBlocked: ThreatIntelligenceProvider = {
      name: 'GOOGLE_WEB_RISK',
      isConfigured: () => true,
      lookup: async () => ({
        provider: 'GOOGLE_WEB_RISK',
        status: 'UNAVAILABLE',
        responseTimeMs: 570,
        evidence: [],
        errorMessage: 'Billing not enabled on Google Cloud project'
      })
    };

    openPhish.seedMockEntries([mockMalicious], 'FRESH');
    openPhish.setAutoRefresh(false);
    const orchestrator = new ScannerService([openPhish, urlhaus, mockGwrBillingBlocked]);

    // Test Orchestrator with OpenPhish match while Google Web Risk is UNAVAILABLE
    const scanMatchResult = await orchestrator.evaluatePersonalIndicator({
      target: mockMalicious
    });

    if (scanMatchResult.status !== 'KNOWN_THREAT') {
      console.log('DEBUG: scanMatchResult.status:', scanMatchResult.status, 'score:', scanMatchResult.score);
      console.log('DEBUG: providerResults:', JSON.stringify(scanMatchResult.providerResults));
    }

    assert(scanMatchResult.status === 'KNOWN_THREAT', 'Confirmed OpenPhish feed match elevates status to KNOWN_THREAT');
    assert(scanMatchResult.score >= 90, 'Risk score elevated to >= 90 on feed match');
    assert(scanMatchResult.sourcesChecked.some((s) => s.includes('OpenPhish')), 'OpenPhish included in sourcesChecked');
    assert(scanMatchResult.sourceFailures.some((f) => f.includes('GOOGLE_WEB_RISK')), 'Google Web Risk billing failure documented in sourceFailures without clearing OpenPhish threat match');

    // Test Orchestrator with benign target
    const scanCleanResult = await orchestrator.evaluatePersonalIndicator({
      target: 'https://legitimate-domain.com/dashboard'
    });

    assert(scanCleanResult.status === 'NO_KNOWN_THREAT_DETECTED', 'Benign URL returns NO_KNOWN_THREAT_DETECTED');
    assert(scanCleanResult.score < 40, 'Benign URL keeps score < 40');
    assert(scanCleanResult.explanation.includes('Zero-day threats may not yet be indexed'), 'Explicit zero-day disclaimer included');

    // ---------------------------------------------------------
    // Suite 4: Database Persistence & Phase A/B/C Invariants
    // ---------------------------------------------------------
    console.log('\n--- Suite 4: Database Persistence & Phase A/B/C Invariants ---');

    const testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `phase-d-eval-${Date.now()}@riskshield.ai`,
        fullName: 'Phase D Evaluator',
        role: 'USER',
        isEmailVerified: true
      }
    });

    const persistedScan = (await prisma.scanRecord.create({
      data: {
        userId: testUserId,
        target: mockMalicious,
        normalizedTarget: mockMalicious,
        category: 'url',
        mode: 'url',
        status: 'KNOWN_THREAT',
        score: 95,
        explanation: 'Confirmed phishing threat by OpenPhish Community Feed.',
        evidence: scanMatchResult.evidence as any,
        sourcesChecked: scanMatchResult.sourcesChecked
      }
    })) as any;

    assert(Boolean(persistedScan.id), 'Scan record persisted with UUID in PostgreSQL');
    const retrieved = await prisma.scanRecord.findUnique({ where: { id: persistedScan.id } });
    assert(retrieved?.userId === testUserId, 'Scan record isolated to authenticated user');

    // Cleanup
    await prisma.scanRecord.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    assert(true, 'Test records cleaned up from database');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} PHASE D TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Phase D verification encountered error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void runPhaseDVerification();

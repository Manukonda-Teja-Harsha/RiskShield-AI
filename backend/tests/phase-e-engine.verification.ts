/**
 * RiskShield AI — Phase E1 Automated Verification Suite
 * Core Detection Engine Hardening, TR39 Homoglyph, Typosquatting,
 * Deceptive Subdomains, False Positive Resistance, and Scanner Unification
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import { prisma } from '../src/lib/db/prisma';
import { validateDestinationAddress } from '../src/lib/security/ssrfGuard';
import { parseDomainInfo, evaluateDomainTrust } from '../src/lib/security/domainUtils';
import {
  evaluateBrandSecuritySignals,
  toUnicodeAndSkeleton,
  normalizeHomoglyphs,
  damerauLevenshtein,
  normalizeVisualSubstitutions,
  BUILTIN_PROTECTED_BRANDS
} from '../src/lib/security/brandDetector';
import { ScannerService } from '../src/services/scanner.service';
import { brandRepository } from '../src/repositories/brand.repository';
import type { ThreatIntelligenceProvider } from '../src/providers/provider.interface';

class MockThreatProvider implements ThreatIntelligenceProvider {
  name = 'OPENPHISH' as any;
  configured: boolean;
  mockResult: any;

  constructor(configured = true, mockResult?: any) {
    this.configured = configured;
    this.mockResult = mockResult || {
      provider: 'OPENPHISH',
      status: 'NO_MATCH',
      responseTimeMs: 15,
      evidence: []
    };
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async lookup(): Promise<any> {
    return this.mockResult;
  }
}

async function runPhaseEVerification() {
  console.log('====================================================');
  console.log('   RISKSHIELD AI — PHASE E1 AUTOMATED VERIFICATION  ');
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
    // Suite 1: TR39 Confusables & Unicode Punycode Detection
    // ---------------------------------------------------------
    console.log('--- Suite 1: TR39 Confusables & Unicode Punycode Detection ---');

    // Test Cyrillic 'а' (U+0430) mapping to Latin 'a'
    const homoglyphStr = normalizeHomoglyphs('pаypal');
    assert(homoglyphStr === 'paypal', 'TR39 normalizes Cyrillic "а" to Latin "a"');

    // Test Cyrillic 'о' (U+043E) and 'е' (U+0435)
    const googleHomoglyph = normalizeHomoglyphs('gооglе');
    assert(googleHomoglyph === 'google', 'TR39 normalizes multiple Cyrillic characters');

    // Punycode decoding for xn--pypal-4ve.com (pаypal.com with Cyrillic а)
    const skeletonInfo = toUnicodeAndSkeleton('xn--pypal-4ve.com');
    assert(skeletonInfo.unicodeDomain.includes('pаypal'), 'Punycode decoded to unicode host pаypal');
    assert(skeletonInfo.hasPunycode === true, 'Punycode flag set to true');

    // Threat detection for homoglyph domain
    const homoglyphEval = evaluateBrandSecuritySignals('xn--pypal-4ve.com');
    assert(homoglyphEval.isImpersonationTarget === true, 'evaluateBrandSecuritySignals identifies homoglyph attack');
    assert(homoglyphEval.targetedBrand === 'PayPal', 'Targeted brand identified as PayPal');
    assert(
      homoglyphEval.evidenceFactors.some((e) => e.label.includes('Unicode Homoglyph')),
      'Evidence factor generated for homoglyph'
    );
    assert(homoglyphEval.scorePenalty >= 70, `Score penalty is ${homoglyphEval.scorePenalty} >= 70`);

    // ---------------------------------------------------------
    // Suite 2: Typosquatting & Damerau-Levenshtein Metrics
    // ---------------------------------------------------------
    console.log('\n--- Suite 2: Typosquatting & Damerau-Levenshtein Metrics ---');

    // Visual substitution: paypa1 -> paypal
    const paypa1Eval = evaluateBrandSecuritySignals('paypa1.com');
    assert(paypa1Eval.isImpersonationTarget === true, 'paypa1.com flagged as impersonation');
    assert(paypa1Eval.targetedBrand === 'PayPal', 'paypa1.com targets PayPal');
    assert(
      paypa1Eval.evidenceFactors.some((e) => e.label.includes('Visual Substitution')),
      'Visual substitution evidence factor present'
    );

    // Adjacent transposition: paypla -> paypal (Levenshtein distance 1)
    const distTransposition = damerauLevenshtein('paypla', 'paypal');
    assert(distTransposition === 1, 'Damerau-Levenshtein correctly handles transposition with distance 1');

    const payplaEval = evaluateBrandSecuritySignals('paypla.com');
    assert(payplaEval.isImpersonationTarget === true, 'paypla.com flagged as typosquatting transposition');

    // ---------------------------------------------------------
    // Suite 3: Deceptive Subdomain Spoofing
    // ---------------------------------------------------------
    console.log('\n--- Suite 3: Deceptive Subdomain Spoofing ---');

    const deceptiveHost = 'paypal.com.account-update.net';
    const deceptiveParsed = parseDomainInfo(deceptiveHost);
    assert(deceptiveParsed.registrableDomain === 'account-update.net', 'Public suffix correctly identifies registrableDomain as account-update.net');
    assert(deceptiveParsed.subdomain.includes('paypal'), 'Subdomain includes protected brand label');

    const deceptiveEval = evaluateBrandSecuritySignals(deceptiveHost);
    assert(deceptiveEval.isImpersonationTarget === true, 'Identified paypal.com.account-update.net as brand impersonation');
    assert(deceptiveEval.targetedBrand === 'PayPal', 'Identified target brand as PayPal');
    assert(
      deceptiveEval.evidenceFactors.some((e) => e.label.includes('Deceptive Subdomain')),
      'Deceptive subdomain evidence factor generated'
    );
    assert(deceptiveEval.scorePenalty >= 60, `Deceptive subdomain score penalty is ${deceptiveEval.scorePenalty} >= 60`);

    // ---------------------------------------------------------
    // Suite 4: False Positive Resistance & Clean Allowlist
    // ---------------------------------------------------------
    console.log('\n--- Suite 4: False Positive Resistance & Clean Allowlist ---');

    // abc.xyz on .xyz TLD (Alphabet's corporate portal)
    const abcParsed = parseDomainInfo('abc.xyz');
    assert(abcParsed.tld === 'xyz' && abcParsed.registrableDomain === 'abc.xyz', 'Parsed abc.xyz properly');

    const abcTrust = evaluateDomainTrust(abcParsed.registrableDomain);
    assert(abcTrust.isTrusted === true && abcTrust.trustType === 'AUTHORITATIVE_GLOBAL', 'abc.xyz is recognized as authoritative allowlisted domain');

    // Non-impersonating domain: apple-orchard.org (should not trigger false brand threat against Apple)
    const orchardEval = evaluateBrandSecuritySignals('apple-orchard.org');
    assert(
      orchardEval.isImpersonationTarget === false,
      'apple-orchard.org does not trigger false brand threat against Apple'
    );

    // Legitimate subdomain on official domain: www.paypal.com
    const legitPaypalEval = evaluateBrandSecuritySignals('www.paypal.com');
    assert(
      legitPaypalEval.isImpersonationTarget === false,
      'Legitimate subdomain on official domain www.paypal.com triggers zero brand threat'
    );

    // ---------------------------------------------------------
    // Suite 5: ScannerService End-to-End Evaluation
    // ---------------------------------------------------------
    console.log('\n--- Suite 5: ScannerService End-to-End Evaluation ---');

    const cleanScanner = new ScannerService([new MockThreatProvider(true)]);

    // Scan abc.xyz
    const abcScan = await cleanScanner.evaluatePersonalIndicator({
      target: 'https://abc.xyz',
      mode: 'url'
    });
    assert(abcScan.status === 'NO_KNOWN_THREAT_DETECTED', 'abc.xyz evaluates to NO_KNOWN_THREAT_DETECTED');
    assert(abcScan.score <= 10, `abc.xyz score is ${abcScan.score} <= 10 without blanket TLD penalty`);

    // Scan homoglyph domain: pаypal.com (Cyrillic a)
    const homoglyphScan = await cleanScanner.evaluatePersonalIndicator({
      target: 'http://pаypal.com/signin',
      mode: 'url'
    });
    assert(
      homoglyphScan.status === 'KNOWN_THREAT' || homoglyphScan.status === 'HIGH_RISK',
      `Homoglyph pаypal.com evaluates to KNOWN_THREAT or HIGH_RISK (status: ${homoglyphScan.status}, score: ${homoglyphScan.score})`
    );
    assert(homoglyphScan.score >= 80, `Homoglyph score is ${homoglyphScan.score} >= 80`);
    assert(
      homoglyphScan.evidence.some((e) => e.id.includes('EV-HOMOGLYPH')),
      'Evidence includes EV-HOMOGLYPH signal'
    );

    // Scan typosquatting domain: paypa1.com
    const paypa1Scan = await cleanScanner.evaluatePersonalIndicator({
      target: 'https://paypa1.com/login',
      mode: 'url'
    });
    assert(
      paypa1Scan.score >= 60,
      `paypa1.com score is ${paypa1Scan.score} >= 60`
    );
    assert(
      paypa1Scan.evidence.some((e) => e.id.includes('EV-TYPO-VISUAL')),
      'Evidence includes EV-TYPO-VISUAL signal'
    );

    // Scan deceptive subdomain: paypal.com.account-update.net
    const deceptiveScan = await cleanScanner.evaluatePersonalIndicator({
      target: 'https://paypal.com.account-update.net/verify',
      mode: 'url'
    });
    assert(
      deceptiveScan.score >= 60,
      `Deceptive subdomain score is ${deceptiveScan.score} >= 60`
    );
    assert(
      deceptiveScan.evidence.some((e) => e.id.includes('EV-DECEPTIVE-SUB')),
      'Evidence includes EV-DECEPTIVE-SUB signal'
    );

    // ---------------------------------------------------------
    // Suite 6: Threat Provider Priority & Override
    // ---------------------------------------------------------
    console.log('\n--- Suite 6: Threat Provider Priority & Override ---');

    // Even if domain looks clean, a confirmed external threat provider MATCH must force KNOWN_THREAT
    const confirmedThreatProvider = new MockThreatProvider(true, {
      provider: 'URLHAUS',
      status: 'MATCH',
      responseTimeMs: 42,
      threatTypes: ['PHISHING'],
      evidence: [
        {
          id: 'EV-PROVIDER-MOCKTHREATINTEL-1',
          label: 'URLhaus Confirmed Phishing Match',
          severity: 'critical',
          detail: 'Matched active phishing payload in threat repository.',
          providerCitation: 'ThreatIntel Feed #10928'
        }
      ]
    });

    const threatOverrideScanner = new ScannerService([confirmedThreatProvider]);
    const threatScan = await threatOverrideScanner.evaluatePersonalIndicator({
      target: 'https://seemingly-harmless-domain.com/invoice.pdf',
      mode: 'url'
    });
    assert(threatScan.status === 'KNOWN_THREAT', 'Confirmed threat provider forces status to KNOWN_THREAT');
    assert(threatScan.score >= 85, `Confirmed threat score is ${threatScan.score} >= 85`);
    assert(
      threatScan.evidence.some((e) => e.id.toUpperCase().includes('EV-PROVIDER-MOCKTHREATINTEL')),
      'Evidence includes provider citation from MockThreatIntel'
    );

    // ---------------------------------------------------------
    // Suite 7: SSRF Guard DNS Timeout Fail-Closed
    // ---------------------------------------------------------
    console.log('\n--- Suite 7: SSRF Guard DNS Timeout Fail-Closed ---');

    // Localhost / Loopback blocking
    const localhostCheck = await validateDestinationAddress('http://127.0.0.1:8080/admin');
    assert(localhostCheck.isSafe === false, 'SSRF Guard blocks IPv4 loopback 127.0.0.1');

    const linkLocalCheck = await validateDestinationAddress('http://169.254.169.254/latest/meta-data/');
    assert(linkLocalCheck.isSafe === false, 'SSRF Guard blocks AWS cloud metadata 169.254.169.254');

    const ipv6LoopbackCheck = await validateDestinationAddress('http://[::1]:3000/api');
    assert(ipv6LoopbackCheck.isSafe === false, 'SSRF Guard blocks IPv6 loopback ::1');

    // ---------------------------------------------------------
    // Suite 8: Brand Threat Finding Auto-Persistence Pipeline
    // ---------------------------------------------------------
    console.log('\n--- Suite 8: Brand Threat Finding Auto-Persistence Pipeline ---');

    // Create a temporary brand in DB to test brand threat finding upsert
    const testUserId = randomUUID();
    const testBrandId = randomUUID();

    const user = await prisma.user.create({
      data: {
        id: testUserId,
        email: `brand-e1-${Date.now()}@riskshield.internal`,
        fullName: 'Brand Verification Tester'
      }
    });

    const brand = await prisma.brand.create({
      data: {
        id: testBrandId,
        name: 'NexusPay Global',
        slug: `nexuspay-${Date.now()}`,
        category: 'FINTECH',
        status: 'VERIFIED'
      }
    });

    await prisma.brandMembership.create({
      data: {
        userId: user.id,
        brandId: brand.id,
        role: 'OWNER'
      }
    });

    // Add verified official domain
    await prisma.brandAsset.create({
      data: {
        brandId: brand.id,
        type: 'DOMAIN',
        value: 'nexuspay.io',
        normalizedValue: 'nexuspay.io',
        status: 'VERIFIED'
      }
    });

    // Run brand scan against deceptive target: nexuspay.io.security-auth.net
    const brandScanResult = await cleanScanner.evaluateBrandIndicator({
      brandId: String(brand.id),
      brandName: String(brand.name),
      target: 'https://nexuspay.io.security-auth.net/login',
      contextPayload: {
        category: 'payment',
        primaryInput: 'https://nexuspay.io.security-auth.net/login'
      }
    });

    assert(
      brandScanResult.scanResult.brandRelationship === 'TARGETS_BRAND',
      'evaluateBrandIndicator marks deceptive subdomain as brand threat'
    );
    assert(
      brandScanResult.shouldCreateBrandFinding === true,
      'shouldCreateBrandFinding is true for brand threat'
    );

    // Verify finding was persisted in database
    const findings = (await brandRepository.findFindingsByBrand(String(brand.id))) as any[];
    assert(findings.length >= 1, `Brand threat finding was saved to database (count: ${findings.length})`);
    const finding = findings[0];
    assert(finding.target.includes('nexuspay.io.security-auth.net'), 'Finding target matches deceptive domain');
    assert(finding.riskScore >= 60, `Finding risk score is ${finding.riskScore} >= 60`);
    assert(finding.repeatScanCount === 1, 'Initial finding has repeatScanCount = 1');

    // Run identical brand scan again — verifies repeat scan count increments
    await cleanScanner.evaluateBrandIndicator({
      brandId: String(brand.id),
      brandName: String(brand.name),
      target: 'https://nexuspay.io.security-auth.net/login',
      contextPayload: {
        category: 'payment',
        primaryInput: 'https://nexuspay.io.security-auth.net/login'
      }
    });

    const updatedFindings = (await brandRepository.findFindingsByBrand(String(brand.id))) as any[];
    assert(updatedFindings.length === 1, 'Finding count remains 1 (upserted without duplicate rows)');
    assert(
      updatedFindings[0].repeatScanCount >= 2,
      `Repeat scan count incremented to ${updatedFindings[0].repeatScanCount}`
    );

    // Clean up test records
    await (prisma as any).brandThreatFinding.deleteMany({ where: { brandId: brand.id } });
    await prisma.brandAsset.deleteMany({ where: { brandId: brand.id } });
    await prisma.brandMembership.deleteMany({ where: { brandId: brand.id } });
    await prisma.brand.delete({ where: { id: brand.id } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log('\n====================================================');
    console.log(`🎉 ALL PHASE E1 VERIFICATION TESTS PASSED: ${passed}/${total}`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ PHASE E1 VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhaseEVerification();

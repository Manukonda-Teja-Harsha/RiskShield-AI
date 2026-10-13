/**
 * RiskShield AI — Threat Feed Coverage, Uncertainty Calibration & Regression Verification Suite
 * 
 * Verifies:
 * 1. Exact investigated input (allfreightdelivers.com/wp-setting/) behavior under actual provider availability.
 * 2. Distinction between genuine NO_MATCH vs UNAVAILABLE, NOT_CONFIGURED, TIMEOUT.
 * 3. Confidence calibration under absent, degraded, and operational feed coverage.
 * 4. Honest explanations (no false claims of feed clearing when feeds failed/unconfigured).
 * 5. Informative limited-coverage evidence factor when feeds are offline.
 * 6. Legitimate control URLs (authoritative allowlist abc.xyz and benign collision apple-orchard.org).
 * 7. Threat invariants (homoglyphs and confirmed matches remain KNOWN_THREAT).
 */
import { ScannerService, scannerService } from '../src/services/scanner.service';
import type { ThreatIntelligenceProvider } from '../src/providers/provider.interface';
import type { ProviderLookupResult } from '../src/types';

function createMockProvider(
  name: any,
  status: 'MATCH' | 'NO_MATCH' | 'UNAVAILABLE' | 'TIMEOUT' | 'NOT_CONFIGURED',
  threatTypes: string[] = []
): ThreatIntelligenceProvider {
  return {
    name,
    isConfigured: () => status !== 'NOT_CONFIGURED',
    lookup: async (target: string): Promise<ProviderLookupResult> => ({
      provider: name,
      status,
      responseTimeMs: 25,
      evidence: status === 'MATCH' ? [{
        id: `EV-MOCK-${Date.now()}`,
        label: `Mock Match (${name})`,
        severity: 'critical',
        detail: `Mock match found for ${target}`,
        providerCitation: name
      }] : [],
      threatTypes
    })
  };
}

async function runCoverageVerification() {
  console.log('================================================================');
  console.log('   RISKSHIELD AI — THREAT FEED COVERAGE REGRESSION SUITE        ');
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

  // -------------------------------------------------------------
  // Suite 1: Exact Investigated Indicator Under Live Environment
  // -------------------------------------------------------------
  console.log('--- Suite 1: Exact Target (https://allfreightdelivers.com/wp-setting/) ---');

  const liveTarget = 'https://allfreightdelivers.com/wp-setting/';
  const liveResult = await scannerService.evaluatePersonalIndicator({ target: liveTarget, mode: 'url' });

  assert(liveResult.target === liveTarget, 'Scanned exact target URL');
  assert(liveResult.status === 'NO_KNOWN_THREAT_DETECTED', 'Status is NO_KNOWN_THREAT_DETECTED (not falsely labeled Safe or Malicious)');
  assert(liveResult.score === 15, `Score remains baseline 15 without arbitrary inflation (${liveResult.score})`);
  assert(liveResult.confidence <= 0.50, `Confidence is calibrated to reflect uncertainty (${liveResult.confidence} <= 0.50)`);
  assert(liveResult.confidence === 0.40, `Confidence accurately reflects 0.45 minus 0.05 provider failure penalty (${liveResult.confidence})`);
  assert(liveResult.explanation.includes('local behavioral heuristics'), 'Explanation truthfully reports local heuristics only');
  assert(liveResult.explanation.includes('zero-day or unindexed threats cannot be ruled out'), 'Explanation includes explicit zero-day caveat');
  assert(
    !liveResult.explanation.includes('No active threat matches found in known intelligence feeds'),
    'Eliminated misleading claim that intelligence feeds cleared the domain'
  );
  assert(
    liveResult.evidence.some((e) => e.id.includes('LIMITED-COVERAGE') && e.label === 'Limited Threat Feed Coverage'),
    'Evidence array includes Limited Threat Feed Coverage telemetry'
  );
  assert(
    liveResult.sourceFailures.some((f) => f.includes('GOOGLE_WEB_RISK')),
    'Records Google Web Risk failure in sourceFailures array'
  );
  const gwrResult = liveResult.providerResults.find((p) => p.provider === 'GOOGLE_WEB_RISK');
  assert(gwrResult?.status === 'UNAVAILABLE', 'Google Web Risk truthfully reports UNAVAILABLE status');
  const opResult = liveResult.providerResults.find((p) => p.provider === 'OPENPHISH');
  assert(opResult?.status === 'NOT_CONFIGURED', 'OpenPhish truthfully reports NOT_CONFIGURED status');

  // -------------------------------------------------------------
  // Suite 2: Synthetic Controlled Provider Coverage Scenarios
  // -------------------------------------------------------------
  console.log('\n--- Suite 2: Controlled Signal Coverage & Confidence Calibration ---');

  // Scenario A: 2 Operational Clean Providers (Genuine NO_MATCH)
  const operationalScanner = new ScannerService([
    createMockProvider('OPENPHISH', 'NO_MATCH'),
    createMockProvider('URLHAUS', 'NO_MATCH'),
    createMockProvider('GOOGLE_WEB_RISK', 'NOT_CONFIGURED'),
    createMockProvider('PHISHTANK', 'NOT_CONFIGURED')
  ]);
  const cleanDualFeed = await operationalScanner.evaluatePersonalIndicator({
    target: 'https://unindexed-neutral-domain-1122.com',
    mode: 'url'
  });
  assert(cleanDualFeed.status === 'NO_KNOWN_THREAT_DETECTED', 'Dual-feed clean target is NO_KNOWN_THREAT_DETECTED');
  assert(cleanDualFeed.confidence >= 0.80, `Dual-feed clean target achieves high confidence (${cleanDualFeed.confidence} >= 0.80)`);
  assert(cleanDualFeed.explanation.includes('across 2 operational intelligence feeds'), 'Explanation mentions 2 operational feeds');
  assert(cleanDualFeed.sourcesChecked.includes('OpenPhish Community Feed'), 'OpenPhish registered in sourcesChecked');
  assert(cleanDualFeed.sourcesChecked.includes('URLhaus Malware DB (abuse.ch)'), 'URLhaus registered in sourcesChecked');
  assert(!cleanDualFeed.evidence.some((e) => e.id.includes('LIMITED-COVERAGE')), 'No limited-coverage warning when feeds are operational');

  // Scenario B: 1 Operational Feed + 1 Unavailable Provider
  const partialScanner = new ScannerService([
    createMockProvider('OPENPHISH', 'NO_MATCH'),
    createMockProvider('GOOGLE_WEB_RISK', 'UNAVAILABLE'),
    createMockProvider('URLHAUS', 'NOT_CONFIGURED'),
    createMockProvider('PHISHTANK', 'NOT_CONFIGURED')
  ]);
  const partialFeed = await partialScanner.evaluatePersonalIndicator({
    target: 'https://unindexed-neutral-domain-3344.com',
    mode: 'url'
  });
  assert(partialFeed.status === 'NO_KNOWN_THREAT_DETECTED', 'Partial-feed target is NO_KNOWN_THREAT_DETECTED');
  assert(partialFeed.confidence >= 0.60 && partialFeed.confidence <= 0.70, `Confidence is moderately calibrated (${partialFeed.confidence})`);
  assert(partialFeed.explanation.includes('1 verified intelligence feed (1 feed unavailable)'), 'Explanation notes partial coverage and failure');

  // Scenario C: All Providers Timeout/Fail
  const allFailScanner = new ScannerService([
    createMockProvider('OPENPHISH', 'TIMEOUT'),
    createMockProvider('GOOGLE_WEB_RISK', 'UNAVAILABLE'),
    createMockProvider('URLHAUS', 'UNAVAILABLE'),
    createMockProvider('PHISHTANK', 'TIMEOUT')
  ]);
  const allFailFeed = await allFailScanner.evaluatePersonalIndicator({
    target: 'https://unindexed-neutral-domain-5566.com',
    mode: 'url'
  });
  assert(allFailFeed.status === 'NO_KNOWN_THREAT_DETECTED', 'All-fail target receives NO_KNOWN_THREAT_DETECTED');
  assert(allFailFeed.confidence <= 0.40, `Confidence is severely penalized on 4 provider failures (${allFailFeed.confidence} <= 0.40)`);
  assert(allFailFeed.sourceFailures.length === 4, 'All 4 provider failures captured in sourceFailures');
  assert(allFailFeed.evidence.some((e) => e.label === 'Limited Threat Feed Coverage'), 'Informational limited-coverage evidence generated');

  // Scenario D: Provider Match overrides upstream failures
  const matchWithFailuresScanner = new ScannerService([
    createMockProvider('OPENPHISH', 'MATCH', ['PHISHING']),
    createMockProvider('GOOGLE_WEB_RISK', 'UNAVAILABLE'),
    createMockProvider('URLHAUS', 'TIMEOUT'),
    createMockProvider('PHISHTANK', 'NOT_CONFIGURED')
  ]);
  const confirmedThreat = await matchWithFailuresScanner.evaluatePersonalIndicator({
    target: 'https://actual-malicious-lure-7788.com/login',
    mode: 'url'
  });
  assert(confirmedThreat.status === 'KNOWN_THREAT', 'Confirmed provider match yields KNOWN_THREAT despite other provider failures');
  assert(confirmedThreat.score === 95, 'Score elevated to 95 on confirmed match');
  assert(confirmedThreat.confidence === 0.98, 'Confidence elevated to 0.98 on confirmed match');

  // -------------------------------------------------------------
  // Suite 3: Control Indicators & Allowlist Invariants
  // -------------------------------------------------------------
  console.log('\n--- Suite 3: Control URLs & Domain Invariants ---');

  // Control 1: Authoritative allowlisted domain (abc.xyz)
  const abcResult = await scannerService.evaluatePersonalIndicator({
    target: 'https://abc.xyz',
    mode: 'url'
  });
  assert(abcResult.status === 'NO_KNOWN_THREAT_DETECTED', 'Authoritative domain is NO_KNOWN_THREAT_DETECTED');
  assert(abcResult.score === 10, `Authoritative domain gets privileged score 10 (${abcResult.score})`);
  assert(abcResult.confidence === 0.95, `Authoritative domain gets high 0.95 confidence (${abcResult.confidence})`);
  assert(abcResult.explanation.includes('Authoritative established infrastructure'), 'Explanation notes authoritative infrastructure');
  assert(abcResult.explanation.includes('Zero-day threats cannot be ruled out'), 'Authoritative domain includes zero-day disclaimer');

  // Control 2: Benign brand collision (apple-orchard.org)
  const orchardResult = await scannerService.evaluatePersonalIndicator({
    target: 'https://apple-orchard.org',
    mode: 'url'
  });
  assert(orchardResult.status === 'NO_KNOWN_THREAT_DETECTED', 'Benign collision is NO_KNOWN_THREAT_DETECTED');
  assert(orchardResult.score <= 35, `Benign collision score <= 35 (${orchardResult.score})`);
  assert(!orchardResult.evidence.some((e) => e.label.toLowerCase().includes('homoglyph') || e.label.toLowerCase().includes('impersonation')), 'No false impersonation evidence');

  // Control 3: Homoglyph attack (pаypal.com)
  const homoglyphResult = await scannerService.evaluatePersonalIndicator({
    target: 'https://pаypal.com',
    mode: 'url'
  });
  assert(homoglyphResult.status === 'KNOWN_THREAT' || homoglyphResult.status === 'HIGH_RISK', 'Homoglyph detected as KNOWN_THREAT/HIGH_RISK');
  assert(homoglyphResult.score >= 70, `Homoglyph score >= 70 (${homoglyphResult.score})`);
  assert(homoglyphResult.evidence.some((e) => e.label.toLowerCase().includes('homoglyph')), 'Homoglyph evidence factor identified');

  console.log('\n================================================================');
  console.log(`🎉 ALL THREAT FEED COVERAGE REGRESSION CHECKS PASSED: ${passed}/${total}`);
  console.log('================================================================\n');
}

runCoverageVerification().catch((err) => {
  console.error('\n❌ Verification failed with error:', err);
  process.exit(1);
});

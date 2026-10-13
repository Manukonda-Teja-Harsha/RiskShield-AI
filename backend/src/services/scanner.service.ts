/**
 * RiskShield AI — Hardened Threat Intelligence Orchestrator Service
 * Evaluates indicators against external reputation providers, TR39 Unicode confusables,
 * Damerau-Levenshtein typosquatting, deceptive subdomains, and authoritative allowlists.
 *
 * Deterministic Verdict Invariants:
 * 1. A provider MATCH yields KNOWN_THREAT status and calibrated high confidence.
 * 2. An unavailable provider or timeout NEVER reduces risk score and is logged in sourceFailures.
 * 3. NO_MATCH is never labeled "Guaranteed Safe"; status is NO_KNOWN_THREAT_DETECTED with explicit disclaimer.
 * 4. Legitimate reputable domains (e.g. abc.xyz) evaluate clean without blanket TLD penalties.
 * 5. Distinct fields for risk score, confidence, verdict, evidence, and provider coverage.
 */
import { sanitizeAndGuardInput, validateDestinationAddress } from '../lib/security/ssrfGuard';
import { canonicalizeUrl } from '../lib/security/urlNormalizer';
import { evaluateDomainTrust, parseDomainInfo } from '../lib/security/domainUtils';
import { evaluateBrandSecuritySignals, MonitoredBrand } from '../lib/security/brandDetector';
import { googleWebRiskProvider } from '../providers/googleWebRisk.provider';
import { phishTankProvider } from '../providers/phishTank.provider';
import { openPhishProvider } from '../providers/openPhish.provider';
import { urlhausProvider } from '../providers/urlhaus.provider';
import { brandRepository } from '../repositories/brand.repository';
import type { ThreatIntelligenceProvider } from '../providers/provider.interface';
import type {
  RiskStatus,
  EvidenceFactor,
  ProviderLookupResult,
  ScanEvaluationResult
} from '../types';
import type { PersonalScanRequestInput, BrandScanRequestInput } from '../schemas/scan.schema';

export class ScannerService {
  private readonly providers: ThreatIntelligenceProvider[];

  constructor(customProviders?: ThreatIntelligenceProvider[]) {
    this.providers = customProviders || [
      openPhishProvider,
      urlhausProvider,
      googleWebRiskProvider,
      phishTankProvider
    ];
  }

  async evaluatePersonalIndicator(
    input: PersonalScanRequestInput,
    customMonitoredBrands: MonitoredBrand[] = []
  ): Promise<ScanEvaluationResult> {
    const rawTarget = input.target;

    // Step 1: Pre-flight sanitization & secret redaction
    const guard = sanitizeAndGuardInput(rawTarget);
    if (guard.isBlocked) {
      throw new Error(guard.blockReason || 'Input rejected by SSRF guard');
    }

    const mode = input.mode || 'url';
    const isUrlMode = mode === 'url' || rawTarget.startsWith('http://') || rawTarget.startsWith('https://');

    // Step 2: URL Canonicalization and Token Stripping
    let canonical = canonicalizeUrl(guard.sanitized);
    let targetForLookup = guard.sanitized;
    let normalizedTarget = guard.sanitized;

    if (isUrlMode && canonical.isValid) {
      // Async DNS resolution check on destination hostname (prevent DNS rebinding SSRF)
      const hostCheck = await validateDestinationAddress(canonical.hostname);
      if (!hostCheck.isSafe) {
        throw new Error(hostCheck.reason || 'Destination address prohibited by SSRF security policy.');
      }
      normalizedTarget = canonical.normalizedUrl;
      targetForLookup = canonical.externalLookupUrl;
    }

    // Step 3: Deep Technical Heuristic & Security Signal Analysis
    const heuristicEvidence: EvidenceFactor[] = [];
    let heuristicScore = 15; // Low baseline for unindexed targets
    let isDomainTrusted = false;

    if (isUrlMode && canonical.isValid) {
      const parsed = parseDomainInfo(canonical.hostname);

      // A. Evaluate Domain Trust (authoritative allowlists)
      const trust = evaluateDomainTrust(canonical.hostname);
      if (trust.isTrusted) {
        isDomainTrusted = true;
        heuristicScore = 10;
        heuristicEvidence.push({
          id: `EV-TRUST-${Date.now()}`,
          label: 'Authoritative Enterprise Infrastructure',
          severity: 'low',
          detail: trust.reason || 'Domain verified against authoritative reputable infrastructure list.',
          providerCitation: 'Authoritative Domain Allowlist'
        });
      }

      // B. Evaluate Brand Security Signals (TR39 Confusables, Typosquatting, Deceptive Subdomains)
      if (!isDomainTrusted) {
        const brandSignals = evaluateBrandSecuritySignals(canonical.hostname, customMonitoredBrands);
        if (brandSignals.isImpersonationTarget) {
          heuristicScore += brandSignals.scorePenalty;
          heuristicEvidence.push(...brandSignals.evidenceFactors);
        }

        // C. Check financial / banking keywords combined with credential path
        const lowerPath = (canonical.pathname + canonical.search).toLowerCase();
        const hasFinancialKeyword = parsed.sld.includes('bank') || parsed.sld.includes('secure') || parsed.sld.includes('pay');
        const hasLoginPath = lowerPath.includes('login') || lowerPath.includes('signin') || lowerPath.includes('verify');
        if (hasFinancialKeyword && hasLoginPath && !brandSignals.isImpersonationTarget) {
          heuristicScore += 45;
          heuristicEvidence.push({
            id: `EV-FIN-PATH-${Date.now()}`,
            label: 'Deceptive Financial Authentication Portal',
            severity: 'high',
            detail: 'Unregistered domain combines banking nomenclature with credential collection path.',
            providerCitation: 'RiskShield Behavioral Signature'
          });
        }
      }
    }

    // D. Contextual Payload Telemetry (e.g. OTP demands, coercive urgency)
    if (input.contextPayload?.requestedAction?.toLowerCase().includes('otp')) {
      heuristicScore += 35;
      heuristicEvidence.push({
        id: `EV-OTP-${Date.now()}`,
        label: 'Active OTP / PIN Solicitation',
        severity: 'critical',
        detail: 'Target context explicitly requested an OTP or authentication code.',
        providerCitation: 'RiskShield Contextual Heuristic Engine'
      });
    }

    const sourcesChecked: string[] = ['RiskShield Behavioral Heuristics', 'SSRF & Secret Guard'];
    const sourceFailures: string[] = [];

    // Step 4: Dispatch External Threat Intelligence Lookups (Bounded & Resilient)
    const providerResults: ProviderLookupResult[] = [];

    if (isUrlMode && canonical.isValid) {
      // Query providers concurrently
      const lookups = await Promise.allSettled(
        this.providers.map((provider) => provider.lookup(targetForLookup))
      );

      for (let i = 0; i < lookups.length; i++) {
        const provider = this.providers[i];
        const outcome = lookups[i];

        if (outcome.status === 'fulfilled') {
          const res = outcome.value;
          providerResults.push(res);

          if (res.status === 'MATCH' || res.status === 'NO_MATCH') {
            const feedTitle =
              res.provider === 'OPENPHISH'
                ? 'OpenPhish Community Feed'
                : res.provider === 'URLHAUS'
                ? 'URLhaus Malware DB (abuse.ch)'
                : res.provider === 'GOOGLE_WEB_RISK'
                ? 'Google Web Risk Lookup API v1'
                : 'PhishTank Open Threat DB';
            sourcesChecked.push(feedTitle);
          } else if (res.status === 'TIMEOUT') {
            sourceFailures.push(`${res.provider} (Request timed out)`);
          } else if (res.status === 'UNAVAILABLE') {
            sourceFailures.push(`${res.provider} (Upstream service unavailable)`);
          }
          // NOT_CONFIGURED is silently excluded from active sources and active failures
        } else {
          // Promise rejected unexpectedly
          const errRes: ProviderLookupResult = {
            provider: provider.name,
            status: 'UNAVAILABLE',
            responseTimeMs: 0,
            evidence: [],
            errorMessage: outcome.reason?.message || 'Unexpected provider execution error'
          };
          providerResults.push(errRes);
          sourceFailures.push(`${provider.name} (Execution failure)`);
        }
      }
    }

    // Step 5: Evidence-Based Calibrated Decision Matrix
    const externalEvidence: EvidenceFactor[] = [];
    let hasConfirmedExternalMatch = false;

    for (const pr of providerResults) {
      if (pr.status === 'MATCH') {
        hasConfirmedExternalMatch = true;
        if (Array.isArray(pr.evidence) && pr.evidence.length > 0) {
          externalEvidence.push(...pr.evidence);
        } else {
          const provName = String(pr.provider || 'THREAT_PROVIDER');
          externalEvidence.push({
            id: `EV-PROVIDER-${provName.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`,
            label: `Threat Intelligence Confirmation (${provName})`,
            severity: 'critical',
            detail: `Target matched active threat indicator in ${provName} catalog.`,
            providerCitation: Array.isArray(pr.threatTypes) ? pr.threatTypes.join(', ') : provName
          });
        }
      }
    }

    // Check provider operational status and coverage metrics
    const operationalFeedsCount = providerResults.filter((p) => p.status === 'MATCH' || p.status === 'NO_MATCH').length;
    const unavailableFeedsCount = providerResults.filter((p) => p.status === 'UNAVAILABLE' || p.status === 'TIMEOUT').length;
    const unconfiguredFeedsCount = providerResults.filter((p) => p.status === 'NOT_CONFIGURED').length;

    // When external coverage is absent or degraded for an untrusted domain, record an informational coverage factor
    if (isUrlMode && canonical.isValid && !isDomainTrusted && operationalFeedsCount === 0 && !hasConfirmedExternalMatch) {
      heuristicEvidence.push({
        id: `EV-LIMITED-COVERAGE-${Date.now()}`,
        label: 'Limited Threat Feed Coverage',
        severity: 'low',
        detail: unavailableFeedsCount > 0
          ? `External threat intelligence feeds were unreachable or unavailable (${sourceFailures.join(', ') || 'upstream error'}). Assessment is constrained to local behavioral heuristics.`
          : 'External threat intelligence feeds are unconfigured. Assessment is constrained to local behavioral heuristics.',
        providerCitation: 'RiskShield Telemetry Guard'
      });
    }

    const combinedEvidence = [...externalEvidence, ...heuristicEvidence];

    let finalScore: number;
    let status: RiskStatus;
    let confidence: number;
    let explanation: string;

    // Rule 1: Confirmed External Provider Match (Trust signal NEVER overrides confirmed threat)
    if (hasConfirmedExternalMatch) {
      finalScore = 95;
      status = 'KNOWN_THREAT';
      confidence = 0.98;
      const matchProviders = providerResults
        .filter((p) => p.status === 'MATCH')
        .map((p) => {
          if (p.provider === 'OPENPHISH') return 'OpenPhish Community Feed';
          if (p.provider === 'URLHAUS') return 'URLhaus (abuse.ch)';
          if (p.provider === 'GOOGLE_WEB_RISK') return 'Google Web Risk';
          return 'PhishTank';
        })
        .join(' & ');
      explanation = `Confirmed malicious indicator verified by ${matchProviders}.`;
    } else {
      // Rule 2: Heuristic & Local Evidence Calibration
      const clampedHeuristic = Math.max(5, Math.min(99, heuristicScore));

      if (isDomainTrusted && !heuristicEvidence.some((e) => e.severity === 'critical' || e.severity === 'high')) {
        finalScore = Math.min(10, clampedHeuristic);
        status = 'NO_KNOWN_THREAT_DETECTED';
        confidence = 0.95;
        explanation = 'Authoritative established infrastructure. No active malicious indicators cataloged across connected threat sources. (Zero-day threats cannot be ruled out).';
      } else if (clampedHeuristic >= 85) {
        finalScore = clampedHeuristic;
        status = 'KNOWN_THREAT';
        confidence = 0.88;
        explanation = `High-confidence heuristic indicators detected (Score: ${clampedHeuristic}/100).`;
      } else if (clampedHeuristic >= 60) {
        finalScore = clampedHeuristic;
        status = 'HIGH_RISK';
        confidence = 0.78;
        explanation = `High risk pattern detected by behavioral heuristics (Score: ${clampedHeuristic}/100).`;
      } else if (clampedHeuristic >= 35) {
        finalScore = clampedHeuristic;
        status = 'SUSPICIOUS';
        confidence = 0.70;
        explanation = `Suspicious elements observed requiring caution (Score: ${clampedHeuristic}/100).`;
      } else {
        finalScore = clampedHeuristic;
        status = 'NO_KNOWN_THREAT_DETECTED';

        if (operationalFeedsCount >= 2) {
          confidence = Math.max(0.60, Number((0.85 - unavailableFeedsCount * 0.05).toFixed(2)));
          explanation = `No active threat matches found across ${operationalFeedsCount} operational intelligence feeds${unavailableFeedsCount > 0 ? ` (${unavailableFeedsCount} feed unavailable)` : ''}. Zero-day threats may not yet be indexed.`;
        } else if (operationalFeedsCount === 1) {
          confidence = Math.max(0.50, Number((0.70 - unavailableFeedsCount * 0.05).toFixed(2)));
          explanation = `No active threat matches found in 1 verified intelligence feed${unavailableFeedsCount > 0 ? ` (${unavailableFeedsCount} feed unavailable)` : ''}. Zero-day threats may not yet be indexed.`;
        } else {
          // Zero operational external feeds: rely solely on local heuristics with low confidence (calibrated uncertainty)
          confidence = Math.max(0.35, Number((0.45 - unavailableFeedsCount * 0.05).toFixed(2)));
          explanation = 'No active threat matches found in local behavioral heuristics. External threat intelligence feeds were unavailable or unconfigured (0 feeds confirmed clean); zero-day or unindexed threats cannot be ruled out.';
        }
      }
    }

    // Inform user if sensitive query parameters were stripped for privacy
    if (canonical.strippedParameters && canonical.strippedParameters.length > 0) {
      explanation += ` (${canonical.strippedParameters.length} sensitive authentication tokens redacted before threat feed query).`;
    }

    return {
      id: `SCAN-${Date.now()}`,
      target: rawTarget,
      normalizedTarget,
      mode,
      category: input.contextPayload?.category || mode,
      status,
      score: finalScore,
      confidence,
      timestamp: new Date().toISOString(),
      evidence: combinedEvidence,
      sourcesChecked,
      sourceFailures,
      providerResults,
      recommendedActions: [
        'Verify target authenticity and certificates before entering credentials.',
        'Never disclose one-time passwords (OTPs) or PINs over unverified channels.'
      ],
      explanation,
      sanitizationApplied: canonical.strippedParameters.length > 0
    };
  }

  async evaluateBrandIndicator(input: BrandScanRequestInput) {
    const brandTokens = [
      input.brandName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      input.brandName.toLowerCase().split(' ')[0]
    ].filter(Boolean);

    const customBrand: MonitoredBrand = {
      id: input.brandId,
      name: input.brandName,
      tokens: brandTokens,
      officialDomains: []
    };

    // Load any official assets for this brand if present in DB
    try {
      const dbBrand = await brandRepository.findBrandById(input.brandId);
      if (dbBrand && Array.isArray((dbBrand as any).officialAssets)) {
        customBrand.officialDomains = ((dbBrand as any).officialAssets as Array<{ status: string; normalizedValue: string }>)
          .filter((a) => a.status === 'VERIFIED')
          .map((a) => a.normalizedValue);
      }
    } catch {
      // Fallback if DB query fails
    }

    const baseResult = await this.evaluatePersonalIndicator(
      {
        target: input.target,
        mode: 'url',
        contextPayload: input.contextPayload
      },
      [customBrand]
    );

    const isTargetingBrand =
      input.target.toLowerCase().includes(brandTokens[0]) ||
      baseResult.evidence.some((e) => e.detail.toLowerCase().includes(input.brandName.toLowerCase()));

    const shouldCreateBrandFinding = isTargetingBrand && baseResult.score >= 40;

    // Automatically persist to BrandThreatFinding table in PostgreSQL if threat targets brand
    if (shouldCreateBrandFinding) {
      try {
        await brandRepository.upsertThreatFinding({
          brandId: input.brandId,
          target: input.target,
          platform: 'DOMAIN',
          severity: baseResult.score >= 85 ? 'critical' : baseResult.score >= 60 ? 'high' : 'medium',
          riskScore: baseResult.score,
          detectionReason: baseResult.explanation,
          officialAssetCompared: customBrand.officialDomains[0] || input.brandName,
          evidence: baseResult.evidence
        });
      } catch (err) {
        console.warn('Failed to persist automated brand threat finding:', err);
      }
    }

    return {
      scanResult: {
        ...baseResult,
        brandId: input.brandId,
        associatedBrandName: input.brandName,
        brandRelationship: isTargetingBrand ? 'TARGETS_BRAND' : 'UNRELATED'
      },
      shouldCreateBrandFinding
    };
  }
}

export const scannerService = new ScannerService();

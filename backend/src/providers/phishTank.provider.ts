/**
 * RiskShield AI — PhishTank Lookup API Adapter (Conditional Integration)
 * Documentation: https://www.phishtank.com/api_info.php
 * Endpoint: https://checkurl.phishtank.com/checkurl/
 *
 * Requirements & Policy:
 * 1. Requires valid developer account and registered PHISHTANK_API_KEY.
 * 2. Mandates custom descriptive User-Agent header per PhishTank API terms.
 * 3. Enforces rate-limiting checks (HTTP 509 Bandwidth / Quota limit).
 * 4. When PHISHTANK_API_KEY is not configured, explicitly returns NOT_CONFIGURED
 *    without fabricating responses.
 */
import { getEnv } from '../lib/env';
import type { ThreatIntelligenceProvider } from './provider.interface';
import type { ProviderLookupResult, EvidenceFactor } from '../types';

export class PhishTankProvider implements ThreatIntelligenceProvider {
  readonly name = 'PHISHTANK' as const;
  private readonly timeoutMs: number;

  constructor(timeoutMs = 3000) {
    this.timeoutMs = timeoutMs;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  private getApiKey(): string | undefined {
    // Backend-only environment variable. Never exposed to browser or frontend bundles.
    return process.env.PHISHTANK_API_KEY || getEnv().PHISHTANK_API_KEY;
  }

  async lookup(targetUrl: string): Promise<ProviderLookupResult> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        provider: this.name,
        status: 'NOT_CONFIGURED',
        responseTimeMs: 0,
        evidence: [],
        rawDetails: {
          reason: 'PHISHTANK_API_KEY is not configured in backend environment. Registration at phishtank.com required.'
        }
      };
    }

    const apiKey = this.getApiKey()!;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const form = new URLSearchParams();
      form.append('url', targetUrl);
      form.append('format', 'json');
      form.append('app_key', apiKey);

      const response = await fetch('https://checkurl.phishtank.com/checkurl/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // PhishTank TOS requires custom descriptive User-Agent
          'User-Agent': 'phishtank/RiskShieldAI-Bot-v1.0'
        },
        body: form.toString(),
        signal: controller.signal
      });

      const responseTimeMs = Date.now() - startTime;
      clearTimeout(timer);

      if (response.status === 509) {
        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          responseTimeMs,
          evidence: [],
          errorMessage: 'PhishTank API rate limit or bandwidth ceiling reached (HTTP 509).'
        };
      }

      if (!response.ok) {
        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          responseTimeMs,
          evidence: [],
          errorMessage: `PhishTank upstream HTTP error (HTTP ${response.status})`
        };
      }

      const body = await response.json().catch(() => null);

      if (!body || typeof body !== 'object' || !body.results) {
        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          responseTimeMs,
          evidence: [],
          errorMessage: 'Malformed payload received from PhishTank API.'
        };
      }

      const resultEntry = body.results;
      const inDatabase = Boolean(resultEntry.in_database);
      const isVerified = Boolean(resultEntry.verified);
      const isPhish = inDatabase && isVerified;

      if (isPhish) {
        const phishId = resultEntry.phish_id || 'UNKNOWN';
        const phishDetailUrl = resultEntry.phish_detail_page || '';
        const evidence: EvidenceFactor[] = [
          {
            id: `EV-PT-${Date.now()}`,
            label: 'PhishTank Verified Phishing Record',
            severity: 'critical',
            detail: `Target URL is confirmed as active phishing by PhishTank community consensus (Record ID: ${phishId}).`,
            providerCitation: 'PhishTank Open Threat Intelligence (Cisco)'
          }
        ];

        return {
          provider: this.name,
          status: 'MATCH',
          threatTypes: ['PHISHING'],
          confidence: 0.98,
          responseTimeMs,
          evidence,
          rawDetails: {
            phishId,
            verified: isVerified,
            phishDetailUrl
          }
        };
      }

      return {
        provider: this.name,
        status: 'NO_MATCH',
        threatTypes: [],
        responseTimeMs,
        evidence: [],
        rawDetails: {
          inDatabase,
          verified: isVerified
        }
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const responseTimeMs = Date.now() - startTime;
      const isAbort = (err as any)?.name === 'AbortError';

      if (isAbort) {
        return {
          provider: this.name,
          status: 'TIMEOUT',
          responseTimeMs,
          evidence: [],
          errorMessage: `PhishTank request timed out after ${this.timeoutMs}ms.`
        };
      }

      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        responseTimeMs,
        evidence: [],
        errorMessage: (err as Error)?.message || 'Network communication error connecting to PhishTank.'
      };
    }
  }
}

export const phishTankProvider = new PhishTankProvider();

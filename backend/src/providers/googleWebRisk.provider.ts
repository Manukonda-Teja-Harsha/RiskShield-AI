/**
 * RiskShield AI — Official Google Web Risk Lookup API Adapter
 * Documentation: https://cloud.google.com/web-risk/docs/lookup-api
 * API Endpoint: https://webrisk.googleapis.com/v1/uris:search
 * Threat types evaluated: MALWARE, SOCIAL_ENGINEERING, UNWANTED_SOFTWARE
 */
import { getEnv } from '../lib/env';
import type { ThreatIntelligenceProvider } from './provider.interface';
import type { ProviderLookupResult, EvidenceFactor } from '../types';

export class GoogleWebRiskProvider implements ThreatIntelligenceProvider {
  readonly name = 'GOOGLE_WEB_RISK' as const;
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
    return process.env.GOOGLE_WEB_RISK_API_KEY || getEnv().GOOGLE_WEB_RISK_API_KEY;
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
          reason: 'GOOGLE_WEB_RISK_API_KEY is not configured in backend environment.'
        }
      };
    }

    const apiKey = this.getApiKey()!;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const endpoint = new URL('https://webrisk.googleapis.com/v1/uris:search');
      endpoint.searchParams.append('key', apiKey);
      endpoint.searchParams.append('uri', targetUrl);
      endpoint.searchParams.append('threatTypes', 'MALWARE');
      endpoint.searchParams.append('threatTypes', 'SOCIAL_ENGINEERING');
      endpoint.searchParams.append('threatTypes', 'UNWANTED_SOFTWARE');

      const response = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        signal: controller.signal
      });

      const responseTimeMs = Date.now() - startTime;
      clearTimeout(timer);

      // Handle Quotas, Auth, and HTTP error statuses
      if (!response.ok) {
        let errJson: any = {};
        try {
          errJson = await response.json();
        } catch {
          // ignore parsing error
        }

        const httpStatus = response.status;
        const errMsg = errJson?.error?.message || response.statusText;

        if (httpStatus === 400 || httpStatus === 403) {
          return {
            provider: this.name,
            status: 'UNAVAILABLE',
            responseTimeMs,
            evidence: [],
            errorMessage: `Google Web Risk API authentication or configuration error (HTTP ${httpStatus}): ${errMsg}`,
            rawDetails: { httpStatus, code: errJson?.error?.code }
          };
        }

        if (httpStatus === 429) {
          return {
            provider: this.name,
            status: 'UNAVAILABLE',
            responseTimeMs,
            evidence: [],
            errorMessage: 'Google Web Risk quota exhausted or rate limit exceeded.',
            rawDetails: { httpStatus }
          };
        }

        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          responseTimeMs,
          evidence: [],
          errorMessage: `Google Web Risk upstream error (HTTP ${httpStatus})`,
          rawDetails: { httpStatus }
        };
      }

      const body = await response.json().catch(() => null);

      // Malformed response check
      if (body === null || typeof body !== 'object') {
        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          responseTimeMs,
          evidence: [],
          errorMessage: 'Malformed JSON payload received from Google Web Risk API.'
        };
      }

      // Check if threat list matched
      // When clean, Google Web Risk returns an empty object {}
      const threat = body.threat;
      if (threat && Array.isArray(threat.threatTypes) && threat.threatTypes.length > 0) {
        const threatTypes: string[] = threat.threatTypes;
        const evidence: EvidenceFactor[] = threatTypes.map((t, idx) => ({
          id: `EV-GWR-${Date.now()}-${idx}`,
          label: `Google Web Risk Flag: ${t.replace(/_/g, ' ')}`,
          severity: t === 'SOCIAL_ENGINEERING' || t === 'MALWARE' ? 'critical' : 'high',
          detail: `Target is actively cataloged in Google Web Risk threat intelligence feeds as ${t}. Expire window: ${threat.expireTime || 'Active'}.`,
          providerCitation: 'Google Web Risk Lookup API v1'
        }));

        return {
          provider: this.name,
          status: 'MATCH',
          threatTypes,
          confidence: 0.99,
          responseTimeMs,
          evidence,
          rawDetails: {
            threatTypes,
            expireTime: threat.expireTime
          }
        };
      }

      // Successful lookup with zero active threat listings
      return {
        provider: this.name,
        status: 'NO_MATCH',
        threatTypes: [],
        responseTimeMs,
        evidence: [],
        rawDetails: {
          note: 'Target was checked against MALWARE, SOCIAL_ENGINEERING, and UNWANTED_SOFTWARE with zero matches found.'
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
          errorMessage: `Google Web Risk request timed out after ${this.timeoutMs}ms.`
        };
      }

      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        responseTimeMs,
        evidence: [],
        errorMessage: (err as Error)?.message || 'Network communication error connecting to Google Web Risk.'
      };
    }
  }
}

export const googleWebRiskProvider = new GoogleWebRiskProvider();

/**
 * RiskShield AI — URLhaus (abuse.ch) Community Provider Adapter
 * Official documentation: https://urlhaus.abuse.ch/api/
 *
 * Requirements & Fair Use:
 * - Specializes in malware-distribution URLs and payloads (not general phishing).
 * - Queries require a registered Auth-Key from auth.abuse.ch.
 * - When URLHAUS_AUTH_KEY is not configured in backend environment,
 *   honestly reports NOT_CONFIGURED without fabricating lookups.
 * - Enforces 3000ms timeout and safe error classification.
 */
import { getEnv } from '../lib/env';
import type { ThreatIntelligenceProvider } from './provider.interface';
import type { ProviderLookupResult, EvidenceFactor } from '../types';

export class UrlhausProvider implements ThreatIntelligenceProvider {
  readonly name = 'URLHAUS' as const;
  private readonly queryEndpoint = 'https://urlhaus-api.abuse.ch/v1/url/';
  private readonly timeoutMs = 3000;

  isConfigured(): boolean {
    const key = this.getAuthKey();
    return Boolean(key && key.trim().length > 0);
  }

  private getAuthKey(): string | undefined {
    return process.env.URLHAUS_AUTH_KEY || getEnv().URLHAUS_AUTH_KEY;
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
          reason: 'URLHAUS_AUTH_KEY is not configured in backend environment. Free registration required at https://auth.abuse.ch/'
        }
      };
    }

    const authKey = this.getAuthKey()!;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const form = new URLSearchParams();
      form.append('url', targetUrl);

      const response = await fetch(this.queryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Auth-Key': authKey,
          'User-Agent': 'RiskShieldAI-Bot/1.0 (https://riskshield.ai; malware-intel)'
        },
        body: form.toString(),
        signal: controller.signal
      });

      const responseTimeMs = Date.now() - startTime;
      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          responseTimeMs,
          evidence: [],
          errorMessage: `URLhaus Auth-Key authentication failure (HTTP ${response.status}). Verify key at auth.abuse.ch.`
        };
      }

      if (!response.ok) {
        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          responseTimeMs,
          evidence: [],
          errorMessage: `URLhaus upstream HTTP error ${response.status}`
        };
      }

      const body = await response.json().catch(() => null);

      if (!body || typeof body !== 'object') {
        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          responseTimeMs,
          evidence: [],
          errorMessage: 'Malformed payload received from URLhaus API.'
        };
      }

      const queryStatus = body.query_status;

      if (queryStatus === 'ok') {
        const urlStatus = body.url_status || 'online';
        const threat = body.threat || 'malware_download';
        const tags: string[] = Array.isArray(body.tags) ? body.tags : [];

        const evidence: EvidenceFactor[] = [
          {
            id: `EV-UH-${Date.now()}`,
            label: 'URLhaus Malware Distribution Host',
            severity: 'critical',
            detail: `Target URL is confirmed by abuse.ch as a malware distribution site (${threat}, status: ${urlStatus}). Tags: ${tags.join(', ') || 'malware'}.`,
            providerCitation: 'URLhaus (abuse.ch)'
          }
        ];

        return {
          provider: this.name,
          status: 'MATCH',
          threatTypes: ['MALWARE'],
          confidence: 0.98,
          responseTimeMs,
          evidence,
          rawDetails: {
            urlStatus,
            threat,
            tags,
            reporter: body.reporter,
            dateAdded: body.date_added
          }
        };
      }

      if (queryStatus === 'no_results') {
        return {
          provider: this.name,
          status: 'NO_MATCH',
          threatTypes: [],
          responseTimeMs,
          evidence: [],
          rawDetails: {
            note: 'Target is not listed in the URLhaus malware distribution database.'
          }
        };
      }

      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        responseTimeMs,
        evidence: [],
        errorMessage: `URLhaus query error: ${queryStatus}`
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
          errorMessage: `URLhaus request timed out after ${this.timeoutMs}ms.`
        };
      }

      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        responseTimeMs,
        evidence: [],
        errorMessage: (err as Error)?.message || 'Network error connecting to URLhaus API.'
      };
    }
  }
}

export const urlhausProvider = new UrlhausProvider();

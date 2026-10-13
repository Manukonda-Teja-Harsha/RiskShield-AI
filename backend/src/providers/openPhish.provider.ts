/**
 * RiskShield AI — OpenPhish Community Feed Adapter (Free, No Billing)
 * Official source: https://www.openphish.com/phishing_feeds.html
 * Community Feed Endpoint: https://openphish.com/feed.txt
 *
 * Operational Design:
 * - Free community feed of active phishing URLs.
 * - Updated every 12 hours upstream.
 * - Controlled server-side caching with 1-hour TTL. Feed is NEVER downloaded on every scan.
 * - Strict 2MB response size limit, 5000ms fetch timeout, and safe line-by-line URL normalization.
 * - Local Set/Map lookup executes in sub-millisecond memory time.
 * - Preserves stale cache if refresh fails, clearly marking status as STALE.
 * - Absense of URL never implies "Safe" (yields NO_MATCH with zero-day disclaimer).
 */
import { canonicalizeUrl } from '../lib/security/urlNormalizer';
import type { ThreatIntelligenceProvider } from './provider.interface';
import type { ProviderLookupResult, EvidenceFactor } from '../types';

interface OpenPhishCache {
  urls: Set<string>;
  hostnames: Set<string>;
  lastFetchedAt: Date | null;
  lastAttemptAt: Date | null;
  etag?: string | null;
  fetchError?: string | null;
}

export class OpenPhishProvider implements ThreatIntelligenceProvider {
  readonly name = 'OPENPHISH' as const;
  private readonly feedUrl = 'https://openphish.com/feed.txt';
  private readonly cacheTtlMs = 60 * 60 * 1000; // 1 hour cache TTL
  private readonly maxFeedSizeBytes = 2 * 1024 * 1024; // 2 MB strict size ceiling
  private readonly fetchTimeoutMs = 5000; // 5 second timeout

  private cache: OpenPhishCache = {
    urls: new Set(),
    hostnames: new Set(),
    lastFetchedAt: null,
    lastAttemptAt: null
  };

  private isRefreshing = false;

  /**
   * Evaluates licensing eligibility:
   * OpenPhish Terms of Use explicitly stipulate:
   * "You may not use any part of the Services for commercial purposes without our prior written consent...
   * This includes, but is not limited to: security operations, threat intelligence, threat detection...
   * product development, software and API integration..."
   *
   * To prevent unauthorized commercial deployment, the adapter requires either:
   * 1. A commercial subscription key (OPENPHISH_LICENSE_KEY), or
   * 2. An explicit academic/personal non-commercial acknowledgment (OPENPHISH_COMMUNITY_CONSENT=true).
   */
  isConfigured(): boolean {
    const licenseKey = process.env.OPENPHISH_LICENSE_KEY;
    const communityConsent = process.env.OPENPHISH_COMMUNITY_CONSENT;
    return Boolean((licenseKey && licenseKey.trim().length > 0) || communityConsent === 'true');
  }

  getLicenseMode(): 'COMMERCIAL_LICENSED' | 'COMMUNITY_RESEARCH' | 'UNLICENSED' {
    if (process.env.OPENPHISH_LICENSE_KEY && process.env.OPENPHISH_LICENSE_KEY.trim().length > 0) {
      return 'COMMERCIAL_LICENSED';
    }
    if (process.env.OPENPHISH_COMMUNITY_CONSENT === 'true') {
      return 'COMMUNITY_RESEARCH';
    }
    return 'UNLICENSED';
  }

  /**
   * Returns current cache diagnostics.
   */
  getCacheStatus(): {
    freshness: 'FRESH' | 'STALE' | 'UPDATING';
    count: number;
    lastFetchedAt: string | null;
    ageMinutes: number;
  } {
    const now = Date.now();
    const lastFetched = this.cache.lastFetchedAt ? this.cache.lastFetchedAt.getTime() : 0;
    const ageMinutes = lastFetched ? Math.floor((now - lastFetched) / 60000) : -1;
    const isFresh = lastFetched > 0 && now - lastFetched < this.cacheTtlMs;

    return {
      freshness: this.isRefreshing ? 'UPDATING' : isFresh ? 'FRESH' : 'STALE',
      count: this.cache.urls.size,
      lastFetchedAt: this.cache.lastFetchedAt ? this.cache.lastFetchedAt.toISOString() : null,
      ageMinutes
    };
  }

  /**
   * Refreshes the feed if cache is expired or empty.
   * Controlled server-side fetch with size limits and fallback retention.
   */
  async ensureCache(): Promise<void> {
    const now = Date.now();
    const lastFetched = this.cache.lastFetchedAt ? this.cache.lastFetchedAt.getTime() : 0;
    const isExpired = !lastFetched || now - lastFetched > this.cacheTtlMs;

    if (!this.autoRefreshEnabled && this.cache.urls.size > 0) {
      return;
    }

    if (!isExpired && this.cache.urls.size > 0) {
      return;
    }

    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    this.cache.lastAttemptAt = new Date();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

    try {
      const response = await fetch(this.feedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'RiskShieldAI-FeedBot/1.0 (https://riskshield.ai; security-research)',
          Accept: 'text/plain'
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`OpenPhish upstream HTTP error ${response.status}: ${response.statusText}`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > this.maxFeedSizeBytes) {
        throw new Error(`OpenPhish feed exceeds strict size ceiling (${contentLengthHeader} bytes)`);
      }

      const text = await response.text();
      if (text.length > this.maxFeedSizeBytes) {
        throw new Error(`OpenPhish response body exceeded ${this.maxFeedSizeBytes} bytes`);
      }

      const newUrls = new Set<string>();
      const newHostnames = new Set<string>();
      const lines = text.split('\n');

      for (const line of lines) {
        const raw = line.trim();
        if (!raw || raw.startsWith('#')) continue;

        const canonical = canonicalizeUrl(raw);
        if (canonical.isValid) {
          newUrls.add(canonical.normalizedUrl.toLowerCase());
          newHostnames.add(canonical.hostname.toLowerCase());
        }
      }

      if (newUrls.size > 0) {
        this.cache.urls = newUrls;
        this.cache.hostnames = newHostnames;
        this.cache.lastFetchedAt = new Date();
        this.cache.fetchError = null;
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      const msg = (err as Error)?.message || 'Failed to refresh OpenPhish community feed';
      this.cache.fetchError = msg;
      // Stale cache is preserved if it exists
    } finally {
      this.isRefreshing = false;
    }
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
          reason:
            'OpenPhish Terms of Use require a commercial license or prior written consent for security operations, product development, or threat detection integration. Configure OPENPHISH_LICENSE_KEY or set OPENPHISH_COMMUNITY_CONSENT=true for non-commercial research.'
        }
      };
    }

    // Ensure cache is populated
    await this.ensureCache();

    const responseTimeMs = Date.now() - startTime;
    const cacheStatus = this.getCacheStatus();

    // If cache is completely empty and fetch failed, mark UNAVAILABLE
    if (this.cache.urls.size === 0) {
      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        responseTimeMs,
        evidence: [],
        errorMessage: this.cache.fetchError || 'OpenPhish community feed cache is empty and unavailable.',
        feedFreshness: 'STALE',
        cachedEntriesCount: 0
      };
    }

    const canonical = canonicalizeUrl(targetUrl);
    if (!canonical.isValid) {
      return {
        provider: this.name,
        status: 'NO_MATCH',
        responseTimeMs,
        evidence: [],
        rawDetails: { reason: 'Malformed or non-HTTP target syntax.' },
        feedFreshness: cacheStatus.freshness,
        lastRefreshedAt: cacheStatus.lastFetchedAt || undefined,
        cachedEntriesCount: cacheStatus.count
      };
    }

    const targetNormalized = canonical.normalizedUrl.toLowerCase();
    const targetExternal = canonical.externalLookupUrl.toLowerCase();
    const targetHost = canonical.hostname.toLowerCase();

    // Check exact normalized URL match or exact external lookup match
    const isDirectMatch = this.cache.urls.has(targetNormalized) || this.cache.urls.has(targetExternal);

    if (isDirectMatch) {
      const evidence: EvidenceFactor[] = [
        {
          id: `EV-OP-${Date.now()}`,
          label: 'OpenPhish Verified Phishing Match',
          severity: 'critical',
          detail: `Target URL is an active confirmed entry in the OpenPhish Community Phishing Feed (Feed freshness: ${cacheStatus.freshness}).`,
          providerCitation: 'OpenPhish Community Feed (https://openphish.com)'
        }
      ];

      return {
        provider: this.name,
        status: 'MATCH',
        threatTypes: ['PHISHING'],
        confidence: 0.96,
        responseTimeMs,
        evidence,
        feedFreshness: cacheStatus.freshness,
        lastRefreshedAt: cacheStatus.lastFetchedAt || undefined,
        cachedEntriesCount: cacheStatus.count,
        rawDetails: {
          matchedUrl: targetNormalized,
          feedAgeMinutes: cacheStatus.ageMinutes
        }
      };
    }

    return {
      provider: this.name,
      status: 'NO_MATCH',
      threatTypes: [],
      responseTimeMs,
      evidence: [],
      feedFreshness: cacheStatus.freshness,
      lastRefreshedAt: cacheStatus.lastFetchedAt || undefined,
      cachedEntriesCount: cacheStatus.count,
      rawDetails: {
        checkedEntriesCount: cacheStatus.count,
        feedAgeMinutes: cacheStatus.ageMinutes,
        note: 'Target is not present in the OpenPhish Community Phishing Feed (300+ most active zero-day phishing lures).'
      }
    };
  }

  private autoRefreshEnabled = true;

  setAutoRefresh(enabled: boolean): void {
    this.autoRefreshEnabled = enabled;
  }

  /**
   * Helper for tests to directly seed mock entries into the cache.
   */
  seedMockEntries(urls: string[], freshness: 'FRESH' | 'STALE' = 'FRESH'): void {
    this.cache.urls.clear();
    this.cache.hostnames.clear();
    for (const u of urls) {
      const c = canonicalizeUrl(u);
      if (c.isValid) {
        this.cache.urls.add(c.normalizedUrl.toLowerCase());
        this.cache.urls.add(c.externalLookupUrl.toLowerCase());
        this.cache.hostnames.add(c.hostname.toLowerCase());
      }
    }
    this.cache.lastFetchedAt = freshness === 'FRESH' ? new Date() : new Date(Date.now() - 48 * 3600 * 1000);
    this.cache.fetchError = null;
  }
}

export const openPhishProvider = new OpenPhishProvider();

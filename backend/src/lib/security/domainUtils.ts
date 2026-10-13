/**
 * RiskShield AI — Domain & Public Suffix Analysis Utilities
 * Parses registrable domains (eTLD+1), detects subdomains, and evaluates authoritative allowlists.
 */

// Common multi-part public suffixes
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk', 'ltd.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz',
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in',
  'com.br', 'net.br', 'org.br', 'gov.br',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
  'com.sg', 'edu.sg', 'gov.sg', 'net.sg', 'org.sg',
  'co.za', 'org.za', 'web.za', 'net.za',
  'com.mx', 'org.mx', 'net.mx', 'edu.mx',
  'com.ar', 'net.ar', 'org.ar',
  'com.tw', 'org.tw', 'net.tw',
  'com.hk', 'org.hk', 'net.hk', 'edu.hk',
  'com.tr', 'org.tr', 'net.tr', 'edu.tr',
  'co.kr', 'ne.kr', 'or.kr', 're.kr'
]);

// Authoritative top reputable global domains & infrastructure
// Sourced from top verified research consensus (e.g. Tranco Top 1K)
const TRUSTED_AUTHORITATIVE_DOMAINS = new Set([
  'google.com',
  'abc.xyz',
  'youtube.com',
  'apple.com',
  'icloud.com',
  'microsoft.com',
  'live.com',
  'office.com',
  'github.com',
  'github.io',
  'amazon.com',
  'aws.amazon.com',
  'cloudflare.com',
  'mozilla.org',
  'wikipedia.org',
  'wikimedia.org',
  'w3.org',
  'ietf.org',
  'iana.org',
  'icann.org',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'yahoo.com',
  'bing.com',
  'stackoverflow.com',
  'stackexchange.com',
  'npmjs.com',
  'docker.com',
  'debian.org',
  'ubuntu.com',
  'archlinux.org',
  'python.org',
  'rust-lang.org',
  'golang.org',
  'nodejs.org'
]);

export interface ParsedDomainInfo {
  rawHostname: string;
  normalizedHostname: string;
  tld: string;
  registrableDomain: string;
  sld: string;
  subdomain: string;
  subdomainLabels: string[];
  isIp: boolean;
}

/**
 * Splits a hostname into its public suffix, registrable domain (eTLD+1), SLD, and subdomains.
 */
export function parseDomainInfo(hostname: string): ParsedDomainInfo {
  const clean = hostname.trim().toLowerCase().replace(/\.+$/, '');

  // Check if direct IP
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(clean);
  const isIpv6 = clean.includes(':') || clean.startsWith('[');
  if (isIpv4 || isIpv6) {
    return {
      rawHostname: hostname,
      normalizedHostname: clean,
      tld: '',
      registrableDomain: clean,
      sld: clean,
      subdomain: '',
      subdomainLabels: [],
      isIp: true
    };
  }

  const parts = clean.split('.');
  if (parts.length <= 1) {
    return {
      rawHostname: hostname,
      normalizedHostname: clean,
      tld: clean,
      registrableDomain: clean,
      sld: clean,
      subdomain: '',
      subdomainLabels: [],
      isIp: false
    };
  }

  // Check multi-part suffix (e.g. co.uk)
  let suffix = parts[parts.length - 1];
  let registrablePartsCount = 2;

  if (parts.length >= 3) {
    const twoPartCandidate = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (MULTI_PART_SUFFIXES.has(twoPartCandidate)) {
      suffix = twoPartCandidate;
      registrablePartsCount = 3;
    }
  }

  if (parts.length <= registrablePartsCount) {
    const sld = parts[0];
    return {
      rawHostname: hostname,
      normalizedHostname: clean,
      tld: suffix,
      registrableDomain: clean,
      sld,
      subdomain: '',
      subdomainLabels: [],
      isIp: false
    };
  }

  const registrableParts = parts.slice(parts.length - registrablePartsCount);
  const registrableDomain = registrableParts.join('.');
  const sld = registrableParts[0];
  const subdomainParts = parts.slice(0, parts.length - registrablePartsCount);
  const subdomain = subdomainParts.join('.');

  return {
    rawHostname: hostname,
    normalizedHostname: clean,
    tld: suffix,
    registrableDomain,
    sld,
    subdomain,
    subdomainLabels: subdomainParts,
    isIp: false
  };
}

/**
 * Evaluates whether a domain is an authoritative, reputable domain or verified brand asset.
 * A trust signal reduces weak heuristic risk but MUST NEVER suppress confirmed provider threat matches.
 */
export function evaluateDomainTrust(
  hostname: string,
  verifiedBrandAssets: string[] = []
): { isTrusted: boolean; trustType?: 'AUTHORITATIVE_GLOBAL' | 'VERIFIED_BRAND_ASSET'; reason?: string } {
  const parsed = parseDomainInfo(hostname);

  // 1. Check verified official brand assets from database (exact match or subdomain of verified domain)
  for (const assetVal of verifiedBrandAssets) {
    const cleanAsset = assetVal.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    if (parsed.normalizedHostname === cleanAsset || parsed.registrableDomain === cleanAsset) {
      return {
        isTrusted: true,
        trustType: 'VERIFIED_BRAND_ASSET',
        reason: `Matches verified official brand asset "${cleanAsset}".`
      };
    }
  }

  // 2. Check authoritative global infrastructure allowlist
  if (TRUSTED_AUTHORITATIVE_DOMAINS.has(parsed.registrableDomain) || TRUSTED_AUTHORITATIVE_DOMAINS.has(parsed.normalizedHostname)) {
    return {
      isTrusted: true,
      trustType: 'AUTHORITATIVE_GLOBAL',
      reason: `Authoritative enterprise infrastructure (${parsed.registrableDomain}) verified against reputable consensus list.`
    };
  }

  // Check institutional TLDs (.gov, .edu)
  if (parsed.tld === 'gov' || parsed.tld.endsWith('.gov') || parsed.tld === 'edu' || parsed.tld.endsWith('.edu')) {
    return {
      isTrusted: true,
      trustType: 'AUTHORITATIVE_GLOBAL',
      reason: `Government or accredited educational institution TLD (.${parsed.tld}).`
    };
  }

  return { isTrusted: false };
}

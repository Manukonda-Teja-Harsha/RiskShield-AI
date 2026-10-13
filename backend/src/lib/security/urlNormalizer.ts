/**
 * RiskShield AI — URL Canonicalization & Sensitive Token Redaction
 * Normalizes HTTP/HTTPS URLs and strips credentials, bearer tokens, and session identifiers
 * prior to dispatching external threat intelligence lookups.
 */

const SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'access_token',
  'auth_token',
  'api_key',
  'apikey',
  'key',
  'secret',
  'password',
  'pwd',
  'session',
  'session_id',
  'sessionid',
  'jwt',
  'bearer',
  'sig',
  'signature',
  'cvv',
  'pin',
  'otp',
  'code'
]);

export interface NormalizedUrlResult {
  isValid: boolean;
  scheme: 'http' | 'https' | null;
  hostname: string;
  port: number | null;
  pathname: string;
  search: string;
  normalizedUrl: string;
  externalLookupUrl: string;
  strippedParameters: string[];
  error?: string;
}

/**
 * Validates, canonicalizes, and strips sensitive authentication tokens from target URLs.
 */
export function canonicalizeUrl(rawTarget: string): NormalizedUrlResult {
  const trimmed = rawTarget.trim();

  // Basic check
  if (!trimmed) {
    return {
      isValid: false,
      scheme: null,
      hostname: '',
      port: null,
      pathname: '',
      search: '',
      normalizedUrl: '',
      externalLookupUrl: '',
      strippedParameters: [],
      error: 'Empty URL target provided.'
    };
  }

  // Ensure scheme is present for parsing
  let candidate = trimmed;
  if (!candidate.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      isValid: false,
      scheme: null,
      hostname: '',
      port: null,
      pathname: '',
      search: '',
      normalizedUrl: '',
      externalLookupUrl: '',
      strippedParameters: [],
      error: 'Malformed URL syntax.'
    };
  }

  // Only allow HTTP and HTTPS
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return {
      isValid: false,
      scheme: null,
      hostname: '',
      port: null,
      pathname: '',
      search: '',
      normalizedUrl: '',
      externalLookupUrl: '',
      strippedParameters: [],
      error: `Unsupported protocol "${protocol}". Only HTTP and HTTPS are permitted for reputation lookups.`
    };
  }

  const scheme = protocol === 'http:' ? 'http' : 'https';
  const hostname = parsed.hostname.toLowerCase();

  // Remove default ports
  let port: number | null = parsed.port ? parseInt(parsed.port, 10) : null;
  if ((scheme === 'http' && port === 80) || (scheme === 'https' && port === 443)) {
    port = null;
  }

  // Normalize pathname
  let pathname = parsed.pathname;
  if (!pathname || pathname === '') {
    pathname = '/';
  }

  // Filter sensitive query parameters for privacy preservation
  const strippedParameters: string[] = [];
  const cleanParams = new URLSearchParams();

  for (const [key, value] of parsed.searchParams.entries()) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_QUERY_PARAMS.has(lowerKey) || lowerKey.startsWith('auth') || lowerKey.includes('token')) {
      strippedParameters.push(key);
    } else {
      cleanParams.append(key, value);
    }
  }

  const cleanSearch = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
  const portSuffix = port ? `:${port}` : '';

  // Canonical representation preserving original benign structure
  const normalizedUrl = `${scheme}://${hostname}${portSuffix}${pathname}${parsed.search}`;
  // Clean representation sent to third-party reputation APIs
  const externalLookupUrl = `${scheme}://${hostname}${portSuffix}${pathname}${cleanSearch}`;

  return {
    isValid: true,
    scheme,
    hostname,
    port,
    pathname,
    search: cleanSearch,
    normalizedUrl,
    externalLookupUrl,
    strippedParameters
  };
}

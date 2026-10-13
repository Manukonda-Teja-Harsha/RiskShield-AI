/**
 * RiskShield AI — Server-Side SSRF & Network Boundary Guard
 * Validates inputs and hostnames against private network ranges, loopback,
 * link-local metadata endpoints, and DNS rebinding threats.
 */
import dns from 'node:dns/promises';
import net from 'node:net';

const PRIVATE_IP_PATTERNS = [
  /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+)(:\d+)?(\/.*)?$/i,
  /^https?:\/\/(10\.\d+\.\d+\.\d+)(:\d+)?(\/.*)?$/i,
  /^https?:\/\/(172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?(\/.*)?$/i,
  /^https?:\/\/(192\.168\.\d+\.\d+)(:\d+)?(\/.*)?$/i,
  /^https?:\/\/(169\.254\.\d+\.\d+)(:\d+)?(\/.*)?$/i,
  /^https?:\/\/(\[::1\]|0\.0\.0\.0)(:\d+)?(\/.*)?$/i
];

/**
 * Checks whether an IPv4 or IPv6 address belongs to private/reserved network space.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  // Normalize IPv6 mapped IPv4: ::ffff:192.168.1.1
  let cleanIp = ip.toLowerCase();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.slice(7);
  }

  // IPv4 checks
  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [b0, b1] = parts;
    // 0.0.0.0/8 (Current network)
    if (b0 === 0) return true;
    // 10.0.0.0/8 (Private)
    if (b0 === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata AWS/GCP/Azure)
    if (b0 === 169 && b1 === 254) return true;
    // 172.16.0.0/12 (Private)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (b0 === 192 && b1 === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
    if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;
    if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;
    if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (b0 >= 224) return true;

    return false;
  }

  // IPv6 checks
  if (net.isIPv6(cleanIp)) {
    // Loopback ::1
    if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;
    // Unspecified ::
    if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;
    // Unique local address fc00::/7
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;
    // Link-local fe80::/10
    if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) return true;
    // IPv6 documentation 2001:db8::/32
    if (cleanIp.startsWith('2001:db8') || cleanIp.startsWith('2001:0db8')) return true;

    return false;
  }

  // Malformed IP
  return true;
}

export interface SanitizationResult {
  isBlocked: boolean;
  blockReason?: string;
  sanitized: string;
  redactedPatterns: string[];
}

/**
 * Fast synchronous pre-flight sanitization and regex pattern boundary check.
 */
export function sanitizeAndGuardInput(rawInput: string): SanitizationResult {
  const trimmed = rawInput.trim();

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isBlocked: true,
        blockReason: 'SSRF Guard: Private network addresses, localhost, and cloud metadata endpoints are prohibited.',
        sanitized: '',
        redactedPatterns: []
      };
    }
  }

  let sanitized = trimmed;
  const redactedPatterns: string[] = [];

  // Redact credit/debit card sequences
  const cardRegex = /\b(?:\d[ -]*?){13,16}\b/g;
  if (cardRegex.test(sanitized)) {
    sanitized = sanitized.replace(cardRegex, '[REDACTED_CARD]');
    redactedPatterns.push('Credit/Debit Card Number');
  }

  // Redact explicit OTP or PIN disclosures
  const otpRegex = /\b(?:otp|pin|cvv|password)\s*[:=-]?\s*\d{3,8}\b/gi;
  if (otpRegex.test(sanitized)) {
    sanitized = sanitized.replace(otpRegex, '[REDACTED_SECRET]');
    redactedPatterns.push('Authentication Secret / OTP');
  }

  return {
    isBlocked: false,
    sanitized,
    redactedPatterns
  };
}

/**
 * Deep async validation: resolves domain hostnames to verify they do not point to internal IP addresses (DNS rebinding / SSRF).
 */
export async function validateDestinationAddress(hostnameOrUrl: string): Promise<{ isSafe: boolean; reason?: string }> {
  let cleanHost = hostnameOrUrl.trim().toLowerCase();

  // If a URL was supplied, extract the hostname component
  if (cleanHost.includes('://') || cleanHost.includes('/')) {
    try {
      const parsedUrl = new URL(cleanHost.includes('://') ? cleanHost : `http://${cleanHost}`);
      cleanHost = parsedUrl.hostname;
    } catch {
      cleanHost = cleanHost.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    }
  }

  // Strip brackets from IPv6 literal (e.g. [::1] -> ::1)
  if (cleanHost.startsWith('[') && cleanHost.endsWith(']')) {
    cleanHost = cleanHost.slice(1, -1);
  }

  // Explicit hostnames check
  if (cleanHost === 'localhost' || cleanHost.endsWith('.localhost') || cleanHost.endsWith('.local') || cleanHost.endsWith('.internal')) {
    return { isSafe: false, reason: 'SSRF Guard: Localhost and internal local domains are prohibited.' };
  }

  // Direct IP literal
  if (net.isIP(cleanHost)) {
    if (isPrivateOrReservedIP(cleanHost)) {
      return { isSafe: false, reason: `SSRF Guard: IP address ${cleanHost} belongs to a private or reserved network.` };
    }
    return { isSafe: true };
  }

  // Resolve hostname via DNS with bounded 2000ms timeout
  try {
    const lookupPromise = dns.lookup(cleanHost, { all: true, verbatim: true });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS lookup timeout')), 2000)
    );
    const addresses = await Promise.race([lookupPromise, timeoutPromise]);
    for (const record of addresses) {
      if (isPrivateOrReservedIP(record.address)) {
        return {
          isSafe: false,
          reason: `SSRF Guard: Hostname "${cleanHost}" resolves to private/reserved IP ${record.address}.`
        };
      }
    }
    return { isSafe: true };
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'DNS lookup timeout') {
      return {
        isSafe: false,
        reason: `SSRF Guard: DNS resolution timed out after 2000ms while validating destination host "${cleanHost}".`
      };
    }
    // If DNS resolution fails (e.g. ENOTFOUND/EAI_AGAIN), the host does not resolve to any internal IP.
    return { isSafe: true };
  }
}

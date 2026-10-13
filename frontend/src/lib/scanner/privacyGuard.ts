/**
 * RiskShield AI — Input Privacy, Sanitation & SSRF Guard
 * Ensures no sensitive user secrets (passwords, OTPs, PINs, card numbers) are stored or transmitted.
 * Protects server-side operations against SSRF, private network resolution, and abuse.
 */

export interface SanitationResult {
  sanitized: string;
  isBlocked: boolean;
  blockReason?: string;
  redactedPatterns: string[];
}

// Regex for private IP and localhost protection (SSRF guard)
const PRIVATE_IP_PATTERNS = [
  /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+)(:\d+)?(\/.*)?$/i,
  /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?(\/.*)?$/i,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?(\/.*)?$/i,
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?(\/.*)?$/i,
  /^https?:\/\/169\.254\.\d+\.\d+(:\d+)?(\/.*)?$/i, // Cloud metadata (AWS / GCP / Azure)
  /^https?:\/\/0\.0\.0\.0(:\d+)?(\/.*)?$/i,
  /\.(internal|local|corp|lan|test|onion)(:\d+)?(\/.*)?$/i
];

export function validateAndSanitizeInput(rawInput: string): SanitationResult {
  const trimmed = rawInput.trim();

  // 1. Length validation
  if (!trimmed) {
    return {
      sanitized: '',
      isBlocked: true,
      blockReason: 'Input is empty. Please provide a valid URL, message, phone number, or indicator.',
      redactedPatterns: []
    };
  }

  if (trimmed.length > 5000) {
    return {
      sanitized: trimmed.slice(0, 5000),
      isBlocked: false,
      redactedPatterns: ['Input truncated to maximum 5,000 characters for safety.']
    };
  }

  const lower = trimmed.toLowerCase();

  // 2. Outright credential submission guard
  if (
    lower.startsWith('password:') || 
    lower.startsWith('pass:') || 
    lower.startsWith('otp:') || 
    lower.startsWith('cvv:') ||
    lower.startsWith('pin:')
  ) {
    return {
      sanitized: '',
      isBlocked: true,
      blockReason: 'Security Policy: Never submit passwords, PINs, OTP codes, or card CVVs. RiskShield AI analyzes public technical indicators only.',
      redactedPatterns: ['CREDENTIAL_PREFIX']
    };
  }

  // 3. SSRF Guard for URLs
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        sanitized: trimmed,
        isBlocked: true,
        blockReason: 'SSRF Security Guard: Internal network addresses, localhost, and cloud metadata IPs cannot be scanned.',
        redactedPatterns: ['PRIVATE_IP_SSRF_BLOCKED']
      };
    }
  }

  // 4. In-text PII & Secret Redaction
  let sanitized = trimmed;
  const redactedPatterns: string[] = [];

  // Redact potential 16-digit credit card numbers
  const cardPattern = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
  if (cardPattern.test(sanitized)) {
    sanitized = sanitized.replace(cardPattern, '[REDACTED_CARD_NUMBER]');
    redactedPatterns.push('Credit/Debit Card Number (Redacted)');
  }

  // Redact potential 4-8 digit OTP / Security codes if labeled
  const otpPattern = /\b(?:otp|code|verification code|pin)[:\s]+([0-9]{4,8})\b/gi;
  if (otpPattern.test(sanitized)) {
    sanitized = sanitized.replace(otpPattern, '$1: [REDACTED_CODE]');
    redactedPatterns.push('Authentication OTP / PIN (Redacted)');
  }

  // Redact potential private keys / long hex tokens
  const privateKeyPattern = /\b(?:bearer\s+[a-zA-Z0-9_\-\.]{32,}|ghp_[a-zA-Z0-9]{36}|xoxb-[a-zA-Z0-9\-]+)\b/gi;
  if (privateKeyPattern.test(sanitized)) {
    sanitized = sanitized.replace(privateKeyPattern, '[REDACTED_API_TOKEN]');
    redactedPatterns.push('Authorization Bearer Token (Redacted)');
  }

  return {
    sanitized,
    isBlocked: false,
    redactedPatterns
  };
}

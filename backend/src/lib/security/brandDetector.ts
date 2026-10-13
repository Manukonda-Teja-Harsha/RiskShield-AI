/**
 * RiskShield AI — Brand Protection, Homoglyph & Typosquatting Analysis Engine
 * Detects Unicode TR39 confusable substitutions, Punycode tricks, Damerau-Levenshtein
 * typosquats, visual substitutions (e.g. rn -> m, 1 -> l), and deceptive subdomain spoofing.
 */
import { domainToUnicode } from 'node:url';
import { parseDomainInfo } from './domainUtils';
import type { EvidenceFactor } from '../../types';

// Unicode TR39 Confusable character table (maps confusables to ASCII Latin equivalent)
const TR39_CONFUSABLE_MAP: Record<string, string> = {
  // Cyrillic lowercase
  '\u0430': 'a', // Cyrillic Small Letter A
  '\u0441': 'c', // Cyrillic Small Letter Es
  '\u0435': 'e', // Cyrillic Small Letter Ie
  '\u043E': 'o', // Cyrillic Small Letter O
  '\u0440': 'p', // Cyrillic Small Letter Er
  '\u0455': 's', // Cyrillic Small Letter Dze
  '\u0445': 'x', // Cyrillic Small Letter Ha
  '\u0443': 'y', // Cyrillic Small Letter U
  '\u0456': 'i', // Cyrillic Small Letter Byelorussian-Ukrainian I
  '\u0458': 'j', // Cyrillic Small Letter Je
  '\u0501': 'd', // Cyrillic Small Letter Komi De
  '\u051B': 'q', // Cyrillic Small Letter Qa
  '\u051D': 'w', // Cyrillic Small Letter We
  '\u04BB': 'h', // Cyrillic Small Letter Shha
  '\u0432': 'b', // Cyrillic Small Letter Ve
  '\u043C': 'm', // Cyrillic Small Letter Em
  '\u0442': 't', // Cyrillic Small Letter Te
  '\u043F': 'n', // Cyrillic Small Letter Pe
  '\u043A': 'k', // Cyrillic Small Letter Ka

  // Cyrillic uppercase
  '\u0410': 'a', '\u0421': 'c', '\u0415': 'e', '\u041E': 'o',
  '\u0420': 'p', '\u0425': 'x', '\u0423': 'y', '\u0406': 'i',
  '\u0408': 'j', '\u0422': 't', '\u0412': 'b', '\u041C': 'm',
  '\u041A': 'k', '\u041D': 'h',

  // Greek lowercase
  '\u03B1': 'a', // Alpha
  '\u03B2': 'b', // Beta
  '\u03B5': 'e', // Epsilon
  '\u03B9': 'i', // Iota
  '\u03BA': 'k', // Kappa
  '\u03BD': 'v', // Nu
  '\u03BF': 'o', // Omicron
  '\u03C1': 'p', // Rho
  '\u03C4': 't', // Tau
  '\u03C5': 'u', // Upsilon
  '\u03C7': 'x', // Chi

  // Latin Extended & Special Lookalikes
  '\u0131': 'i', // Latin Small Letter Dotless I
  '\u0142': 'l', // Latin Small Letter L with Stroke
  '\u00F8': 'o', // Latin Small Letter O with Stroke
  '\u2113': 'l', // Script Small L
  '\u0180': 'b', // Latin Small Letter B with Stroke
  '\u0251': 'a', // Latin Small Letter Alpha

  // Fullwidth Latin (U+FF41 to U+FF5A)
  '\uFF41': 'a', '\uFF42': 'b', '\uFF43': 'c', '\uFF44': 'd', '\uFF45': 'e',
  '\uFF46': 'f', '\uFF47': 'g', '\uFF48': 'h', '\uFF49': 'i', '\uFF4A': 'j',
  '\uFF4B': 'k', '\uFF4C': 'l', '\uFF4D': 'm', '\uFF4E': 'n', '\uFF4F': 'o',
  '\uFF50': 'p', '\uFF51': 'q', '\uFF52': 'r', '\uFF53': 's', '\uFF54': 't',
  '\uFF55': 'u', '\uFF56': 'v', '\uFF57': 'w', '\uFF58': 'x', '\uFF59': 'y',
  '\uFF5A': 'z'
};

export interface ConfusableCharInfo {
  char: string;
  codePoint: string;
  replaces: string;
}

export interface SkeletonResult {
  raw: string;
  unicodeDomain: string;
  skeleton: string;
  confusableChars: ConfusableCharInfo[];
  hasPunycode: boolean;
  hasConfusables: boolean;
}

/**
 * Normalizes a domain name, decodes Punycode, and extracts TR39 confusable characters.
 */
export function toUnicodeAndSkeleton(hostname: string): SkeletonResult {
  const clean = hostname.trim().toLowerCase();
  const hasPunycode = clean.includes('xn--');
  const unicodeDomain = domainToUnicode(clean);

  let skeleton = '';
  const confusableChars: ConfusableCharInfo[] = [];

  for (const ch of unicodeDomain) {
    if (TR39_CONFUSABLE_MAP[ch]) {
      const replaces = TR39_CONFUSABLE_MAP[ch];
      confusableChars.push({
        char: ch,
        codePoint: `U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
        replaces
      });
      skeleton += replaces;
    } else {
      skeleton += ch;
    }
  }

  return {
    raw: clean,
    unicodeDomain,
    skeleton,
    confusableChars,
    hasPunycode,
    hasConfusables: confusableChars.length > 0
  };
}

/**
 * Normalizes unicode homoglyphs / confusables into their base Latin skeleton representation.
 */
export function normalizeHomoglyphs(str: string): string {
  return toUnicodeAndSkeleton(str).skeleton;
}

/**
 * Damerau-Levenshtein distance calculation.
 * Supports insertions, deletions, substitutions, and transpositions.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;

  const matrix = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[al][bl];
}

/**
 * Normalizes visual substitutions (leetspeak & digraphs) into standard Latin.
 */
export function normalizeVisualSubstitutions(token: string): string {
  return token
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/cl/g, 'd')
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/5/g, 's')
    .replace(/3/g, 'e')
    .replace(/@/g, 'a')
    .replace(/8/g, 'b');
}

export interface MonitoredBrand {
  id: string;
  name: string;
  tokens: string[];
  officialDomains: string[];
}

export const BUILTIN_PROTECTED_BRANDS: MonitoredBrand[] = [
  { id: 'paypal', name: 'PayPal', tokens: ['paypal'], officialDomains: ['paypal.com', 'paypal.me'] },
  { id: 'chase', name: 'Chase Bank', tokens: ['chase'], officialDomains: ['chase.com'] },
  { id: 'apple', name: 'Apple', tokens: ['apple', 'icloud'], officialDomains: ['apple.com', 'icloud.com'] },
  { id: 'google', name: 'Google', tokens: ['google', 'gmail'], officialDomains: ['google.com', 'gmail.com', 'abc.xyz'] },
  { id: 'microsoft', name: 'Microsoft', tokens: ['microsoft', 'office365', 'outlook'], officialDomains: ['microsoft.com', 'live.com', 'office.com', 'outlook.com'] },
  { id: 'amazon', name: 'Amazon', tokens: ['amazon', 'primevideo'], officialDomains: ['amazon.com'] },
  { id: 'netflix', name: 'Netflix', tokens: ['netflix'], officialDomains: ['netflix.com'] },
  { id: 'facebook', name: 'Facebook / Meta', tokens: ['facebook', 'meta'], officialDomains: ['facebook.com', 'meta.com'] },
  { id: 'instagram', name: 'Instagram', tokens: ['instagram'], officialDomains: ['instagram.com'] },
  { id: 'whatsapp', name: 'WhatsApp', tokens: ['whatsapp'], officialDomains: ['whatsapp.com'] },
  { id: 'wellsfargo', name: 'Wells Fargo', tokens: ['wellsfargo'], officialDomains: ['wellsfargo.com'] },
  { id: 'bankofamerica', name: 'Bank of America', tokens: ['bankofamerica', 'bofa'], officialDomains: ['bankofamerica.com'] },
  { id: 'binance', name: 'Binance', tokens: ['binance'], officialDomains: ['binance.com'] },
  { id: 'coinbase', name: 'Coinbase', tokens: ['coinbase'], officialDomains: ['coinbase.com'] },
  { id: 'dropbox', name: 'Dropbox', tokens: ['dropbox'], officialDomains: ['dropbox.com'] }
];

export interface BrandSecurityEvaluation {
  isImpersonationTarget: boolean;
  targetedBrand?: string;
  evidenceFactors: EvidenceFactor[];
  scorePenalty: number;
  confidenceFactor: number;
  details: string[];
}

// Suspicious authentication and credential solicitation keywords
const SUSPICIOUS_CREDENTIAL_KEYWORDS = [
  'login', 'signin', 'verify', 'verification', 'account', 'security',
  'billing', 'update', 'portal', 'auth', 'recover', 'wallet', 'unlock', 'support'
];

// Benign dictionary words to prevent false positives when brand name is a common English word (e.g. apple)
const BENIGN_UNRELATED_AFFIXES = [
  'cider', 'pie', 'orchard', 'farm', 'recipes', 'fruit', 'tree', 'juice', 'harvest', 'market', 'red', 'green'
];

/**
 * Evaluates hostname for brand impersonation, Unicode homoglyphs, typosquatting, and deceptive subdomains.
 */
export function evaluateBrandSecuritySignals(
  hostname: string,
  customMonitoredBrands: MonitoredBrand[] = []
): BrandSecurityEvaluation {
  const parsed = parseDomainInfo(hostname);
  if (parsed.isIp) {
    return {
      isImpersonationTarget: false,
      evidenceFactors: [],
      scorePenalty: 0,
      confidenceFactor: 0,
      details: []
    };
  }

  const skeletonInfo = toUnicodeAndSkeleton(hostname);
  const parsedSkeleton = parseDomainInfo(skeletonInfo.skeleton);

  const evidenceFactors: EvidenceFactor[] = [];
  const details: string[] = [];
  let scorePenalty = 0;
  let confidenceFactor = 0;
  let targetedBrand: string | undefined;

  const allMonitored = [...BUILTIN_PROTECTED_BRANDS, ...customMonitoredBrands];

  // 1. Unicode Confusable / Homoglyph Attack Analysis
  if (skeletonInfo.hasConfusables) {
    for (const brand of allMonitored) {
      const isOfficialDomain = brand.officialDomains.some(
        (od) => parsed.registrableDomain === od || parsed.normalizedHostname === od
      );
      if (isOfficialDomain) continue;

      // Check if skeleton matches brand token or brand domain
      const skeletonSld = parsedSkeleton.sld;
      for (const token of brand.tokens) {
        if (skeletonSld === token || skeletonSld.includes(token)) {
          targetedBrand = brand.name;
          const confusableDetails = skeletonInfo.confusableChars
            .map((c) => `"${c.char}" (${c.codePoint} -> '${c.replaces}')`)
            .join(', ');

          scorePenalty += 70;
          confidenceFactor = Math.max(confidenceFactor, 0.90);
          details.push(`Cyrillic/Greek Unicode homoglyph mimicking "${brand.name}": ${confusableDetails}`);

          evidenceFactors.push({
            id: `EV-HOMOGLYPH-${Date.now()}`,
            label: 'Unicode Homoglyph / Confusable Impersonation',
            severity: 'critical',
            detail: `Hostname uses internationalized character substitution (${confusableDetails}) to impersonate authoritative brand "${brand.name}".`,
            providerCitation: 'Unicode TR39 Confusable Detector'
          });
          break;
        }
      }
    }
  }

  // 2. Deceptive Subdomain Spoofing
  // e.g. paypal.com.account-update.net or verify.chase.com.evil.xyz
  if (parsed.subdomain && !targetedBrand) {
    for (const brand of allMonitored) {
      const isOfficialDomain = brand.officialDomains.some(
        (od) => parsed.registrableDomain === od || parsed.normalizedHostname === od
      );
      if (isOfficialDomain) continue;

      const subLower = parsed.subdomain.toLowerCase();
      for (const token of brand.tokens) {
        // If subdomain contains token.com or starts/ends with token
        const hasDeceptiveSub =
          subLower === token ||
          subLower === `${token}.com` ||
          subLower.includes(`${token}.com`) ||
          subLower.split('.').some((lbl) => lbl === token || lbl.startsWith(`${token}-`) || lbl.endsWith(`-${token}`));

        if (hasDeceptiveSub) {
          targetedBrand = brand.name;
          scorePenalty += 60;
          confidenceFactor = Math.max(confidenceFactor, 0.85);
          details.push(`Deceptive subdomain "${parsed.subdomain}" spoofing "${brand.name}" on unrelated domain "${parsed.registrableDomain}"`);

          evidenceFactors.push({
            id: `EV-DECEPTIVE-SUB-${Date.now()}`,
            label: 'Deceptive Subdomain Brand Spoofing',
            severity: 'high',
            detail: `Subdomain "${parsed.subdomain}" displays brand identifier "${brand.name}" while authoritative apex belongs to unrelated third party "${parsed.registrableDomain}".`,
            providerCitation: 'Subdomain Architecture Inspector'
          });
          break;
        }
      }
    }
  }

  // 3. Typosquatting & Visual Substitution in Registrable SLD
  if (!targetedBrand) {
    const rawSld = parsed.sld;
    const visualSld = normalizeVisualSubstitutions(rawSld);

    for (const brand of allMonitored) {
      const isOfficialDomain = brand.officialDomains.some(
        (od) => parsed.registrableDomain === od || parsed.normalizedHostname === od
      );
      if (isOfficialDomain) continue;

      for (const token of brand.tokens) {
        // A. Visual substitution match (e.g. paypa1 -> paypal, rnicrosoft -> microsoft)
        if (visualSld === token && rawSld !== token) {
          targetedBrand = brand.name;
          scorePenalty += 60;
          confidenceFactor = Math.max(confidenceFactor, 0.85);
          details.push(`Visual character substitution ("${rawSld}" -> "${token}") impersonating "${brand.name}"`);

          evidenceFactors.push({
            id: `EV-TYPO-VISUAL-${Date.now()}`,
            label: 'Visual Substitution Typosquatting',
            severity: 'high',
            detail: `Domain SLD "${rawSld}" employs character substitution to visually simulate "${brand.name}".`,
            providerCitation: 'Damerau-Levenshtein & Digraph Analyzer'
          });
          break;
        }

        // B. Damerau-Levenshtein edit distance (distance 1 or 2 on tokens of length >= 5)
        if (token.length >= 4) {
          const dist = damerauLevenshtein(rawSld, token);
          if (dist === 1 || (dist === 2 && token.length >= 7)) {
            // Guard against common English words if brand is "apple" or similar
            const isBenignWord = BENIGN_UNRELATED_AFFIXES.some((a) => rawSld.includes(a));
            if (!isBenignWord) {
              targetedBrand = brand.name;
              scorePenalty += 55;
              confidenceFactor = Math.max(confidenceFactor, 0.80);
              details.push(`Damerau-Levenshtein edit distance ${dist} from "${token}" (${brand.name})`);

              evidenceFactors.push({
                id: `EV-TYPOSQUAT-${Date.now()}`,
                label: 'Brand Trademark Typosquatting',
                severity: 'high',
                detail: `Domain SLD "${rawSld}" has edit distance ${dist} from official brand identifier "${token}".`,
                providerCitation: 'Damerau-Levenshtein Distance Engine'
              });
              break;
            }
          }
        }

        // C. Brand token combined with high-risk credential keywords
        // e.g. chase-security-login.com or paypal-verification-update.com
        if (rawSld.includes(token)) {
          const isBenignWord = BENIGN_UNRELATED_AFFIXES.some((a) => rawSld.includes(a));
          const hasCredentialKeyword = SUSPICIOUS_CREDENTIAL_KEYWORDS.some((kw) => rawSld.includes(kw));

          if (hasCredentialKeyword && !isBenignWord) {
            targetedBrand = brand.name;
            scorePenalty += 50;
            confidenceFactor = Math.max(confidenceFactor, 0.80);
            details.push(`Brand token "${token}" combined with deceptive authentication lure in "${rawSld}"`);

            evidenceFactors.push({
              id: `EV-LURE-${Date.now()}`,
              label: 'Brand Impersonation Credential Lure',
              severity: 'high',
              detail: `Domain SLD "${rawSld}" pairs brand token "${token}" with authentication keywords to solicit user credentials.`,
              providerCitation: 'Credential Lure Keyword Correlator'
            });
            break;
          }
        }
      }
      if (targetedBrand) break;
    }
  }

  return {
    isImpersonationTarget: Boolean(targetedBrand),
    targetedBrand,
    evidenceFactors,
    scorePenalty,
    confidenceFactor,
    details
  };
}

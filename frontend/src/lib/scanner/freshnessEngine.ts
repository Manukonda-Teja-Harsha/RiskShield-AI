/**
 * RiskShield AI — Indicator Normalization, History Retrieval & Freshness Engine
 * Manages deduplication, age verification, and evidence freshness.
 * Ensures previous assessments are cleanly surfaced without treating old evidence as newly performed.
 */

import type { ScanResult, PreviousAssessmentInfo } from '../../types';

/**
 * Normalizes an indicator safely without collapsing distinct security-sensitive paths.
 */
export function normalizeIndicator(raw: string, category?: string): string {
  let cleaned = raw.trim();

  // If phone number
  if (category === 'phone' || /^\+?[0-9\s\-()]+$/.test(cleaned)) {
    return cleaned.replace(/[\s\-\(\)]/g, '').toLowerCase();
  }

  // If UPI ID
  if (category === 'payment' || cleaned.includes('@') && !cleaned.includes('/') && !cleaned.includes(' ')) {
    return cleaned.toLowerCase();
  }

  // If Social Handle
  if (cleaned.startsWith('@')) {
    return cleaned.toLowerCase();
  }

  // URL or Domain
  let lower = cleaned.toLowerCase();
  // Strip protocol
  lower = lower.replace(/^https?:\/\//i, '');
  // Strip www.
  lower = lower.replace(/^www\./i, '');
  // Strip trailing slashes on bare domains
  if (!lower.includes('/') || lower.endsWith('/')) {
    lower = lower.replace(/\/+$/, '');
  }

  return lower;
}

const FRESHNESS_WINDOW_HOURS = 24;

/**
 * Retrieves the most recent authorized assessment for this indicator.
 */
export function evaluateFreshnessAndPreviousScan(
  normalizedTarget: string,
  authorizedHistory: ScanResult[]
): {
  previousAssessment?: PreviousAssessmentInfo;
  freshness: 'FRESH' | 'AGING' | 'STALE';
  priorEvidenceCount: number;
} {
  // Find matching scans in authorized history
  const matches = authorizedHistory.filter(s => {
    const sNorm = s.normalizedTarget || normalizeIndicator(s.target, s.category || s.mode);
    return sNorm === normalizedTarget;
  });

  if (matches.length === 0) {
    return {
      freshness: 'FRESH',
      priorEvidenceCount: 0
    };
  }

  // Sort by timestamp descending
  matches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const prior = matches[0];

  const priorTime = new Date(prior.timestamp).getTime();
  const now = Date.now();
  const ageMs = Math.max(0, now - priorTime);
  const ageHours = Math.round((ageMs / (1000 * 60 * 60)) * 10) / 10;

  const isFresh = ageHours < FRESHNESS_WINDOW_HOURS;
  const isAging = ageHours >= FRESHNESS_WINDOW_HOURS && ageHours < 168; // 7 days

  const freshness: 'FRESH' | 'AGING' | 'STALE' = isFresh ? 'FRESH' : isAging ? 'AGING' : 'STALE';

  return {
    previousAssessment: {
      previousScanId: prior.id,
      previousDate: prior.timestamp,
      previousStatus: prior.status,
      previousScore: prior.score,
      isFresh,
      ageHours,
      reusedEvidenceCount: prior.evidence ? prior.evidence.length : 0
    },
    freshness,
    priorEvidenceCount: prior.evidence ? prior.evidence.length : 0
  };
}

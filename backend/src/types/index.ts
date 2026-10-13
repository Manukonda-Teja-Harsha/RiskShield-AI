export type RiskStatus =
  | 'KNOWN_THREAT'
  | 'HIGH_RISK'
  | 'SUSPICIOUS'
  | 'INCONCLUSIVE'
  | 'NO_KNOWN_THREAT_DETECTED';

export type InputCategory =
  | 'url'
  | 'message'
  | 'phone'
  | 'social'
  | 'job'
  | 'payment'
  | 'app'
  | 'product'
  | 'other';

export interface EvidenceFactor {
  id: string;
  label: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detail: string;
  providerCitation?: string;
}

export type ThreatProviderName = 'OPENPHISH' | 'URLHAUS' | 'GOOGLE_WEB_RISK' | 'PHISHTANK' | 'HEURISTIC';

export type ProviderLookupStatus =
  | 'MATCH'
  | 'NO_MATCH'
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_CONFIGURED';

export interface ProviderLookupResult {
  provider: ThreatProviderName;
  status: ProviderLookupStatus;
  threatTypes?: string[];
  confidence?: number;
  responseTimeMs: number;
  evidence: EvidenceFactor[];
  rawDetails?: Record<string, unknown>;
  errorMessage?: string;
  feedFreshness?: 'FRESH' | 'STALE' | 'UPDATING' | 'LIVE_QUERY';
  lastRefreshedAt?: string;
  cachedEntriesCount?: number;
}

export interface ScanEvaluationResult {
  id: string;
  target: string;
  normalizedTarget: string;
  category: string;
  mode: string;
  status: RiskStatus;
  score: number;
  confidence: number;
  timestamp: string;
  evidence: EvidenceFactor[];
  sourcesChecked: string[];
  sourceFailures: string[];
  providerResults: ProviderLookupResult[];
  recommendedActions: string[];
  explanation: string;
  sanitizationApplied?: boolean;
}

export interface AuthorizedBrandMembershipDTO {
  brandId: string;
  brandName: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
  verificationStatus: 'PENDING_VERIFICATION' | 'PENDING_DNS' | 'VERIFIED' | 'FEATURED_PARTNER' | 'REJECTED';
}

export type AuthDestinationDirective =
  | 'VERIFY_EMAIL'
  | 'USER_DASHBOARD'
  | 'BRAND_DASHBOARD'
  | 'WORKSPACE_SELECTOR'
  | 'RECOVERY_REQUIRED';

export interface AuthenticatedUserDTO {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'brand_owner' | 'admin';
  accountStatus: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
  isEmailVerified: boolean;
  brandId?: string;
  brandName?: string;
  brandRole?: 'owner' | 'admin' | 'member';
  authorizedBrands: AuthorizedBrandMembershipDTO[];
}

export interface AuthenticatedContext {
  userId: string;
  email: string;
  role: 'user' | 'brand_owner' | 'admin';
  isEmailVerified: boolean;
  authorizedBrandIds: string[];
  accessToken?: string;
}

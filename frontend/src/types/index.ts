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

export type ScanMode = 'url' | 'message' | 'profile' | 'product' | 'phone' | 'payment' | 'app' | 'job' | 'other';

export type RiskStatus = 
  | 'KNOWN_THREAT'
  | 'HIGH_RISK'
  | 'SUSPICIOUS'
  | 'INCONCLUSIVE'
  | 'NO_KNOWN_THREAT_DETECTED';

export interface EvidenceFactor {
  id: string;
  label: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detail: string;
  providerCitation?: string;
}

export interface ExtractedIndicator {
  type: 'url' | 'domain' | 'phone' | 'email' | 'upi' | 'handle' | 'app_id';
  value: string;
}

export interface PreviousAssessmentInfo {
  previousScanId: string;
  previousDate: string;
  previousStatus: RiskStatus;
  previousScore: number;
  isFresh: boolean;
  ageHours: number;
  reusedEvidenceCount: number;
}

export interface ScannerContextPayload {
  category: InputCategory;
  primaryInput: string;
  channel?: string;
  senderInfo?: string;
  emailSubject?: string;
  requestedAction?: string;
  containedUrl?: string;
  claimedEntity?: string;
  isOpened?: boolean;
  enteredSensitiveInfo?: string;
  isImpersonating?: boolean;
  impersonatedEntity?: string;
  isPaymentRequested?: boolean;
  paymentDetails?: string;
  hasTransferredMoney?: boolean;
  requestedAmount?: string;
  appSource?: string;
  appPackageId?: string;
  notes?: string;
}

export interface ScanResult {
  id: string;
  userId?: string;
  brandId?: string;
  target: string;
  normalizedTarget?: string;
  mode: ScanMode;
  category?: InputCategory;
  contextPayload?: ScannerContextPayload;
  status: RiskStatus;
  score: number; // 0 to 100
  confidence?: number; // 0 to 1
  timestamp: string;
  evidence: EvidenceFactor[];
  sourcesChecked: string[];
  sourceFailures: string[];
  recommendedActions: string[];
  explanation: string;
  isBackendConnected?: boolean;
  freshness?: 'FRESH' | 'AGING' | 'STALE';
  previousAssessment?: PreviousAssessmentInfo;
  extractedIndicators?: ExtractedIndicator[];
  brandRelationship?: 'TARGETS_BRAND' | 'AUTHENTIC_ASSET' | 'UNRELATED' | 'NOT_APPLICABLE';
  associatedBrandName?: string;
  officialAssetCompared?: string;
  checksCompleted?: string[];
  checksUnavailable?: string[];
  providerResults?: {
    provider: 'OPENPHISH' | 'URLHAUS' | 'GOOGLE_WEB_RISK' | 'PHISHTANK' | 'HEURISTIC';
    status: 'MATCH' | 'NO_MATCH' | 'UNAVAILABLE' | 'TIMEOUT' | 'NOT_CONFIGURED';
    threatTypes?: string[];
    confidence?: number;
    responseTimeMs: number;
    evidence?: EvidenceFactor[];
    errorMessage?: string;
    feedFreshness?: 'FRESH' | 'STALE' | 'UPDATING' | 'LIVE_QUERY';
    lastRefreshedAt?: string;
    cachedEntriesCount?: number;
  }[];
  sanitizationApplied?: boolean;
  whoisDetails?: {
    registrar?: string;
    creationDate?: string;
    nameservers?: string[];
    country?: string;
  };
}

export type BrandAssetType = 'DOMAIN' | 'SUBDOMAIN' | 'SOCIAL_HANDLE' | 'TRADEMARK' | 'MERCHANT' | 'MOBILE_APP' | 'CONTACT_CHANNEL';

export interface BrandAsset {
  id: string;
  brandId?: string;
  brandName: string;
  type: BrandAssetType;
  platform?: string;
  value: string;
  status: 'VERIFIED' | 'PENDING_DNS' | 'PENDING_VERIFICATION' | 'DISPUTED' | 'REJECTED';
  verifiedAt?: string;
  dnsTxtRecord?: string;
  createdAt?: string;
}

export interface ThreatReport {
  id: string;
  target: string;
  targetType: 'URL' | 'PROFILE' | 'LISTING' | 'MESSAGE';
  category: string;
  status: 'PENDING_REVIEW' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED';
  reportedAt: string;
  notes?: string;
  evidenceCount?: number;
}

export interface AuthorizedBrandMembership {
  brandId: string;
  brandName: string;
  slug?: string;
  role: 'owner' | 'admin' | 'member';
  verificationStatus: 'PENDING_VERIFICATION' | 'PENDING_DNS' | 'VERIFIED' | 'FEATURED_PARTNER' | 'REJECTED';
}

export interface UserSession {
  id: string;
  email: string;
  fullName?: string;
  role: 'user' | 'brand_owner' | 'admin';
  accountStatus?: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
  brandName?: string;
  brandId?: string;
  brandRole?: 'owner' | 'admin' | 'member';
  authorizedBrands?: AuthorizedBrandMembership[];
  isEmailVerified: boolean;
  accessToken?: string;
  isDemo?: boolean;
}

export type BrandType = 
  | 'creator' 
  | 'small_business' 
  | 'registered_company' 
  | 'financial' 
  | 'digital_product' 
  | 'other';

export interface BrandSocialProfile {
  id: string;
  platform: string;
  urlOrHandle: string;
}

export interface BrandAppListing {
  id: string;
  name: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
  packageId?: string;
  bundleId?: string;
  developerName?: string;
}

export interface BrandContactChannels {
  businessEmail?: string;
  supportEmail?: string;
  phone?: string;
  whatsApp?: string;
  smsSenderId?: string;
  supportLink?: string;
}

export interface BrandOnboardingData {
  // Owner account credentials (when registering a brand workspace while unauthenticated)
  ownerFullName?: string;
  ownerEmail?: string;
  ownerPassword?: string;

  // Page 1: Identify Brand
  brandType: BrandType;
  name: string;
  primaryIdentityUrl: string; // Website, social profile, or public identity URL
  industry?: string;
  country?: string;
  description?: string;

  // Page 2: References
  officialWebsite?: string;
  additionalDomains: string[];
  alternativeNames: string[];
  socialProfiles: BrandSocialProfile[];
  apps: BrandAppListing[];
  contacts: BrandContactChannels;
  logoUrl?: string;
  additionalReferences?: string;

  // Progress state
  currentStep: 1 | 2;
  isCompleted?: boolean;
  lastSavedAt?: string;
}

export interface BrandPastWork {
  id: string;
  campaignTitle: string;
  category: string;
  completedAt: string;
  impactMetric: string;
  summary: string;
}

export interface RegisteredBrand {
  id: string;
  name: string;
  slug: string;
  logoInitial: string;
  accentColor: string;
  category: string;
  description: string;
  featured?: boolean;
  sponsored?: boolean;
  registeredAt: string; // ISO date e.g. 2026-10-11
  relativeTime: string; // e.g. "1 day ago"
  status: 'VERIFIED' | 'PENDING_DNS' | 'FEATURED_PARTNER';
  verifiedAssetsCount: number;
  activeCampaignsCount: number;
  pastWork: BrandPastWork[];
  website: string;
  verifiedDomains: string[];
  alternativeNames?: string[];
  officialSocials?: string[];
  officialApps?: string[];
}

export type MonitoringStatus = 'Monitoring' | 'Threat Detected' | 'Check Unavailable' | 'Monitoring Paused';

export interface ThreatWatchItem {
  id: string;
  target: string;
  targetType: ScanMode;
  assessment: RiskStatus;
  lastChecked: string;
  monitoringStatus: MonitoringStatus;
  statusHistory: {
    timestamp: string;
    status: RiskStatus;
    note: string;
  }[];
  notificationsEnabled: boolean;
  notes?: string;
  createdAt: string;
}

export type UserReportStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'CONFIRMED' | 'DISMISSED' | 'UNRESOLVED';

export interface UserReport {
  id: string;
  target: string;
  category: string;
  status: UserReportStatus;
  submittedAt: string;
  notes?: string;
  evidenceCount?: number;
}

export interface SavedFinding {
  id: string;
  scanId: string;
  target: string;
  mode: ScanMode;
  status: RiskStatus;
  score: number;
  explanation: string;
  savedAt: string;
  personalNotes?: string;
}

// Enterprise Brand Protection Dashboard Types (Challenge 03)
export type ThreatFindingStatus = 
  | 'NEW' 
  | 'UNDER_INVESTIGATION' 
  | 'TAKEDOWN_REQUESTED' 
  | 'RESOLVED' 
  | 'FALSE_POSITIVE'
  | 'UNDER_REVIEW'
  | 'CONFIRMED_THREAT';
export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ThreatPlatform = 'DOMAIN' | 'SOCIAL' | 'MESSAGING' | 'MOBILE_APP' | 'MARKETPLACE' | 'OTHER';

export interface FindingAuditEntry {
  timestamp: string;
  action: string;
  fromStatus?: ThreatFindingStatus;
  toStatus?: ThreatFindingStatus;
  notes?: string;
  userEmail?: string;
}

export interface BrandThreatFinding {
  id: string;
  brandId: string;
  brandName: string;
  target: string;
  normalizedTarget: string;
  platform: ThreatPlatform;
  severity: ThreatSeverity;
  riskScore: number; // 0 to 100
  status: ThreatFindingStatus;
  detectionReason: string;
  source: string;
  firstDetectedAt: string;
  lastAssessedAt: string;
  evidence: EvidenceFactor[];
  officialAssetCompared?: string;
  notes?: string;
  repeatScanCount: number;
  investigationHistory?: FindingAuditEntry[];
  whoisDetails?: {
    registrar?: string;
    creationDate?: string;
    nameservers?: string[];
    country?: string;
  };
}

export interface BrandActivityEvent {
  id: string;
  brandId: string;
  type: 'FINDING_CREATED' | 'FINDING_UPDATED' | 'STATUS_CHANGED' | 'ASSET_ADDED' | 'ASSET_VERIFIED' | 'ASSET_REMOVED' | 'REPORT_EXPORTED';
  title: string;
  description: string;
  timestamp: string;
  severity?: ThreatSeverity;
}

export interface BrandMonitorSchedule {
  id: string;
  brandId: string;
  enabled: boolean;
  frequencyHours: number;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string;
  lastRunAt: string | null;
  nextRunAt: string;
  lockedUntil: string | null;
  lockedBy: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  lastFindingsFound: number;
  lastAssetsScanned: number;
  createdAt: string;
  updatedAt: string;
}





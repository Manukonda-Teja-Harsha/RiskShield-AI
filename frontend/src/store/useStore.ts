import { create } from 'zustand';
import { 
  ScanResult, 
  BrandAsset, 
  ThreatReport, 
  UserSession, 
  RegisteredBrand,
  ThreatWatchItem,
  UserReport,
  SavedFinding,
  BrandThreatFinding,
  BrandActivityEvent,
  ThreatFindingStatus,
  ThreatSeverity,
  ThreatPlatform,
  EvidenceFactor,
  BrandOnboardingData,
  AuthorizedBrandMembership,
  BrandMonitorSchedule
} from '../types';
import { normalizeTarget } from '../lib/brandDetection';
import { fetchCurrentUserSession, signOutSession, getStoredAccessToken } from '../lib/auth';
import {
  fetchUserScanHistory,
  fetchUserBrandWorkspaces,
  fetchBrandAssets,
  fetchBrandThreatFindings,
  addBrandAssetApi,
  deleteBrandAssetApi,
  verifyBrandAssetDnsApi,
  updateBrandProfileApi,
  fetchBrandMonitorScheduleApi,
  updateBrandMonitorScheduleApi,
  transitionBrandFindingStatusApi,
  addFindingNoteApi
} from '../lib/api';

interface AppState {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  user: UserSession | null;
  login: (
    email: string, 
    role?: 'user' | 'brand_owner' | 'admin', 
    brandName?: string, 
    isDemo?: boolean,
    fullName?: string,
    isEmailVerified?: boolean,
    authorizedBrands?: AuthorizedBrandMembership[]
  ) => void;
  logout: () => void;
  restoreSession: () => Promise<void>;
  verifyEmail: (targetEmail?: string) => void;
  createBrandWorkspace: (data: BrandOnboardingData) => { brand: RegisteredBrand; user: UserSession };
  loadBrandWorkspaces: () => Promise<void>;
  loadBrandWorkspaceDetails: (brandId?: string) => Promise<void>;
  onboardingDraft: Partial<BrandOnboardingData> | null;
  saveOnboardingDraft: (draft: Partial<BrandOnboardingData>) => void;
  clearOnboardingDraft: () => void;
  switchWorkspace: (brandId?: string) => void;

  scanHistory: ScanResult[];
  loadScanHistory: () => Promise<void>;
  addScanResult: (result: ScanResult) => void;
  removeScanResult: (id: string) => void;
  clearHistory: () => void;

  brandScanHistory: ScanResult[];
  addBrandScanResult: (result: ScanResult) => void;

  brandAssets: BrandAsset[];
  addBrandAsset: (asset: Omit<BrandAsset, 'id'>) => Promise<void>;
  verifyBrandAsset: (id: string) => Promise<{ verified: boolean; message: string }>;
  removeBrandAsset: (id: string) => Promise<void>;

  threatReports: ThreatReport[];
  addThreatReport: (report: Omit<ThreatReport, 'id' | 'reportedAt'>) => void;
  updateReportStatus: (id: string, status: ThreatReport['status']) => void;

  // Registered Brands for Discovery & Marketing
  registeredBrands: RegisteredBrand[];
  selectedBrandModal: RegisteredBrand | null;
  setSelectedBrandModal: (brand: RegisteredBrand | null) => void;
  updateBrandProfile: (brandId: string, updates: Partial<RegisteredBrand>) => Promise<void>;

  // In-page Quick Scanner Target Handshake
  quickScanTarget: string | null;
  setQuickScanTarget: (target: string | null) => void;

  // User Dashboard: Threat Watch, Scam Reports, Saved Findings
  threatWatchList: ThreatWatchItem[];
  addThreatWatch: (item: Omit<ThreatWatchItem, 'id' | 'createdAt' | 'lastChecked' | 'statusHistory'>) => void;
  toggleThreatWatchStatus: (id: string) => void;
  removeThreatWatch: (id: string) => void;
  updateThreatWatch: (id: string, updates: Partial<ThreatWatchItem>) => void;

  userReports: UserReport[];
  addUserReport: (report: Omit<UserReport, 'id' | 'submittedAt'>) => void;

  savedFindings: SavedFinding[];
  addSavedFinding: (finding: Omit<SavedFinding, 'id' | 'savedAt'>) => void;
  removeSavedFinding: (id: string) => void;

  // ==========================================
  // Brand Protection Command Center (Challenge 03)
  // ==========================================
  activeBrandId: string;
  setActiveBrandId: (brandId: string) => void;

  brandThreatFindings: BrandThreatFinding[];
  addOrUpdateBrandThreatFinding: (data: {
    brandId: string;
    brandName: string;
    target: string;
    platform: ThreatPlatform;
    severity: ThreatSeverity;
    riskScore: number;
    detectionReason: string;
    source: string;
    evidence: EvidenceFactor[];
    officialAssetCompared?: string;
    whoisDetails?: {
      registrar: string;
      creationDate: string;
      nameservers: string[];
      country: string;
    };
  }) => { finding: BrandThreatFinding; isNew: boolean };
  updateFindingStatus: (id: string, newStatus: ThreatFindingStatus, notes?: string, userEmail?: string) => Promise<void>;
  addFindingNote: (id: string, note: string, userEmail?: string) => Promise<void>;
  removeBrandThreatFinding: (id: string) => void;

  brandMonitorSchedule: BrandMonitorSchedule | null;
  loadBrandMonitorSchedule: (brandId?: string) => Promise<void>;
  updateBrandMonitorSchedule: (brandId: string, options: { enabled?: boolean; frequencyHours?: number; runNow?: boolean }) => Promise<any>;

  brandActivities: BrandActivityEvent[];
  addBrandActivity: (activity: Omit<BrandActivityEvent, 'id' | 'timestamp'>) => void;
}

const INITIAL_BRAND_ASSETS: BrandAsset[] = [
  {
    id: 'BA-101',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    type: 'DOMAIN',
    value: 'acmefinancial.com',
    status: 'VERIFIED',
    verifiedAt: '2026-09-15',
    dnsTxtRecord: 'riskshield-verification=941a8e2b84',
    createdAt: '2026-09-15'
  },
  {
    id: 'BA-102',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    type: 'SUBDOMAIN',
    value: 'secure.acmefinancial.com',
    status: 'VERIFIED',
    verifiedAt: '2026-09-18',
    dnsTxtRecord: 'riskshield-verification=11b239dc55',
    createdAt: '2026-09-18'
  },
  {
    id: 'BA-103',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    type: 'SOCIAL_HANDLE',
    value: '@acmefinancial',
    status: 'VERIFIED',
    verifiedAt: '2026-10-01',
    createdAt: '2026-10-01'
  },
  {
    id: 'BA-104',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    type: 'DOMAIN',
    value: 'acme-pay.io',
    status: 'PENDING_DNS',
    dnsTxtRecord: 'riskshield-verification=f90119ec7a',
    createdAt: '2026-10-08'
  },
  {
    id: 'BA-105',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    type: 'MOBILE_APP',
    value: 'com.acmefinancial.mobile.banking',
    status: 'VERIFIED',
    verifiedAt: '2026-09-20',
    dnsTxtRecord: 'riskshield-verification=app-acme-8812',
    createdAt: '2026-09-20'
  },
  {
    id: 'BA-201',
    brandId: 'RB-02',
    brandName: 'Apex Cloud AI',
    type: 'DOMAIN',
    value: 'apexcloud.ai',
    status: 'VERIFIED',
    verifiedAt: '2026-10-02',
    dnsTxtRecord: 'riskshield-verification=apex-391a9',
    createdAt: '2026-10-02'
  },
  {
    id: 'BA-202',
    brandId: 'RB-02',
    brandName: 'Apex Cloud AI',
    type: 'SUBDOMAIN',
    value: 'console.apexcloud.ai',
    status: 'VERIFIED',
    verifiedAt: '2026-10-03',
    dnsTxtRecord: 'riskshield-verification=apex-44c12',
    createdAt: '2026-10-03'
  },
  {
    id: 'BA-301',
    brandId: 'RB-03',
    brandName: 'NexaRetail Global',
    type: 'DOMAIN',
    value: 'nexaretail.com',
    status: 'VERIFIED',
    verifiedAt: '2026-09-28',
    dnsTxtRecord: 'riskshield-verification=nexa-7721e',
    createdAt: '2026-09-28'
  }
];

const INITIAL_THREAT_REPORTS: ThreatReport[] = [
  {
    id: 'TR-501',
    target: 'acme-financial-secure-login.top',
    targetType: 'URL',
    category: 'Credential Phishing',
    status: 'CONFIRMED',
    reportedAt: '2 hours ago',
    notes: 'Lookalike clone of customer online banking portal.',
    evidenceCount: 3
  },
  {
    id: 'TR-502',
    target: '@acme_official_support_desk',
    targetType: 'PROFILE',
    category: 'Executive Impersonation',
    status: 'INVESTIGATING',
    reportedAt: '1 day ago',
    notes: 'Direct messaging customers demanding fee to unlock transfers.',
    evidenceCount: 2
  },
  {
    id: 'TR-503',
    target: 'acme-refunds-portal.biz',
    targetType: 'URL',
    category: 'Typosquat Domain',
    status: 'PENDING_REVIEW',
    reportedAt: '2 days ago',
    notes: 'Domain registered 48 hours ago in suspicious offshore registrar.',
    evidenceCount: 1
  }
];

const INITIAL_THREAT_WATCH: ThreatWatchItem[] = [
  {
    id: 'TW-101',
    target: 'chase-security-verify-session.top',
    targetType: 'url',
    assessment: 'KNOWN_THREAT',
    lastChecked: '10 minutes ago',
    monitoringStatus: 'Threat Detected',
    statusHistory: [
      { timestamp: '2 days ago', status: 'SUSPICIOUS', note: 'Newly registered offshore domain detected' },
      { timestamp: '10 minutes ago', status: 'KNOWN_THREAT', note: 'Target listed on verified PhishTank feed' }
    ],
    notificationsEnabled: true,
    notes: 'Suspicious Chase Bank SMS lure targeting account credentials',
    createdAt: '2026-10-10'
  },
  {
    id: 'TW-102',
    target: 'apple.com',
    targetType: 'url',
    assessment: 'NO_KNOWN_THREAT_DETECTED',
    lastChecked: '1 hour ago',
    monitoringStatus: 'Monitoring',
    statusHistory: [
      { timestamp: '1 hour ago', status: 'NO_KNOWN_THREAT_DETECTED', note: 'Authoritative root DNS and EV SSL validated' }
    ],
    notificationsEnabled: false,
    notes: 'Official Apple domain monitored for comparative baseline',
    createdAt: '2026-10-11'
  }
];

const INITIAL_USER_REPORTS: UserReport[] = [
  {
    id: 'REP-201',
    target: 'verify-account-portal.xyz',
    category: 'Credential Phishing',
    status: 'UNDER_REVIEW',
    submittedAt: '3 hours ago',
    notes: 'Fake SMS notification requesting login to update delivery address.',
    evidenceCount: 2
  },
  {
    id: 'REP-202',
    target: 'parcel-fee-unpaid-notice.online',
    category: 'Package Courier Scam',
    status: 'CONFIRMED',
    submittedAt: 'Yesterday',
    notes: 'Coercive urgency SMS demanding $2.40 release fee.',
    evidenceCount: 3
  }
];

const INITIAL_PERSONAL_SCANS: ScanResult[] = [
  {
    id: 'SCAN-991001',
    userId: 'USR-DEFAULT',
    target: 'chase-security-verify-session.top',
    normalizedTarget: 'chase-security-verify-session.top',
    mode: 'url',
    category: 'url',
    status: 'KNOWN_THREAT',
    score: 96,
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    explanation: 'Target matches verified credential harvesting heuristics and high-risk homograph domain patterns.',
    sourcesChecked: ['RiskShield Signature & Heuristics Engine', 'Authoritative DNS & Certificate Telemetry'],
    sourceFailures: ['PhishTank Community Feed (Awaiting live API key deployment; checked local signatures)'],
    checksCompleted: ['RiskShield Signature & Heuristics Engine verified', 'Authoritative DNS & Certificate Telemetry verified'],
    checksUnavailable: ['PhishTank Feed Adapter (Awaiting live API key deployment; checked local signatures)'],
    evidence: [
      {
        id: 'EV-1',
        label: 'Homograph Domain Substitution',
        severity: 'high',
        detail: 'Character substitution mimicking established trademark domain.',
        providerCitation: 'RFC-3490 Internationalized Domain Filter'
      },
      {
        id: 'EV-2',
        label: 'Credential Intercept Form',
        severity: 'high',
        detail: 'Destination host relays sensitive authentication POST requests to unverified recipient IP.',
        providerCitation: 'DOM Structural Signature'
      }
    ],
    recommendedActions: [
      'Do not click this link or submit authentication credentials.',
      'If you already provided a password, change it immediately on the official service website.'
    ],
    isBackendConnected: false
  },
  {
    id: 'SCAN-991002',
    userId: 'USR-DEFAULT',
    target: 'google.com',
    normalizedTarget: 'google.com',
    mode: 'url',
    category: 'url',
    status: 'NO_KNOWN_THREAT_DETECTED',
    score: 5,
    timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    explanation: 'Authoritative established infrastructure. No active malicious indicators cataloged across connected threat sources.',
    sourcesChecked: ['RiskShield Signature & Heuristics Engine', 'Authoritative DNS & Certificate Telemetry'],
    sourceFailures: [],
    checksCompleted: ['RiskShield Signature & Heuristics Engine verified', 'Authoritative DNS & Certificate Telemetry verified'],
    checksUnavailable: ['PhishTank Feed Adapter (Awaiting live API key deployment; checked local signatures)'],
    evidence: [
      {
        id: 'EV-G1',
        label: 'Authoritative Enterprise Infrastructure',
        severity: 'low',
        detail: 'Domain established > 10 years with recognized corporate DNS records and clean certificate transparency logs.',
        providerCitation: 'RFC-1035 Authoritative Root DNS Resolver'
      }
    ],
    recommendedActions: [
      'Target reputation aligns with legitimate verified standards.',
      'Always verify browser address bars before entering multi-factor authentication tokens.'
    ],
    isBackendConnected: false
  }
];

const INITIAL_BRAND_SCANS: ScanResult[] = [
  {
    id: 'BSCAN-881001',
    brandId: 'RB-01',
    target: 'acme-financial-secure-login.top',
    normalizedTarget: 'acme-financial-secure-login.top',
    mode: 'url',
    category: 'url',
    status: 'KNOWN_THREAT',
    score: 95,
    timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    explanation: 'High-risk lookalike host targeting Acme Financial customers with deceptive login keywords and unauthorized brand tokens.',
    sourcesChecked: ['RiskShield Signature & Heuristics Engine', 'Authoritative DNS & Certificate Telemetry'],
    sourceFailures: [],
    checksCompleted: ['RiskShield Signature & Heuristics Engine verified', 'Authoritative DNS & Certificate Telemetry verified'],
    checksUnavailable: ['PhishTank Feed Adapter (Awaiting live API key deployment; checked local signatures)'],
    evidence: [
      {
        id: 'EV-B1',
        label: 'Brand Trademark Permutation in Target Identifier',
        severity: 'high',
        detail: 'Target contains unauthorized brand token "acmefinancial" mimicking official identity [acmefinancial.com].',
        providerCitation: 'Levenshtein Distance & Phonetic Corpus Heuristic'
      }
    ],
    brandRelationship: 'TARGETS_BRAND',
    associatedBrandName: 'Acme Financial',
    officialAssetCompared: 'acmefinancial.com',
    recommendedActions: [
      'Review finding details and evidence packet in Threat Investigations.',
      'Transition status to Confirmed Threat and initiate RFC-2142 registrar takedown.'
    ],
    isBackendConnected: false
  }
];

const INITIAL_REGISTERED_BRANDS: RegisteredBrand[] = [
  {
    id: 'RB-01',
    name: 'Acme Financial',
    slug: 'acme-financial',
    logoInitial: 'AF',
    accentColor: '#FF5500',
    category: 'Fintech & Banking',
    description: 'Tier-1 consumer retail banking and institutional financial services protecting millions of cardholders.',
    featured: true,
    registeredAt: '2026-09-15',
    relativeTime: 'Sep 15, 2026',
    status: 'FEATURED_PARTNER',
    verifiedAssetsCount: 4,
    activeCampaignsCount: 2,
    website: 'https://acmefinancial.com',
    verifiedDomains: ['acmefinancial.com', 'secure.acmefinancial.com', 'acme-pay.io'],
    alternativeNames: ['Acme Bank', 'Acme Fin', 'Acme Global', 'Acme Online'],
    officialSocials: ['@acmefinancial', '@acmesupport'],
    officialApps: ['com.acmefinancial.mobile.banking'],
    pastWork: [
      {
        id: 'PW-01',
        campaignTitle: 'Customer Online Banking Clone Neutralization',
        category: 'Phishing Shield',
        completedAt: 'Q3 2026',
        impactMetric: '99.4% fraudulent clone takedown rate',
        summary: 'Detected and submitted RFC abuse packets against 14 lookalike login portals impersonating Acme online banking.'
      },
      {
        id: 'PW-02',
        campaignTitle: 'Banking Subdomain DNS TXT Cryptographic Attestation',
        category: 'Infrastructure Attestation',
        completedAt: 'Sep 2026',
        impactMetric: '100% verified authentic portals',
        summary: 'Attested 12 authoritative banking subdomains into RiskShield public verified registry with zero false alarms.'
      }
    ]
  },
  {
    id: 'RB-02',
    name: 'Apex Cloud AI',
    slug: 'apex-cloud',
    logoInitial: 'AC',
    accentColor: '#10B981',
    category: 'Cloud & Developer Tools',
    description: 'Distributed serverless GPU inference clusters and global developer API infrastructure.',
    featured: false,
    registeredAt: '2026-10-02',
    relativeTime: 'Oct 02, 2026',
    status: 'VERIFIED',
    verifiedAssetsCount: 2,
    activeCampaignsCount: 1,
    website: 'https://apexcloud.ai',
    verifiedDomains: ['apexcloud.ai', 'console.apexcloud.ai'],
    alternativeNames: ['Apex AI', 'Apex Compute', 'Apex Cloud'],
    officialSocials: ['@apexcloudai'],
    pastWork: [
      {
        id: 'PW-03',
        campaignTitle: 'Developer API Credential Harvesting Defense',
        category: 'API Gateway Shield',
        completedAt: 'Oct 2026',
        impactMetric: 'Zero developer token leaks',
        summary: 'Neutralized malicious landing pages impersonating developer API key rotation consoles.'
      }
    ]
  },
  {
    id: 'RB-03',
    name: 'NexaRetail Global',
    slug: 'nexaretail',
    logoInitial: 'NR',
    accentColor: '#3B82F6',
    category: 'E-Commerce & Retail',
    description: 'Cross-border digital retail ecosystem and verified merchant marketplace in 34 countries.',
    featured: false,
    registeredAt: '2026-09-28',
    relativeTime: 'Sep 28, 2026',
    status: 'VERIFIED',
    verifiedAssetsCount: 1,
    activeCampaignsCount: 1,
    website: 'https://nexaretail.com',
    verifiedDomains: ['nexaretail.com'],
    alternativeNames: ['Nexa Retail', 'Nexa Market', 'Nexa Pay'],
    pastWork: [
      {
        id: 'PW-04',
        campaignTitle: 'Holiday Counterfeit Checkout Clearance',
        category: 'Counterfeit Mitigation',
        completedAt: 'Oct 2026',
        impactMetric: '32 fake checkout gateways blocked',
        summary: 'Intercepted fraudulent payment checkouts hijacking the NexaRetail merchant brand and trademarks.'
      }
    ]
  },
  {
    id: 'RB-04',
    name: 'CyberVault Security',
    slug: 'cybervault',
    logoInitial: 'CV',
    accentColor: '#8B5CF6',
    category: 'Cybersecurity & Identity',
    description: 'Zero-trust enterprise IAM authentication, hardware keys, and secrets vaults.',
    featured: false,
    registeredAt: '2026-10-08',
    relativeTime: 'Oct 08, 2026',
    status: 'VERIFIED',
    verifiedAssetsCount: 1,
    activeCampaignsCount: 1,
    website: 'https://cybervault.io',
    verifiedDomains: ['cybervault.io'],
    alternativeNames: ['Cyber Vault', 'Vault Security'],
    pastWork: []
  },
  {
    id: 'RB-05',
    name: 'PulseHealth Med',
    slug: 'pulsehealth',
    logoInitial: 'PH',
    accentColor: '#EC4899',
    category: 'Healthcare & Biotech',
    description: 'Encrypted patient portals, telehealth consultations, and certified clinical trial registries.',
    featured: false,
    registeredAt: '2026-10-10',
    relativeTime: 'Oct 10, 2026',
    status: 'VERIFIED',
    verifiedAssetsCount: 1,
    activeCampaignsCount: 1,
    website: 'https://pulsehealth.med',
    verifiedDomains: ['pulsehealth.med'],
    alternativeNames: ['Pulse Health', 'PulseMed'],
    pastWork: []
  },
  {
    id: 'RB-06',
    name: 'Zenith Logistics',
    slug: 'zenith-logistics',
    logoInitial: 'ZL',
    accentColor: '#F59E0B',
    category: 'Supply Chain & Freight',
    description: 'Autonomous freight forwarding and real-time intermodal container tracking network.',
    featured: false,
    registeredAt: '2026-10-11',
    relativeTime: 'Oct 11, 2026',
    status: 'VERIFIED',
    verifiedAssetsCount: 1,
    activeCampaignsCount: 1,
    website: 'https://zenithlogistics.com',
    verifiedDomains: ['zenithlogistics.com'],
    alternativeNames: ['Zenith Freight', 'Zenith Ship'],
    pastWork: []
  },
  {
    id: 'RB-07',
    name: 'AeroPay Payments',
    slug: 'aeropay',
    logoInitial: 'AP',
    accentColor: '#06B6D4',
    category: 'Fintech & Banking',
    description: 'Instant cross-border payment rails and programmatic currency settlement engines.',
    featured: false,
    registeredAt: '2026-10-12',
    relativeTime: 'Oct 12, 2026',
    status: 'PENDING_DNS',
    verifiedAssetsCount: 0,
    activeCampaignsCount: 1,
    website: 'https://aeropay.global',
    verifiedDomains: ['aeropay.global'],
    alternativeNames: ['Aero Pay'],
    pastWork: []
  }
];

const INITIAL_BRAND_FINDINGS: BrandThreatFinding[] = [
  {
    id: 'BTF-801',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    target: 'acme-financial-secure-login.top',
    normalizedTarget: 'acme-financial-secure-login.top',
    platform: 'DOMAIN',
    severity: 'critical',
    riskScore: 98,
    status: 'CONFIRMED_THREAT',
    detectionReason: 'High-risk lookalike host deploying unauthorized Acme Financial trademarks and credential harvesting forms.',
    source: 'Continuous Phishing Crawler',
    firstDetectedAt: '2026-10-10T14:22:00Z',
    lastAssessedAt: '2026-10-12T18:10:00Z',
    repeatScanCount: 4,
    officialAssetCompared: 'acmefinancial.com',
    notes: 'Submitted RFC-2142 abuse report to registrar offshore desk. DNS records currently resolving to bulletproof ASN.',
    evidence: [
      { 
        id: 'ev-1', 
        label: 'Typosquat Trademark Exploitation', 
        severity: 'high', 
        detail: 'Target domain utilizes protected trademark "acme-financial" without authorization.', 
        providerCitation: 'Levenshtein Trademark Matcher' 
      },
      { 
        id: 'ev-2', 
        label: 'Credential Intercept Form', 
        severity: 'high', 
        detail: 'Page hosts forged customer login form targeting online banking credentials and SSN.', 
        providerCitation: 'DOM Structural Signature' 
      },
      { 
        id: 'ev-3', 
        label: 'Bulletproof Offshore Hosting', 
        severity: 'critical', 
        detail: 'Hosted on anonymous AS49868 with active history of fast-flux phishing rotation.', 
        providerCitation: 'Spamhaus Autonomous System Feed' 
      }
    ],
    investigationHistory: [
      { timestamp: '2026-10-10 14:22', action: 'Threat Auto-Captured', toStatus: 'NEW', notes: 'Discovered via automated DNS certificate stream scan', userEmail: 'system' },
      { timestamp: '2026-10-11 09:15', action: 'Status Changed', fromStatus: 'NEW', toStatus: 'UNDER_REVIEW', notes: 'Assigned to brand security team for lookalike verification', userEmail: 'brand@acme.com' },
      { timestamp: '2026-10-11 11:30', action: 'Status Changed', fromStatus: 'UNDER_REVIEW', toStatus: 'CONFIRMED_THREAT', notes: 'Confirmed live credential harvesting clone. Takedown requested.', userEmail: 'brand@acme.com' }
    ],
    whoisDetails: { 
      registrar: 'NameCheap Privacy Protect', 
      creationDate: '2026-10-09', 
      nameservers: ['ns1.bulletproof-dns.is', 'ns2.bulletproof-dns.is'], 
      country: 'IS' 
    }
  },
  {
    id: 'BTF-802',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    target: '@acme_official_support_desk',
    normalizedTarget: '@acme_official_support_desk',
    platform: 'SOCIAL',
    severity: 'high',
    riskScore: 89,
    status: 'UNDER_REVIEW',
    detectionReason: 'Unauthorized Telegram / X support handle impersonating Acme Financial executive helpdesk.',
    source: 'Social Impersonation Radar',
    firstDetectedAt: '2026-10-11T08:14:00Z',
    lastAssessedAt: '2026-10-12T10:45:00Z',
    repeatScanCount: 2,
    officialAssetCompared: '@acmefinancial',
    notes: 'Profile observed messaging users requesting a $50 wire transfer fee to unlock frozen accounts.',
    evidence: [
      { 
        id: 'ev-4', 
        label: 'Impersonation of Customer Service Persona', 
        severity: 'high', 
        detail: 'Using official brand logo and bio text mimicking verified Acme Financial support.', 
        providerCitation: 'Social Graph Identity Scanner' 
      },
      { 
        id: 'ev-5', 
        label: 'Coercive Urgency Payment Solicitation', 
        severity: 'high', 
        detail: 'Direct messages reported by 3 users demanding emergency wire transfers.', 
        providerCitation: 'User Fraud Evidence Feed' 
      }
    ],
    investigationHistory: [
      { timestamp: '2026-10-11 08:14', action: 'Threat Auto-Captured', toStatus: 'NEW', notes: 'Captured from suspicious social handle mention', userEmail: 'system' },
      { timestamp: '2026-10-11 14:00', action: 'Status Changed', fromStatus: 'NEW', toStatus: 'UNDER_REVIEW', notes: 'Reviewing cross-platform profile links', userEmail: 'brand@acme.com' }
    ]
  },
  {
    id: 'BTF-803',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    target: 'acme-refunds-portal.biz',
    normalizedTarget: 'acme-refunds-portal.biz',
    platform: 'DOMAIN',
    severity: 'high',
    riskScore: 84,
    status: 'NEW',
    detectionReason: 'Newly registered lookalike domain with fee refund lure and deceptive brand slug.',
    source: 'DNS Entropy Analyzer',
    firstDetectedAt: '2026-10-12T04:19:00Z',
    lastAssessedAt: '2026-10-12T04:19:00Z',
    repeatScanCount: 1,
    officialAssetCompared: 'acmefinancial.com',
    notes: 'Awaiting analyst review. Domain registered 18 hours ago.',
    evidence: [
      { 
        id: 'ev-6', 
        label: 'Suspicious Domain Entropy & Timing', 
        severity: 'high', 
        detail: 'Domain registered < 24 hours ago using privacy proxy.', 
        providerCitation: 'ICANN Whois Telemetry' 
      },
      { 
        id: 'ev-7', 
        label: 'Deceptive Refund Trap Terminology', 
        severity: 'medium', 
        detail: 'Subdomain pattern targets unsuspecting banking customers claiming uncollected cash rebates.', 
        providerCitation: 'Linguistic Lure Classifier' 
      }
    ],
    investigationHistory: [
      { timestamp: '2026-10-12 04:19', action: 'Threat Auto-Captured', toStatus: 'NEW', notes: 'Automated scan flagged lookalike registration', userEmail: 'system' }
    ]
  },
  {
    id: 'BTF-804',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    target: 'wa.me/message/ACME-CLAIM-2026',
    normalizedTarget: 'wa.me/message/acme-claim-2026',
    platform: 'MESSAGING',
    severity: 'medium',
    riskScore: 68,
    status: 'NEW',
    detectionReason: 'Deceptive messaging invitation link circulating via SMS phishing lures.',
    source: 'User Fraud Telemetry',
    firstDetectedAt: '2026-10-12T11:05:00Z',
    lastAssessedAt: '2026-10-12T11:05:00Z',
    repeatScanCount: 1,
    officialAssetCompared: 'acmefinancial.com',
    notes: 'Identified from user SMS submission reported to support desk.',
    evidence: [
      { 
        id: 'ev-8', 
        label: 'Unverified Third-Party Messaging Channel', 
        severity: 'medium', 
        detail: 'Acme Financial does not conduct outbound support via WhatsApp or Telegram.', 
        providerCitation: 'Brand Channel Compliance Rule' 
      }
    ]
  },
  {
    id: 'BTF-805',
    brandId: 'RB-01',
    brandName: 'Acme Financial',
    target: 'acmefinancial-partner-portal.net',
    normalizedTarget: 'acmefinancial-partner-portal.net',
    platform: 'DOMAIN',
    severity: 'low',
    riskScore: 32,
    status: 'RESOLVED',
    detectionReason: 'Whitelisted internal affiliate test portal now migrated to official subdomain.',
    source: 'Security Audit',
    firstDetectedAt: '2026-09-20T10:00:00Z',
    lastAssessedAt: '2026-10-05T16:00:00Z',
    repeatScanCount: 3,
    officialAssetCompared: 'secure.acmefinancial.com',
    notes: 'Resolved: Domain was decommissioned by marketing department.',
    evidence: [
      { 
        id: 'ev-9', 
        label: 'Decommissioned Subordinate Host', 
        severity: 'low', 
        detail: 'DNS records removed; host returns HTTP 404.', 
        providerCitation: 'DNS Health Check' 
      }
    ]
  },
  {
    id: 'BTF-901',
    brandId: 'RB-02',
    brandName: 'Apex Cloud AI',
    target: 'apexcloud-auth-token.io',
    normalizedTarget: 'apexcloud-auth-token.io',
    platform: 'DOMAIN',
    severity: 'critical',
    riskScore: 94,
    status: 'NEW',
    detectionReason: 'Spoofed developer token refresh console designed to siphon API keys.',
    source: 'Automated Threat Crawler',
    firstDetectedAt: '2026-10-12T12:00:00Z',
    lastAssessedAt: '2026-10-12T12:00:00Z',
    repeatScanCount: 1,
    officialAssetCompared: 'console.apexcloud.ai',
    notes: 'Targets Apex developer community.',
    evidence: [
      {
        id: 'ev-apex-1',
        label: 'Developer API Harvesting Heuristic',
        severity: 'critical',
        detail: 'Emulates Apex Cloud developer console CSS and captures Authorization bearer headers.',
        providerCitation: 'DOM Layout Matcher'
      }
    ]
  }
];

const INITIAL_BRAND_ACTIVITIES: BrandActivityEvent[] = [
  {
    id: 'ACT-01',
    brandId: 'RB-01',
    type: 'FINDING_CREATED',
    title: 'Suspicious Messaging Lure Captured',
    description: 'wa.me/message/ACME-CLAIM-2026 logged from user SMS submission.',
    timestamp: '2 hours ago',
    severity: 'medium'
  },
  {
    id: 'ACT-02',
    brandId: 'RB-01',
    type: 'FINDING_CREATED',
    title: 'Typosquat Domain Discovered',
    description: 'acme-refunds-portal.biz detected via DNS entropy telemetry.',
    timestamp: '14 hours ago',
    severity: 'high'
  },
  {
    id: 'ACT-03',
    brandId: 'RB-01',
    type: 'STATUS_CHANGED',
    title: 'Investigation Status Confirmed',
    description: 'acme-financial-secure-login.top marked as Confirmed Threat by brand reviewer.',
    timestamp: 'Yesterday',
    severity: 'critical'
  },
  {
    id: 'ACT-04',
    brandId: 'RB-01',
    type: 'ASSET_VERIFIED',
    title: 'Official Social Handle Attested',
    description: '@acmefinancial verified and added to cryptographic identity baseline.',
    timestamp: 'Oct 01, 2026',
    severity: 'low'
  },
  {
    id: 'ACT-05',
    brandId: 'RB-01',
    type: 'ASSET_VERIFIED',
    title: 'Subdomain DNS TXT Cryptographic Attestation',
    description: 'secure.acmefinancial.com verified with DNS record token.',
    timestamp: 'Sep 18, 2026',
    severity: 'low'
  }
];

// Helper to safely read from localStorage
function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

// Helper to safely write to localStorage
function writeStorage(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

function mergeWithInitialBrands(brands: RegisteredBrand[] = []): RegisteredBrand[] {
  const merged = Array.isArray(brands) ? [...brands] : [];
  for (const initBrand of INITIAL_REGISTERED_BRANDS) {
    if (!merged.some(b => b.id === initBrand.id || b.slug === initBrand.slug)) {
      merged.push(initBrand);
    }
  }
  return merged;
}

function mergeWithInitialAssets(assets: BrandAsset[] = []): BrandAsset[] {
  const merged = Array.isArray(assets) ? [...assets] : [];
  for (const initAsset of INITIAL_BRAND_ASSETS) {
    if (!merged.some(a => a.id === initAsset.id)) {
      merged.push(initAsset);
    }
  }
  return merged;
}

function mergeWithInitialFindings(findings: BrandThreatFinding[] = []): BrandThreatFinding[] {
  const merged = Array.isArray(findings) ? [...findings] : [];
  for (const initFinding of INITIAL_BRAND_FINDINGS) {
    if (!merged.some(f => f.id === initFinding.id)) {
      merged.push(initFinding);
    }
  }
  return merged;
}

function getInitialStoredSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const sess = localStorage.getItem('riskshield_session');
    return sess ? JSON.parse(sess) : null;
  } catch {
    return null;
  }
}

export const useStore = create<AppState>((set, get) => ({
  theme: (typeof window !== 'undefined' && localStorage.getItem('riskshield_theme') === 'light') ? 'light' : 'dark',
  setTheme: (theme) => {
    localStorage.setItem('riskshield_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('riskshield_theme', next);
      const root = document.documentElement;
      if (next === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      return { theme: next };
    });
  },

  user: (() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('riskshield_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  })(),
  login: (email, role = 'user', brandName, isDemo = false, fullName, isEmailVerified = true, authorizedBrands) => {
    const defaultBrands: AuthorizedBrandMembership[] = authorizedBrands || (
      role === 'brand_owner' ? [
        {
          brandId: isDemo ? 'RB-01' : `BRAND-${Date.now()}`,
          brandName: brandName || (isDemo ? 'Acme Financial' : (fullName ? `${fullName}'s Brand` : 'My Brand')),
          role: 'owner',
          verificationStatus: isDemo ? 'VERIFIED' : 'PENDING_VERIFICATION'
        }
      ] : []
    );

    const newUser: UserSession = {
      id: isDemo ? `DEMO-${Date.now()}` : `USR-${Date.now()}`,
      email,
      fullName: fullName || email.split('@')[0],
      role,
      brandName: brandName || (role === 'brand_owner' ? (defaultBrands[0]?.brandName || (isDemo ? 'Acme Financial' : 'My Brand')) : undefined),
      brandId: role === 'brand_owner' ? (defaultBrands[0]?.brandId || (isDemo ? 'RB-01' : undefined)) : undefined,
      brandRole: role === 'brand_owner' ? 'owner' : undefined,
      authorizedBrands: defaultBrands,
      isEmailVerified,
      isDemo,
    };
    writeStorage('riskshield_session', newUser);
    set({ user: newUser });
    if (!isDemo) {
      writeStorage('riskshield_registered_brands', []);
      writeStorage('riskshield_scan_history', []);
      writeStorage('riskshield_brand_assets', []);
      writeStorage('riskshield_brand_findings', []);
      writeStorage('riskshield_brand_activities', []);
      writeStorage('riskshield_brand_scans', []);
      writeStorage('riskshield_active_brand', newUser.brandId || '');
      set({ 
        registeredBrands: [],
        scanHistory: [],
        brandAssets: [],
        brandThreatFindings: [],
        brandActivities: [],
        brandScanHistory: [],
        threatReports: [],
        threatWatchList: [],
        userReports: [],
        activeBrandId: newUser.brandId || ''
      });
      void get().loadScanHistory();
      void get().loadBrandWorkspaces();
      void get().loadBrandWorkspaceDetails();
    }
  },
  logout: () => {
    try {
      localStorage.removeItem('riskshield_session');
      localStorage.removeItem('riskshield_scan_history');
      localStorage.removeItem('riskshield_registered_brands');
      localStorage.removeItem('riskshield_brand_assets');
      localStorage.removeItem('riskshield_brand_findings');
      localStorage.removeItem('riskshield_brand_activities');
      localStorage.removeItem('riskshield_brand_scans');
      localStorage.removeItem('riskshield_active_brand');
    } catch (e) {}
    void signOutSession();
    set({
      user: null,
      scanHistory: [],
      registeredBrands: INITIAL_REGISTERED_BRANDS,
      brandAssets: [],
      brandThreatFindings: [],
      brandActivities: [],
      brandScanHistory: [],
      threatReports: [],
      threatWatchList: [],
      userReports: [],
      activeBrandId: ''
    });
  },

  restoreSession: async () => {
    const token = getStoredAccessToken();
    if (!token) return;
    const restored = await fetchCurrentUserSession();
    if (restored.authenticated && restored.user) {
      writeStorage('riskshield_session', restored.user);
      set({ user: restored.user });
      if (restored.user.brandId) {
        writeStorage('riskshield_active_brand', restored.user.brandId);
        set({ activeBrandId: restored.user.brandId });
      }
      if (!restored.user.isDemo) {
        void get().loadScanHistory();
        void get().loadBrandWorkspaces();
        void get().loadBrandWorkspaceDetails(restored.user.brandId);
      }
    }
  },

  verifyEmail: (targetEmail) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser: UserSession = {
      ...currentUser,
      isEmailVerified: true
    };
    writeStorage('riskshield_session', updatedUser);
    set({ user: updatedUser });
  },

  onboardingDraft: readStorage('riskshield_brand_onboarding_draft', null),
  saveOnboardingDraft: (draft) => {
    const updated = { ...(get().onboardingDraft || {}), ...draft, lastSavedAt: new Date().toISOString() };
    writeStorage('riskshield_brand_onboarding_draft', updated);
    set({ onboardingDraft: updated });
  },
  clearOnboardingDraft: () => {
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('riskshield_brand_onboarding_draft'); } catch (e) {}
    }
    set({ onboardingDraft: null });
  },

  createBrandWorkspace: (data) => {
    const brandId = `RB-${Date.now().toString().slice(-4)}`;
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
    const colors = ['#FF5500', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4'];
    const accentColor = colors[Math.floor(Math.random() * colors.length)];
    const initials = data.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'BW';

    const cleanWebsite = data.primaryIdentityUrl.startsWith('http') 
      ? data.primaryIdentityUrl 
      : `https://${data.primaryIdentityUrl}`;

    // Brand record created with explicit PENDING_DNS verification status (Section 6)
    const newBrand: RegisteredBrand = {
      id: brandId,
      name: data.name,
      slug,
      logoInitial: initials,
      accentColor,
      category: data.industry || 'Digital Brand',
      description: data.description || `${data.name} official brand identity.`,
      registeredAt: new Date().toISOString().split('T')[0],
      relativeTime: 'Just now',
      status: 'PENDING_DNS', // Explicit pending verification per section 6
      verifiedAssetsCount: 0,
      activeCampaignsCount: 0,
      website: cleanWebsite,
      verifiedDomains: data.officialWebsite ? [data.officialWebsite] : [data.primaryIdentityUrl],
      alternativeNames: data.alternativeNames || [],
      officialSocials: (data.socialProfiles || []).map(p => p.urlOrHandle),
      pastWork: []
    };

    // Reference assets
    const newAssets: BrandAsset[] = [];
    if (data.officialWebsite || data.primaryIdentityUrl) {
      newAssets.push({
        id: `BA-${Date.now()}-1`,
        brandId,
        brandName: data.name,
        type: 'DOMAIN',
        value: data.officialWebsite || data.primaryIdentityUrl,
        status: 'PENDING_DNS',
        dnsTxtRecord: `riskshield-verification=${Math.random().toString(36).substring(2, 10)}`,
        createdAt: new Date().toISOString().split('T')[0]
      });
    }
    (data.additionalDomains || []).forEach((dom, i) => {
      newAssets.push({
        id: `BA-${Date.now()}-dom-${i}`,
        brandId,
        brandName: data.name,
        type: 'DOMAIN',
        value: dom,
        status: 'PENDING_DNS',
        dnsTxtRecord: `riskshield-verification=${Math.random().toString(36).substring(2, 10)}`,
        createdAt: new Date().toISOString().split('T')[0]
      });
    });
    (data.socialProfiles || []).forEach((soc, i) => {
      newAssets.push({
        id: `BA-${Date.now()}-soc-${i}`,
        brandId,
        brandName: data.name,
        type: 'SOCIAL_HANDLE',
        value: soc.urlOrHandle,
        status: 'PENDING_DNS',
        createdAt: new Date().toISOString().split('T')[0]
      });
    });
    (data.apps || []).forEach((app, i) => {
      newAssets.push({
        id: `BA-${Date.now()}-app-${i}`,
        brandId,
        brandName: data.name,
        type: 'MOBILE_APP',
        value: app.packageId || app.bundleId || app.name,
        status: 'PENDING_DNS',
        createdAt: new Date().toISOString().split('T')[0]
      });
    });

    const updatedBrands = [newBrand, ...get().registeredBrands];
    const updatedAssets = [...newAssets, ...get().brandAssets];
    writeStorage('riskshield_registered_brands', updatedBrands);
    writeStorage('riskshield_brand_assets', updatedAssets);

    // Update user session & authorized brands
    const currentUser = get().user;
    const membership: AuthorizedBrandMembership = {
      brandId,
      brandName: data.name,
      role: 'owner',
      verificationStatus: 'PENDING_DNS'
    };

    const existingMemberships = currentUser?.authorizedBrands || [];
    const updatedUser: UserSession = currentUser ? {
      ...currentUser,
      role: 'brand_owner',
      brandName: data.name,
      brandId,
      brandRole: 'owner',
      authorizedBrands: [membership, ...existingMemberships]
    } : {
      id: `USR-${Date.now()}`,
      email: data.contacts?.businessEmail || 'brand.owner@company.com',
      role: 'brand_owner',
      brandName: data.name,
      brandId,
      brandRole: 'owner',
      authorizedBrands: [membership],
      isEmailVerified: true
    };

    writeStorage('riskshield_session', updatedUser);
    writeStorage('riskshield_active_brand', brandId);

    // Activity event
    const activity: BrandActivityEvent = {
      id: `ACT-${Date.now()}`,
      brandId,
      type: 'ASSET_ADDED',
      title: `Brand Workspace Created: ${data.name}`,
      description: `Workspace initialized in Pending Verification status with ${newAssets.length} reference assets.`,
      timestamp: 'Just now',
      severity: 'low'
    };
    const updatedActs = [activity, ...get().brandActivities];
    writeStorage('riskshield_brand_activities', updatedActs);
    
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('riskshield_brand_onboarding_draft'); } catch (e) {}
    }

    set({
      registeredBrands: updatedBrands,
      brandAssets: updatedAssets,
      user: updatedUser,
      activeBrandId: brandId,
      brandActivities: updatedActs,
      onboardingDraft: null
    });

    return { brand: newBrand, user: updatedUser };
  },

  switchWorkspace: (brandId) => {
    const currentUser = get().user;
    if (!currentUser) return;
    if (!brandId || brandId === 'personal') {
      const updated: UserSession = { 
        ...currentUser, 
        role: 'user' 
      };
      writeStorage('riskshield_session', updated);
      set({ user: updated });
    } else {
      const targetBrand = get().registeredBrands.find(b => b.id === brandId);
      if (!targetBrand) return;
      const updated: UserSession = { 
        ...currentUser, 
        role: 'brand_owner', 
        brandName: targetBrand.name, 
        brandId: targetBrand.id 
      };
      writeStorage('riskshield_session', updated);
      writeStorage('riskshield_active_brand', brandId);
      set({ user: updated, activeBrandId: brandId });
    }
  },

  scanHistory: (() => {
    const savedUser = getInitialStoredSession();
    const fallback = (savedUser && !savedUser.isDemo) ? [] : INITIAL_PERSONAL_SCANS;
    const raw = readStorage<ScanResult[]>('riskshield_scan_history', fallback);
    if (savedUser && !savedUser.isDemo) {
      return raw.filter(s => !s.id.startsWith('SCAN-MOCK-') && !s.id.startsWith('SCAN-BRAND-'));
    }
    return raw;
  })(),
  loadScanHistory: async () => {
    const currentUser = get().user;
    if (!currentUser || currentUser.isDemo) return;
    try {
      const { scans } = await fetchUserScanHistory(1, 50);
      writeStorage('riskshield_scan_history', scans);
      set({ scanHistory: scans });
    } catch (err) {
      console.error('Failed to load user scan history from backend:', err);
    }
  },
  addScanResult: (result) => set((state) => {
    if (state.scanHistory.some((s) => s.id === result.id)) {
      return { scanHistory: state.scanHistory };
    }
    const updated = [result, ...state.scanHistory];
    writeStorage('riskshield_scan_history', updated);
    return { scanHistory: updated };
  }),
  removeScanResult: (id) => set((state) => {
    const updated = state.scanHistory.filter((s) => s.id !== id);
    writeStorage('riskshield_scan_history', updated);
    return { scanHistory: updated };
  }),
  clearHistory: () => {
    writeStorage('riskshield_scan_history', []);
    set({ scanHistory: [] });
  },

  brandScanHistory: (() => {
    const savedUser = getInitialStoredSession();
    if (savedUser && !savedUser.isDemo) {
      const raw = readStorage<ScanResult[]>('riskshield_brand_scans', []);
      return raw.filter(s => !s.id.startsWith('SCAN-MOCK-') && !s.id.startsWith('SCAN-BRAND-'));
    }
    return readStorage('riskshield_brand_scans', INITIAL_BRAND_SCANS);
  })(),
  addBrandScanResult: (result) => set((state) => {
    const updated = [result, ...state.brandScanHistory];
    writeStorage('riskshield_brand_scans', updated);
    return { brandScanHistory: updated };
  }),

  brandAssets: (() => {
    const savedUser = getInitialStoredSession();
    if (savedUser && !savedUser.isDemo) {
      const raw = readStorage<BrandAsset[]>('riskshield_brand_assets', []);
      return raw.filter(a => a.brandId !== 'RB-01' && a.brandId !== 'RB-02' && a.brandId !== 'RB-03');
    }
    const raw = readStorage<BrandAsset[]>('riskshield_brand_assets', INITIAL_BRAND_ASSETS);
    return mergeWithInitialAssets(raw);
  })(),
  loadBrandWorkspaces: async () => {
    const currentUser = get().user;
    if (!currentUser || currentUser.isDemo) return;
    try {
      const workspaces = await fetchUserBrandWorkspaces();
      const mappedBrands: RegisteredBrand[] = workspaces.map((w: any) => ({
        id: w.brand.id,
        name: w.brand.name,
        slug: w.brand.slug,
        logoInitial: w.brand.logoInitial || 'B',
        accentColor: w.brand.accentColor || '#FF5500',
        category: w.brand.category || 'Company & Product',
        description: w.brand.description || '',
        registeredAt: w.brand.createdAt ? new Date(w.brand.createdAt).toISOString().split('T')[0] : 'Today',
        relativeTime: 'Active',
        status: w.brand.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING_DNS',
        verifiedAssetsCount: (w.brand.officialAssets || []).filter((a: any) => a.status === 'VERIFIED').length,
        activeCampaignsCount: 0,
        website: w.brand.website || '',
        verifiedDomains: (w.brand.officialAssets || [])
          .filter((a: any) => a.status === 'VERIFIED' && (a.type === 'DOMAIN' || a.type === 'SUBDOMAIN'))
          .map((a: any) => a.value),
        alternativeNames: (w.brand.officialAssets || [])
          .filter((a: any) => a.type === 'TRADEMARK')
          .map((a: any) => a.value),
        officialSocials: (w.brand.officialAssets || [])
          .filter((a: any) => a.type === 'SOCIAL_HANDLE')
          .map((a: any) => a.value),
        pastWork: []
      }));

      // Non-demo users strictly view real brand workspaces without merging mock partner accounts
      const userBrands = mappedBrands.length > 0 ? mappedBrands : (currentUser.brandId ? [{
        id: currentUser.brandId,
        name: currentUser.brandName || 'My Brand',
        slug: (currentUser.brandName || 'my-brand').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        logoInitial: (currentUser.brandName || 'B').slice(0, 2).toUpperCase(),
        accentColor: '#FF5500',
        category: 'Company & Product',
        description: `${currentUser.brandName || 'My Brand'} official brand workspace.`,
        registeredAt: 'Today',
        relativeTime: 'Active',
        status: 'PENDING_DNS' as const,
        verifiedAssetsCount: 0,
        activeCampaignsCount: 0,
        website: '',
        verifiedDomains: [],
        alternativeNames: [],
        officialSocials: [],
        pastWork: []
      }] : []);

      writeStorage('riskshield_registered_brands', userBrands);
      set({ registeredBrands: userBrands });

      if (userBrands.length > 0 && (!get().activeBrandId || !userBrands.some(b => b.id === get().activeBrandId))) {
        const primaryId = userBrands[0].id;
        writeStorage('riskshield_active_brand', primaryId);
        set({ activeBrandId: primaryId });
      }
    } catch (err) {
      console.error('Failed to load brand workspaces from backend:', err);
    }
  },
  loadBrandWorkspaceDetails: async (brandId?: string) => {
    const currentUser = get().user;
    if (!currentUser || currentUser.isDemo) return;
    const targetBrandId = brandId || get().activeBrandId || currentUser.brandId || currentUser.authorizedBrands?.[0]?.brandId;
    if (!targetBrandId) return;

    try {
      const [assets, findings] = await Promise.all([
        fetchBrandAssets(targetBrandId),
        fetchBrandThreatFindings(targetBrandId)
      ]);

      writeStorage('riskshield_brand_assets', assets);
      writeStorage('riskshield_brand_findings', findings);
      set({
        brandAssets: assets,
        brandThreatFindings: findings
      });

      void get().loadBrandMonitorSchedule(targetBrandId);
    } catch (err) {
      console.error('Failed to load brand details from backend:', err);
    }
  },
  addBrandAsset: async (asset) => {
    const currentUser = get().user;
    if (currentUser && !currentUser.isDemo && asset.brandId) {
      try {
        const persisted = await addBrandAssetApi(asset.brandId, {
          type: asset.type,
          value: asset.value,
          platform: asset.platform
        });
        const updated = [persisted, ...get().brandAssets.filter(a => a.id !== persisted.id)];
        writeStorage('riskshield_brand_assets', updated);
        set({ brandAssets: updated });
        return;
      } catch (err) {
        console.error('Failed to add brand asset to backend:', err);
        throw err;
      }
    }

    const newAsset: BrandAsset = {
      ...asset,
      id: `BA-${Date.now()}`,
      dnsTxtRecord: `riskshield-verification=${Math.random().toString(36).substring(2, 10)}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const updated = [newAsset, ...get().brandAssets];
    writeStorage('riskshield_brand_assets', updated);
    set({ brandAssets: updated });
  },
  verifyBrandAsset: async (id: string) => {
    const currentUser = get().user;
    const targetAsset = get().brandAssets.find(a => a.id === id);

    if (currentUser && !currentUser.isDemo && targetAsset?.brandId) {
      try {
        const result = await verifyBrandAssetDnsApi(targetAsset.brandId, id);
        if (result.verified && result.asset) {
          const updated = get().brandAssets.map(a => a.id === id ? { ...a, status: 'VERIFIED' as const, verifiedAt: new Date().toISOString().split('T')[0] } : a);
          writeStorage('riskshield_brand_assets', updated);
          set({ brandAssets: updated });
        }
        return { verified: result.verified, message: result.message };
      } catch (err: any) {
        return { verified: false, message: err?.message || 'DNS verification failed' };
      }
    }

    const updated = get().brandAssets.map((a) => 
      a.id === id 
        ? { ...a, status: 'VERIFIED' as const, verifiedAt: new Date().toISOString().split('T')[0] } 
        : a
    );
    writeStorage('riskshield_brand_assets', updated);
    set({ brandAssets: updated });
    return { verified: true, message: 'Attestation verified in demonstration sandbox' };
  },
  removeBrandAsset: async (id: string) => {
    const currentUser = get().user;
    const targetAsset = get().brandAssets.find(a => a.id === id);

    if (currentUser && !currentUser.isDemo && targetAsset?.brandId) {
      try {
        await deleteBrandAssetApi(targetAsset.brandId, id);
      } catch (err) {
        console.error('Failed to remove brand asset from backend:', err);
      }
    }

    const updated = get().brandAssets.filter((a) => a.id !== id);
    writeStorage('riskshield_brand_assets', updated);
    set({ brandAssets: updated });
  },

  threatReports: (() => {
    const savedUser = getInitialStoredSession();
    return (savedUser && !savedUser.isDemo) ? [] : INITIAL_THREAT_REPORTS;
  })(),
  addThreatReport: (report) => set((state) => ({
    threatReports: [
      {
        ...report,
        id: `TR-${Math.floor(100 + Math.random() * 900)}`,
        reportedAt: 'Just now',
        evidenceCount: 1
      },
      ...state.threatReports
    ]
  })),
  updateReportStatus: (id, status) => set((state) => ({
    threatReports: state.threatReports.map((r) => r.id === id ? { ...r, status } : r)
  })),

  // Registered Brands for Discovery & Marketing
  registeredBrands: (() => {
    const savedUser = getInitialStoredSession();
    if (savedUser && !savedUser.isDemo) {
      const raw = readStorage<RegisteredBrand[]>('riskshield_registered_brands', []);
      return raw.filter(b => b.id !== 'RB-01' && b.id !== 'RB-02' && b.id !== 'RB-03');
    }
    const raw = readStorage<RegisteredBrand[]>('riskshield_registered_brands', INITIAL_REGISTERED_BRANDS);
    return mergeWithInitialBrands(raw);
  })(),
  selectedBrandModal: null,
  setSelectedBrandModal: (brand) => set({ selectedBrandModal: brand }),
  updateBrandProfile: async (brandId, updates) => {
    const currentUser = get().user;
    if (currentUser && !currentUser.isDemo) {
      try {
        await updateBrandProfileApi(brandId, updates);
      } catch (err) {
        console.error('Failed to update brand profile in backend:', err);
      }
    }
    const updated = get().registeredBrands.map(b => b.id === brandId ? { ...b, ...updates } : b);
    writeStorage('riskshield_registered_brands', updated);
    set({ registeredBrands: updated });
  },

  // In-page Quick Scanner Target Handshake
  quickScanTarget: null,
  setQuickScanTarget: (target) => set({ quickScanTarget: target }),

  // User Dashboard: Threat Watch
  threatWatchList: (() => {
    const savedUser = getInitialStoredSession();
    return (savedUser && !savedUser.isDemo) ? [] : INITIAL_THREAT_WATCH;
  })(),
  addThreatWatch: (item) => set((state) => ({
    threatWatchList: [
      {
        ...item,
        id: `TW-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString().split('T')[0],
        lastChecked: 'Just now',
        statusHistory: [
          {
            timestamp: 'Just now',
            status: item.assessment,
            note: 'Added to automated Threat Watch monitor'
          }
        ]
      },
      ...state.threatWatchList
    ]
  })),
  toggleThreatWatchStatus: (id) => set((state) => ({
    threatWatchList: state.threatWatchList.map((w) => {
      if (w.id !== id) return w;
      const isPaused = w.monitoringStatus === 'Monitoring Paused';
      const newStatus = isPaused 
        ? (w.assessment === 'KNOWN_THREAT' || w.assessment === 'HIGH_RISK' ? 'Threat Detected' : 'Monitoring') 
        : 'Monitoring Paused';
      return {
        ...w,
        monitoringStatus: newStatus,
        statusHistory: [
          {
            timestamp: 'Just now',
            status: w.assessment,
            note: isPaused ? 'Monitoring resumed' : 'Monitoring paused by user'
          },
          ...w.statusHistory
        ]
      };
    })
  })),
  removeThreatWatch: (id) => set((state) => ({
    threatWatchList: state.threatWatchList.filter((w) => w.id !== id)
  })),
  updateThreatWatch: (id, updates) => set((state) => ({
    threatWatchList: state.threatWatchList.map((w) => w.id === id ? { ...w, ...updates } : w)
  })),

  // User Dashboard: Scam Reports
  userReports: (() => {
    const savedUser = getInitialStoredSession();
    return (savedUser && !savedUser.isDemo) ? [] : INITIAL_USER_REPORTS;
  })(),
  addUserReport: (report) => set((state) => ({
    userReports: [
      {
        ...report,
        id: `REP-${Math.floor(100 + Math.random() * 900)}`,
        submittedAt: 'Just now'
      },
      ...state.userReports
    ]
  })),

  // User Dashboard: Saved Findings
  savedFindings: [],
  addSavedFinding: (finding) => set((state) => ({
    savedFindings: [
      {
        ...finding,
        id: `SF-${Date.now().toString().slice(-4)}`,
        savedAt: 'Just now'
      },
      ...state.savedFindings
    ]
  })),
  removeSavedFinding: (id) => set((state) => ({
    savedFindings: state.savedFindings.filter((f) => f.id !== id)
  })),

  // ==========================================
  // Brand Protection Command Center (Challenge 03)
  // ==========================================
  activeBrandId: (() => {
    if (typeof window === 'undefined') return '';
    const savedUser = getInitialStoredSession();
    if (savedUser && !savedUser.isDemo) {
      const saved = localStorage.getItem('riskshield_active_brand');
      if (saved && saved !== 'RB-01' && saved !== 'RB-02' && saved !== 'RB-03') return saved;
      return savedUser.brandId || savedUser.authorizedBrands?.[0]?.brandId || '';
    }
    const saved = localStorage.getItem('riskshield_active_brand');
    return saved || 'RB-01';
  })(),
  setActiveBrandId: (brandId) => {
    localStorage.setItem('riskshield_active_brand', brandId);
    set({ activeBrandId: brandId });
    void get().loadBrandWorkspaceDetails(brandId);
  },

  brandThreatFindings: (() => {
    const savedUser = getInitialStoredSession();
    if (savedUser && !savedUser.isDemo) {
      const raw = readStorage<BrandThreatFinding[]>('riskshield_brand_findings', []);
      return raw.filter(f => f.brandId !== 'RB-01' && f.brandId !== 'RB-02' && f.brandId !== 'RB-03');
    }
    const raw = readStorage<BrandThreatFinding[]>('riskshield_brand_findings', INITIAL_BRAND_FINDINGS);
    return mergeWithInitialFindings(raw);
  })(),

  addOrUpdateBrandThreatFinding: (data) => {
    const normalized = normalizeTarget(data.target);
    const currentFindings = get().brandThreatFindings;
    const nowIso = new Date().toISOString();
    const formattedDate = nowIso.replace('T', ' ').slice(0, 16);

    // Deduplication check: Match same brand + normalized target
    const existingIndex = currentFindings.findIndex(
      (f) => f.brandId === data.brandId && f.normalizedTarget === normalized
    );

    if (existingIndex >= 0) {
      // Repeat scan -> Update existing finding with fresh evidence and increment count
      const existing = currentFindings[existingIndex];
      const updatedFinding: BrandThreatFinding = {
        ...existing,
        lastAssessedAt: nowIso,
        repeatScanCount: (existing.repeatScanCount || 1) + 1,
        riskScore: Math.max(existing.riskScore, data.riskScore),
        evidence: [
          ...data.evidence,
          ...existing.evidence.filter(e => !data.evidence.some(de => de.label === e.label))
        ],
        investigationHistory: [
          {
            timestamp: formattedDate,
            action: 'Repeat Scan Recorded',
            fromStatus: existing.status,
            toStatus: existing.status,
            notes: `Fresh scan executed. Evidence refreshed from ${data.source}. Repeat frequency: ${(existing.repeatScanCount || 1) + 1}.`,
            userEmail: get().user?.email || 'brand_reviewer'
          },
          ...(existing.investigationHistory || [])
        ]
      };

      const updatedFindings = [...currentFindings];
      updatedFindings[existingIndex] = updatedFinding;
      writeStorage('riskshield_brand_findings', updatedFindings);

      // Record Activity
      const activity: BrandActivityEvent = {
        id: `ACT-${Date.now()}`,
        brandId: data.brandId,
        type: 'FINDING_UPDATED',
        title: `Threat Re-scanned: ${data.target}`,
        description: `Existing threat finding updated with refreshed intelligence (Score: ${updatedFinding.riskScore}/100).`,
        timestamp: 'Just now',
        severity: updatedFinding.severity
      };
      const updatedActs = [activity, ...get().brandActivities];
      writeStorage('riskshield_brand_activities', updatedActs);

      set({
        brandThreatFindings: updatedFindings,
        brandActivities: updatedActs
      });

      return { finding: updatedFinding, isNew: false };
    } else {
      // New finding
      const newFinding: BrandThreatFinding = {
        id: `BTF-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`,
        brandId: data.brandId,
        brandName: data.brandName,
        target: data.target,
        normalizedTarget: normalized,
        platform: data.platform,
        severity: data.severity,
        riskScore: data.riskScore,
        status: 'NEW',
        detectionReason: data.detectionReason,
        source: data.source,
        firstDetectedAt: nowIso,
        lastAssessedAt: nowIso,
        evidence: data.evidence,
        officialAssetCompared: data.officialAssetCompared,
        repeatScanCount: 1,
        investigationHistory: [
          {
            timestamp: formattedDate,
            action: 'Threat Captured & Saved',
            toStatus: 'NEW',
            notes: `Auto-saved via Universal Input Bar (${data.source}). Credible brand association identified.`,
            userEmail: get().user?.email || 'brand_reviewer'
          }
        ],
        whoisDetails: data.whoisDetails
      };

      const updatedFindings = [newFinding, ...currentFindings];
      writeStorage('riskshield_brand_findings', updatedFindings);

      // Activity
      const activity: BrandActivityEvent = {
        id: `ACT-${Date.now()}`,
        brandId: data.brandId,
        type: 'FINDING_CREATED',
        title: `New Finding Auto-Saved: ${data.target}`,
        description: `${data.platform} indicator saved under ${data.brandName} with ${data.evidence.length} evidence factors.`,
        timestamp: 'Just now',
        severity: data.severity
      };
      const updatedActs = [activity, ...get().brandActivities];
      writeStorage('riskshield_brand_activities', updatedActs);

      set({
        brandThreatFindings: updatedFindings,
        brandActivities: updatedActs
      });

      return { finding: newFinding, isNew: true };
    }
  },

  brandMonitorSchedule: null,
  loadBrandMonitorSchedule: async (brandId?: string) => {
    const currentUser = get().user;
    const targetBrandId = brandId || get().activeBrandId || currentUser?.brandId || currentUser?.authorizedBrands?.[0]?.brandId;
    if (!targetBrandId || !currentUser || currentUser.isDemo) return;
    try {
      const schedule = await fetchBrandMonitorScheduleApi(targetBrandId);
      set({ brandMonitorSchedule: schedule });
    } catch (err) {
      console.error('Failed to load brand monitor schedule:', err);
    }
  },
  updateBrandMonitorSchedule: async (brandId: string, options: { enabled?: boolean; frequencyHours?: number; runNow?: boolean }) => {
    const currentUser = get().user;
    if (!currentUser || currentUser.isDemo) {
      set((state) => ({
        brandMonitorSchedule: state.brandMonitorSchedule
          ? { ...state.brandMonitorSchedule, ...options }
          : null
      }));
      return { success: true, schedule: get().brandMonitorSchedule };
    }

    const res = await updateBrandMonitorScheduleApi(brandId, options);
    if (res.schedule) {
      set({ brandMonitorSchedule: res.schedule });
    }
    return res;
  },

  updateFindingStatus: async (id, newStatus, notes, userEmail) => {
    const currentFindings = get().brandThreatFindings;
    const targetFinding = currentFindings.find((f) => f.id === id);
    if (!targetFinding) return;

    // Normalize legacy aliases to canonical backend enum
    let canonicalStatus: ThreatFindingStatus = newStatus;
    if (newStatus === 'UNDER_REVIEW') canonicalStatus = 'UNDER_INVESTIGATION';
    if (newStatus === 'CONFIRMED_THREAT') canonicalStatus = 'TAKEDOWN_REQUESTED';

    const currentUser = get().user;
    const nowIso = new Date().toISOString();
    const formattedDate = nowIso.replace('T', ' ').slice(0, 16);

    // Call real backend API if authenticated non-demo user
    if (currentUser && !currentUser.isDemo && targetFinding.brandId) {
      try {
        const apiRes = await transitionBrandFindingStatusApi(
          id,
          targetFinding.brandId,
          canonicalStatus,
          notes
        );

        const updatedFindings = currentFindings.map((f) => {
          if (f.id !== id) return f;
          const auditHistory = apiRes.auditEntry ? [
            {
              timestamp: formattedDate,
              action: `Status Transition: ${f.status} -> ${canonicalStatus}`,
              fromStatus: f.status,
              toStatus: canonicalStatus,
              notes: notes || `Investigation status transitioned to ${canonicalStatus}`,
              userEmail: userEmail || currentUser.email
            },
            ...(f.investigationHistory || [])
          ] : f.investigationHistory;

          return {
            ...f,
            status: canonicalStatus,
            lastAssessedAt: nowIso,
            notes: notes ? `${notes}\n---\n${f.notes || ''}`.trim() : f.notes,
            investigationHistory: auditHistory
          };
        });

        writeStorage('riskshield_brand_findings', updatedFindings);

        const activity: BrandActivityEvent = {
          id: `ACT-${Date.now()}`,
          brandId: targetFinding.brandId,
          type: 'STATUS_CHANGED',
          title: `Status Changed to ${canonicalStatus}`,
          description: `Target ${targetFinding.target} transitioned to ${canonicalStatus} by ${userEmail || currentUser.email}.`,
          timestamp: 'Just now',
          severity: canonicalStatus === 'TAKEDOWN_REQUESTED' ? 'critical' : canonicalStatus === 'RESOLVED' ? 'low' : 'medium'
        };
        const updatedActs = [activity, ...get().brandActivities];
        writeStorage('riskshield_brand_activities', updatedActs);

        set({
          brandThreatFindings: updatedFindings,
          brandActivities: updatedActs
        });
        return;
      } catch (err) {
        console.error('Failed to update finding status on backend:', err);
        throw err; // Rethrow so UI displays exact authorization or validation error
      }
    }

    // Demo/Sandbox fallback
    const updatedFindings = currentFindings.map((f) => {
      if (f.id !== id) return f;
      const historyEntry = {
        timestamp: formattedDate,
        action: `Status Transition: ${f.status} -> ${canonicalStatus}`,
        fromStatus: f.status,
        toStatus: canonicalStatus,
        notes: notes || `Investigation status updated to ${canonicalStatus}`,
        userEmail: userEmail || currentUser?.email || 'analyst'
      };

      return {
        ...f,
        status: canonicalStatus,
        lastAssessedAt: nowIso,
        notes: notes ? `${notes}\n---\n${f.notes || ''}`.trim() : f.notes,
        investigationHistory: [historyEntry, ...(f.investigationHistory || [])]
      };
    });

    writeStorage('riskshield_brand_findings', updatedFindings);

    const activity: BrandActivityEvent = {
      id: `ACT-${Date.now()}`,
      brandId: targetFinding.brandId,
      type: 'STATUS_CHANGED',
      title: `Status Changed to ${canonicalStatus}`,
      description: `Target ${targetFinding.target} updated by analyst (${userEmail || currentUser?.email || 'analyst'}).`,
      timestamp: 'Just now',
      severity: canonicalStatus === 'TAKEDOWN_REQUESTED' ? 'critical' : canonicalStatus === 'RESOLVED' ? 'low' : 'medium'
    };
    const updatedActs = [activity, ...get().brandActivities];
    writeStorage('riskshield_brand_activities', updatedActs);

    set({
      brandThreatFindings: updatedFindings,
      brandActivities: updatedActs
    });
  },

  addFindingNote: async (id, note, userEmail) => {
    const currentFindings = get().brandThreatFindings;
    const targetFinding = currentFindings.find((f) => f.id === id);
    if (!targetFinding) return;

    const currentUser = get().user;
    const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 16);

    if (currentUser && !currentUser.isDemo && targetFinding.brandId) {
      try {
        await addFindingNoteApi(id, targetFinding.brandId, note);
        const updatedFindings = currentFindings.map((f) => {
          if (f.id !== id) return f;
          const historyEntry = {
            timestamp: formattedDate,
            action: 'Analyst Note Appended',
            notes: note,
            userEmail: userEmail || currentUser.email
          };

          return {
            ...f,
            notes: `${note}\n${f.notes || ''}`.trim(),
            investigationHistory: [historyEntry, ...(f.investigationHistory || [])]
          };
        });

        writeStorage('riskshield_brand_findings', updatedFindings);
        set({ brandThreatFindings: updatedFindings });
        return;
      } catch (err) {
        console.error('Failed to append note on backend:', err);
        throw err;
      }
    }

    // Demo/Sandbox fallback
    const updatedFindings = currentFindings.map((f) => {
      if (f.id !== id) return f;
      const historyEntry = {
        timestamp: formattedDate,
        action: 'Analyst Note Appended',
        notes: note,
        userEmail: userEmail || currentUser?.email || 'analyst'
      };

      return {
        ...f,
        notes: `${note}\n${f.notes || ''}`.trim(),
        investigationHistory: [historyEntry, ...(f.investigationHistory || [])]
      };
    });

    writeStorage('riskshield_brand_findings', updatedFindings);
    set({ brandThreatFindings: updatedFindings });
  },

  removeBrandThreatFinding: (id) => {
    const updated = get().brandThreatFindings.filter(f => f.id !== id);
    writeStorage('riskshield_brand_findings', updated);
    set({ brandThreatFindings: updated });
  },

  brandActivities: (() => {
    const savedUser = getInitialStoredSession();
    if (savedUser && !savedUser.isDemo) {
      const raw = readStorage<BrandActivityEvent[]>('riskshield_brand_activities', []);
      return raw.filter(a => a.brandId !== 'RB-01' && a.brandId !== 'RB-02' && a.brandId !== 'RB-03');
    }
    return readStorage('riskshield_brand_activities', INITIAL_BRAND_ACTIVITIES);
  })(),
  addBrandActivity: (activity) => {
    const newAct: BrandActivityEvent = {
      ...activity,
      id: `ACT-${Date.now()}`,
      timestamp: 'Just now'
    };
    const updated = [newAct, ...get().brandActivities];
    writeStorage('riskshield_brand_activities', updated);
    set({ brandActivities: updated });
  }
}));

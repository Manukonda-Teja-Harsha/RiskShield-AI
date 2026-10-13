import { ScanMode, ScanResult, RiskStatus, RegisteredBrand, BrandAsset, BrandOnboardingData, BrandAssetType } from '../types';
import { executeUnifiedScan, UnifiedScanExecution } from './scanner/unifiedScannerEngine';
import { getStoredAccessToken, getApiBaseUrl } from './auth';

/**
 * Client API integration layer for RiskShield AI.
 * Communicates with Next.js API route handlers when available.
 * If backend endpoints are unreachable or not yet deployed, it cleanly routes through
 * the shared unified analysis engine, preserving complete transparency and security isolation.
 */

export interface ScanRequestPayload {
  target: string;
  mode: ScanMode;
  userContext?: {
    userId: string;
    email: string;
    authorizedHistory: ScanResult[];
  };
}

/**
 * Standard scan execution — compatible with existing caller signatures.
 */
export async function executeScan(
  payload: ScanRequestPayload, 
  userContext?: { userId: string; email: string; authorizedHistory: ScanResult[] }
): Promise<ScanResult> {
  const { target, mode } = payload;
  const ctx = payload.userContext || userContext;
  const token = getStoredAccessToken();
  const apiBase = getApiBaseUrl();

  // 1. If authenticated, route through authoritative Next.js API endpoint
  if (token) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${apiBase}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target,
          mode
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend scan failed with status ${res.status}`);
      }

      const data = await res.json();
      return {
        ...data,
        isBackendConnected: true,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      // For authenticated scans, fail explicitly rather than producing divergent client-side results
      throw err;
    }
  }

  // 2. Local Shared Scanner Engine preview (unauthenticated / offline demo)
  const execution = await executeUnifiedScan({
    rawInput: target,
    explicitMode: mode,
    userContext: ctx
  });

  return {
    ...execution.scanResult,
    isBackendConnected: false
  };
}

/**
 * Dedicated Personal User Scan Workflow
 * Authenticates user, evaluates indicator, and persists result authoritatively in PostgreSQL.
 */
export async function executePersonalScan(
  target: string,
  mode?: ScanMode,
  userContext?: {
    userId: string;
    email: string;
    authorizedHistory: ScanResult[];
  },
  contextPayload?: import('../types').ScannerContextPayload
): Promise<UnifiedScanExecution> {
  const token = getStoredAccessToken();
  const apiBase = getApiBaseUrl();

  // If user is authenticated, the scan MUST be evaluated & persisted via the secure backend API
  if (token) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${apiBase}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target,
          mode,
          contextPayload
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend scan failed with status ${res.status}`);
      }

      const data = await res.json();
      const scanResult: ScanResult = {
        id: data.id,
        userId: data.userId,
        target: data.target,
        normalizedTarget: data.normalizedTarget || data.target,
        mode: (data.mode || mode || 'url') as ScanMode,
        category: (data.category || 'url') as any,
        status: data.status,
        score: data.score,
        timestamp: data.createdAt || data.timestamp || new Date().toISOString(),
        evidence: Array.isArray(data.evidence) ? data.evidence : [],
        sourcesChecked: data.sourcesChecked || [],
        sourceFailures: data.sourceFailures || [],
        providerResults: data.providerResults || [],
        sanitizationApplied: data.sanitizationApplied || false,
        recommendedActions: data.recommendedActions || [],
        explanation: data.explanation,
        contextPayload,
        isBackendConnected: true
      };

      return {
        scanResult,
        classification: {
          category: data.category || 'url',
          confidence: 0.95,
          extractedIndicators: data.extractedIndicators || [],
          isAmbiguous: false,
          primaryIndicator: target,
          summary: data.explanation
        },
        adapterResults: {
          sourcesChecked: data.sourcesChecked || [],
          sourceFailures: data.sourceFailures || [],
          checksCompleted: data.checksCompleted || [],
          checksUnavailable: data.checksUnavailable || [],
          aggregatedEvidence: data.evidence || [],
          totalScoreAdjustment: 0
        }
      };
    } catch (err) {
      clearTimeout(timeoutId);
      // For authenticated users, do not mask backend database / persistence failures as successful scans
      throw err;
    }
  }

  // If unauthenticated or in demo mode: evaluate via client-side unified scanner engine
  const execution = await executeUnifiedScan({
    rawInput: target,
    explicitMode: mode,
    contextPayload,
    userContext
  });

  return {
    ...execution,
    scanResult: {
      ...execution.scanResult,
      isBackendConnected: false
    }
  };
}

/**
 * Dedicated Brand Workspace Scan Workflow
 * Authenticates user, validates brand membership, queries authorized brand assets,
 * executes shared engine with official asset comparison and finding generation rules.
 */
export async function executeBrandScan(
  target: string,
  brandContext: {
    brand: RegisteredBrand;
    officialAssets: BrandAsset[];
    authorizedHistory: ScanResult[];
  },
  contextPayload?: import('../types').ScannerContextPayload
): Promise<UnifiedScanExecution> {
  const token = getStoredAccessToken();
  const apiBase = getApiBaseUrl();

  if (token) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${apiBase}/api/brand/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target,
          brandId: brandContext.brand.id,
          brandName: brandContext.brand.name,
          contextPayload
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Brand scan failed with status ${res.status}`);
      }

      const data = await res.json();
      return {
        scanResult: { ...data.scanResult, isBackendConnected: true },
        classification: data.classification,
        adapterResults: data.adapterResults,
        brandEvaluation: data.brandEvaluation,
        shouldCreateBrandFinding: data.shouldCreateBrandFinding
      };
    } catch (err) {
      clearTimeout(timeoutId);
      // For authenticated brand scans, fail explicitly rather than producing divergent client-side results
      throw err;
    }
  }

  // If unauthenticated: client-side engine preview
  const execution = await executeUnifiedScan({
    rawInput: target,
    brandContext,
    contextPayload
  });

  return {
    ...execution,
    scanResult: {
      ...execution.scanResult,
      isBackendConnected: false
    }
  };
}

/**
 * Retrieves paginated personal scan records from `GET /api/scans` for the authenticated user.
 */
export async function fetchUserScanHistory(
  page = 1,
  limit = 50
): Promise<{ scans: ScanResult[]; total: number; page: number; limit: number }> {
  const token = getStoredAccessToken();
  if (!token) {
    return { scans: [], total: 0, page: 1, limit };
  }

  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/scans?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch scan history: ${res.statusText}`);
  }

  const data = await res.json();
  const mappedScans: ScanResult[] = (data.scans || []).map((record: any) => ({
    id: record.id,
    userId: record.userId,
    target: record.target,
    normalizedTarget: record.normalizedTarget || record.target,
    mode: (record.mode || 'url') as ScanMode,
    category: (record.category || 'url') as any,
    status: record.status as RiskStatus,
    score: record.score,
    explanation: record.explanation,
    contextPayload: record.contextPayload || undefined,
    evidence: Array.isArray(record.evidence) ? record.evidence : [],
    sourcesChecked: record.sourcesChecked || [],
    sourceFailures: [],
    recommendedActions: record.score >= 85 
      ? ['Do not click this link or submit authentication credentials.', 'If credentials were entered, change passwords immediately.']
      : record.score >= 65
      ? ['Exercise extreme caution with this indicator.', 'Verify domain authenticity via official channels before proceeding.']
      : record.score >= 40
      ? ['Verify the authenticity of this request through independent channels.']
      : ['No immediate malicious indicators detected.', 'Continue adhering to safe security practices.'],
    timestamp: record.createdAt,
    isBackendConnected: true
  }));

  return {
    scans: mappedScans,
    total: data.pagination?.total ?? mappedScans.length,
    page: data.pagination?.page ?? page,
    limit: data.pagination?.limit ?? limit
  };
}

export async function executeThreatWatchCheck(target: string): Promise<{ assessment: RiskStatus; note: string }> {
  const result = await executeScan({ target, mode: 'url' });
  return {
    assessment: result.status,
    note: result.explanation
  };
}

/**
 * Retrieves all authorized brand workspaces for the current authenticated user.
 */
export async function fetchUserBrandWorkspaces(): Promise<Array<{ membershipId: string; role: 'owner' | 'admin' | 'member'; status: string; brand: any }>> {
  const token = getStoredAccessToken();
  if (!token) return [];
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.workspaces || [];
}

/**
 * Retrieves full details for a brand workspace including official assets and membership role.
 */
export async function fetchBrandWorkspaceDetails(brandId: string): Promise<any | null> {
  const token = getStoredAccessToken();
  if (!token) return null;
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand?brandId=${encodeURIComponent(brandId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return await res.json();
}

/**
 * Persists a new brand workspace for the authenticated user.
 */
export async function createBrandWorkspaceApi(data: BrandOnboardingData): Promise<any> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required to create brand workspace');
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create brand workspace');
  }
  return await res.json();
}

/**
 * Updates brand workspace profile settings (name, description, contact info, accent color).
 */
export async function updateBrandProfileApi(brandId: string, updates: Record<string, any>): Promise<any> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required');
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ brandId, ...updates })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update brand profile');
  }
  return await res.json();
}

/**
 * Retrieves official registered reference assets for a brand workspace.
 */
export async function fetchBrandAssets(brandId: string): Promise<BrandAsset[]> {
  const token = getStoredAccessToken();
  if (!token) return [];
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand/assets?brandId=${encodeURIComponent(brandId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.assets || []).map((a: any) => ({
    id: a.id,
    brandId: a.brandId,
    brandName: a.brandName || '',
    type: a.type as BrandAssetType,
    platform: a.platform,
    value: a.value,
    status: a.status,
    dnsTxtRecord: a.dnsTxtRecord,
    verifiedAt: a.verifiedAt ? new Date(a.verifiedAt).toISOString().split('T')[0] : undefined,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : undefined
  }));
}

/**
 * Registers an official brand asset (domain, handle, mobile app, alias).
 * Always initialized in PENDING_DNS / PENDING_VERIFICATION status.
 */
export async function addBrandAssetApi(
  brandId: string,
  asset: { type: BrandAssetType; value: string; platform?: string }
): Promise<BrandAsset> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required');
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand/assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ brandId, ...asset })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to register brand asset');
  }
  const data = await res.json();
  const a = data.asset;
  return {
    id: a.id,
    brandId: a.brandId,
    brandName: a.brandName || '',
    type: a.type as BrandAssetType,
    platform: a.platform,
    value: a.value,
    status: a.status,
    dnsTxtRecord: a.dnsTxtRecord,
    verifiedAt: a.verifiedAt ? new Date(a.verifiedAt).toISOString().split('T')[0] : undefined,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : undefined
  };
}

/**
 * Removes an official brand asset.
 */
export async function deleteBrandAssetApi(brandId: string, assetId: string): Promise<void> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required');
  const apiBase = getApiBaseUrl();
  const res = await fetch(
    `${apiBase}/api/brand/assets?brandId=${encodeURIComponent(brandId)}&assetId=${encodeURIComponent(assetId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete brand asset');
  }
}

/**
 * Initiates cryptographic DNS TXT verification check.
 * Strictly updates to VERIFIED only if the challenge TXT record is validated.
 */
export async function verifyBrandAssetDnsApi(
  brandId: string,
  assetId: string
): Promise<{ verified: boolean; message: string; asset?: BrandAsset }> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required');
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand/assets/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ brandId, assetId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Verification check failed');
  }
  return data;
}

/**
 * Retrieves threat findings for the authorized brand workspace.
 */
export async function fetchBrandThreatFindings(brandId: string): Promise<any[]> {
  const token = getStoredAccessToken();
  if (!token) return [];
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand/threats?brandId=${encodeURIComponent(brandId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.findings || [];
}

/**
 * Retrieves the automated monitoring schedule for a brand workspace.
 */
export async function fetchBrandMonitorScheduleApi(brandId: string): Promise<any> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required');
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand/monitor?brandId=${encodeURIComponent(brandId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch monitor schedule');
  }
  const data = await res.json();
  return data.schedule;
}

/**
 * Updates monitoring schedule or triggers immediate run.
 */
export async function updateBrandMonitorScheduleApi(
  brandId: string,
  options: { enabled?: boolean; frequencyHours?: number; runNow?: boolean }
): Promise<any> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required');
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand/monitor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ brandId, ...options })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update monitor schedule');
  }
  return data;
}

/**
 * Transitions a brand threat finding status and records an audit log entry.
 */
export async function transitionBrandFindingStatusApi(
  findingId: string,
  brandId: string,
  targetStatus: string,
  note?: string
): Promise<any> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required');
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand/threats/${encodeURIComponent(findingId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ brandId, targetStatus, note })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update finding status');
  }
  return data;
}

/**
 * Generates an editable evidence-based RFC 2142 abuse report draft.
 */
export async function generateAbuseReportDraftApi(
  findingId: string,
  brandId: string
): Promise<any> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required');
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand/threats/${encodeURIComponent(findingId)}/abuse-draft?brandId=${encodeURIComponent(brandId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to generate abuse report draft');
  }
  return data.draft;
}

/**
 * Appends an investigation note to a brand threat finding.
 */
export async function addFindingNoteApi(
  findingId: string,
  brandId: string,
  note: string
): Promise<any> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Authentication required');
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/brand/threats/${encodeURIComponent(findingId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ brandId, note })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to append investigation note');
  }
  return data.entry;
}




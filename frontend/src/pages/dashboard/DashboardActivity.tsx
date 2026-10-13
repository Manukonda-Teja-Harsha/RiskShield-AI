import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity as ActivityIcon, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Shield, 
  Flag, 
  Bookmark, 
  Clock, 
  Calendar, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ScanResult, RiskStatus, UserReport, SavedFinding } from '../../types';
import { RiskBadge } from '../../components/common/RiskBadge';

interface DashboardContextType {
  onInspectResult: (result: ScanResult) => void;
  onOpenEmergency: (scenario?: 'link' | 'credentials' | 'money' | 'file') => void;
  onOpenReport: (target: string) => void;
}

type ActivityFilterType = 'ALL' | 'SCANS' | 'REPORTS' | 'SAVED';

interface TimelineActivityItem {
  id: string;
  sourceType: 'SCAN' | 'REPORT' | 'SAVED';
  target: string;
  categoryOrMode: string;
  timestamp: string;
  rawDate: number;
  status: RiskStatus | string;
  summary: string;
  score?: number;
  originalScan?: ScanResult;
  originalReport?: UserReport;
  originalFinding?: SavedFinding;
}

export const DashboardActivity: React.FC = () => {
  const { 
    scanHistory, 
    userReports, 
    savedFindings, 
    removeScanResult, 
    clearHistory, 
    addSavedFinding, 
    removeSavedFinding 
  } = useStore();
  
  const { onInspectResult, onOpenEmergency, onOpenReport } = useOutletContext<DashboardContextType>();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityFilterType>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskStatus>('ALL');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Normalize all streams into unified timeline items
  const unifiedActivities: TimelineActivityItem[] = useMemo(() => {
    const list: TimelineActivityItem[] = [];

    // 1. Scans
    scanHistory.forEach(scan => {
      const parsedTime = Date.parse(scan.timestamp) || Date.now();
      list.push({
        id: scan.id,
        sourceType: 'SCAN',
        target: scan.target,
        categoryOrMode: scan.mode.toUpperCase(),
        timestamp: scan.timestamp,
        rawDate: parsedTime,
        status: scan.status,
        summary: scan.explanation,
        score: scan.score,
        originalScan: scan
      });
    });

    // 2. User Community Reports
    userReports.forEach(report => {
      list.push({
        id: report.id,
        sourceType: 'REPORT',
        target: report.target,
        categoryOrMode: report.category,
        timestamp: report.submittedAt,
        rawDate: Date.now() - 3600000, // recent fallback
        status: report.status,
        summary: report.notes || 'Community threat report filed for inspection.',
        originalReport: report
      });
    });

    // 3. Saved Findings
    savedFindings.forEach(finding => {
      list.push({
        id: finding.id,
        sourceType: 'SAVED',
        target: finding.target,
        categoryOrMode: finding.mode.toUpperCase(),
        timestamp: finding.savedAt,
        rawDate: Date.now() - 1800000,
        status: finding.status,
        summary: finding.explanation || 'Saved telemetry finding for review.',
        score: finding.score,
        originalFinding: finding
      });
    });

    // Sort descending by raw date
    return list.sort((a, b) => b.rawDate - a.rawDate);
  }, [scanHistory, userReports, savedFindings]);

  // Apply User Filters
  const filteredActivities = useMemo(() => {
    const now = Date.now();
    const dayCutoffs: Record<string, number> = {
      '7d': now - 7 * 86400000,
      '30d': now - 30 * 86400000,
      '90d': now - 90 * 86400000,
      'all': 0
    };
    const cutoff = dayCutoffs[timeFilter] || 0;

    return unifiedActivities.filter(item => {
      // Time filter
      if (cutoff > 0 && item.rawDate < cutoff) return false;

      // Type filter
      if (typeFilter === 'SCANS' && item.sourceType !== 'SCAN') return false;
      if (typeFilter === 'REPORTS' && item.sourceType !== 'REPORT') return false;
      if (typeFilter === 'SAVED' && item.sourceType !== 'SAVED') return false;

      // Risk status filter
      if (riskFilter !== 'ALL' && item.status !== riskFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTarget = item.target.toLowerCase().includes(query);
        const matchesSummary = item.summary.toLowerCase().includes(query);
        const matchesCategory = item.categoryOrMode.toLowerCase().includes(query);
        const matchesId = item.id.toLowerCase().includes(query);
        if (!matchesTarget && !matchesSummary && !matchesCategory && !matchesId) return false;
      }

      return true;
    });
  }, [unifiedActivities, timeFilter, typeFilter, riskFilter, searchQuery]);

  // Handle Export Activity Summary (JSON structured report)
  const handleExportData = () => {
    const payload = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        totalRecords: filteredActivities.length,
        filterApplied: {
          timeFilter,
          typeFilter,
          riskFilter,
          searchQuery: searchQuery || 'None'
        }
      },
      auditRecords: filteredActivities.map(item => ({
        id: item.id,
        activityType: item.sourceType,
        target: item.target,
        category: item.categoryOrMode,
        status: item.status,
        score: item.score ?? 'N/A',
        timestamp: item.timestamp,
        summary: item.summary
      }))
    };

    const dataBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `riskshield-activity-audit-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice('Audit report generated and saved as JSON.');
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Inspect Handler
  const handleInspect = (item: TimelineActivityItem) => {
    if (item.originalScan) {
      onInspectResult(item.originalScan);
    } else {
      // Reconstitute ScanResult representation for inspection modal
      const synth: ScanResult = {
        id: item.id,
        target: item.target,
        mode: 'url',
        status: (item.status as RiskStatus) || 'SUSPICIOUS',
        score: item.score || 70,
        timestamp: item.timestamp,
        explanation: item.summary,
        sourcesChecked: ['RiskShield Timeline Archive', 'Telemetry Database'],
        sourceFailures: [],
        evidence: [
          {
            id: 'EV-ACT-1',
            label: `${item.sourceType} Event Record`,
            severity: item.status === 'KNOWN_THREAT' || item.status === 'HIGH_RISK' ? 'high' : 'medium',
            detail: item.summary,
            providerCitation: 'Activity Timeline Journal'
          }
        ],
        recommendedActions: [
          'Review original target if suspect actions persist.',
          'Consider initiating a fresh live scan.'
        ],
        isBackendConnected: false
      };
      onInspectResult(synth);
    }
  };

  // Toggle Save Finding
  const isFindingSaved = (target: string) => {
    return savedFindings.some(f => f.target.toLowerCase() === target.toLowerCase());
  };

  const handleToggleSave = (item: TimelineActivityItem) => {
    const existing = savedFindings.find(f => f.target.toLowerCase() === item.target.toLowerCase());
    if (existing) {
      removeSavedFinding(existing.id);
    } else {
      addSavedFinding({
        scanId: item.id,
        target: item.target,
        mode: (item.originalScan?.mode || 'url'),
        status: (item.status as RiskStatus) || 'SUSPICIOUS',
        score: item.score ?? 50,
        explanation: item.summary,
        personalNotes: 'Saved from Activity Journal'
      });
    }
  };

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold text-brand-500 uppercase tracking-wider">
              Audit Journal & Incident History
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground">Unified Threat Telemetry</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">
            Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Complete chronological record of on-demand scans, community reports, and pinned telemetry findings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="inline-flex items-center gap-2 px-4.5 py-3 rounded-2xl border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors shadow-sm text-xs"
            title="Download structured JSON report for compliance or incident audit"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Log</span>
          </button>

          {scanHistory.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all local scan history entries? Community reports will be preserved.')) {
                  clearHistory();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-2xl border border-border hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20 text-muted-foreground text-xs font-medium transition-colors"
              title="Clear local scan telemetry"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Scans</span>
            </button>
          )}
        </div>
      </div>

      {/* Export notification */}
      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* 2. Filter Bar */}
      <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by target domain, keyword, ID, or report category..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border dark:border-zinc-700/80 bg-white dark:bg-zinc-900/90 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 caret-brand-500"
            />
          </div>

          {/* Time range pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(['7d', '30d', '90d', 'all'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timeFilter === tf
                    ? 'bg-brand-500 text-white'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tf === 'all' ? 'All Time' : `Last ${tf}`}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters: Stream Type & Risk Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-border/60">
          {/* Activity Type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Type:</span>
            <div className="flex items-center gap-1">
              {[
                { key: 'ALL', label: `All (${unifiedActivities.length})` },
                { key: 'SCANS', label: `Scans (${scanHistory.length})` },
                { key: 'REPORTS', label: `Reports (${userReports.length})` },
                { key: 'SAVED', label: `Saved (${savedFindings.length})` }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key as ActivityFilterType)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    typeFilter === key
                      ? 'bg-foreground text-background shadow-xs'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Verdict Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Verdict:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as 'ALL' | RiskStatus)}
              className="px-2.5 py-1 rounded-md border border-border dark:border-zinc-700/80 bg-white dark:bg-zinc-900/90 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Verdicts</option>
              <option value="KNOWN_THREAT">Known Threat</option>
              <option value="HIGH_RISK">High Risk</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="NO_KNOWN_THREAT_DETECTED">No Known Threat</option>
              <option value="INCONCLUSIVE">Inconclusive</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Timeline Items */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
            <ActivityIcon className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="font-semibold text-foreground text-base">No Activity Records Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || riskFilter !== 'ALL' || typeFilter !== 'ALL'
                ? 'Try clearing active filters to view all entries in your history.'
                : 'Scans, filed community reports, and pinned findings will appear here in chronological order.'}
            </p>
          </div>
        ) : (
          filteredActivities.map((item) => {
            const isSaved = isFindingSaved(item.target);

            // Icon by source type
            const TypeIcon = item.sourceType === 'SCAN' 
              ? Shield 
              : item.sourceType === 'REPORT' 
                ? Flag 
                : Bookmark;

            const iconColors = {
              SCAN: 'text-brand-500 bg-brand-500/10',
              REPORT: 'text-purple-500 bg-purple-500/10',
              SAVED: 'text-amber-500 bg-amber-500/10'
            }[item.sourceType];

            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm hover:border-brand-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left: Icon & Target Details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-3 rounded-2xl shrink-0 mt-0.5 ${iconColors}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground break-all">
                        {item.target}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {item.categoryOrMode}
                      </span>
                      {/* Badge representation */}
                      {item.sourceType === 'SCAN' && (
                        <RiskBadge status={item.status as RiskStatus} size="sm" />
                      )}
                      {item.sourceType === 'REPORT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {item.status}
                        </span>
                      )}
                      {item.sourceType === 'SAVED' && (
                        <RiskBadge status={item.status as RiskStatus} size="sm" />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-muted-foreground/70" />
                        {item.timestamp}
                      </span>
                      <span className="font-mono text-muted-foreground/60">ID: {item.id}</span>
                      {item.score !== undefined && (
                        <span className="font-mono font-medium text-foreground">
                          Confidence: {item.score}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleInspect(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
                    title="Inspect itemized signals and evidence"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Inspect</span>
                  </button>

                  <button
                    onClick={() => handleToggleSave(item)}
                    className={`p-1.5 rounded-xl border transition-colors ${
                      isSaved 
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title={isSaved ? 'Remove from Saved Findings' : 'Save this finding'}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  </button>

                  {item.sourceType === 'SCAN' && (
                    <button
                      onClick={() => removeScanResult(item.id)}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete from scan history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Eye, 
  Flag, 
  Copy, 
  Check, 
  Sparkles,
  Clock,
  Layers,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { ScanMode, ScanResult, ScannerContextPayload } from '../../types';
import { executePersonalScan } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { RiskBadge } from '../common/RiskBadge';
import { AdaptiveScannerForm } from './AdaptiveScannerForm';

interface UniversalScannerCardProps {
  onInspectResult: (result: ScanResult) => void;
  onOpenEmergency: (scenario?: 'link' | 'credentials' | 'money' | 'file') => void;
  onOpenReport: (target: string) => void;
  onScanStateChange?: (state: {
    isScanning: boolean;
    result: ScanResult | null;
    target?: string;
    error?: string | null;
  }) => void;
}

export const UniversalScannerCard: React.FC<UniversalScannerCardProps> = ({
  onInspectResult,
  onOpenEmergency,
  onOpenReport,
  onScanStateChange
}) => {
  const location = useLocation();
  const { 
    user,
    scanHistory,
    addScanResult, 
    addThreatWatch, 
    threatWatchList, 
    quickScanTarget, 
    setQuickScanTarget 
  } = useStore();

  const [initialTarget, setInitialTarget] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [watchedSuccess, setWatchedSuccess] = useState(false);
  const [importedNotice, setImportedNotice] = useState<string | null>(null);

  // Synchronize target link transferred from Home Page / Login flow
  useEffect(() => {
    const fromState = (location.state as any)?.pendingScanTarget;
    const fromStore = quickScanTarget;
    const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('riskshield_pending_scan') : null;
    const target = fromState || fromStore || fromStorage;

    if (target) {
      setInitialTarget(target);
      setImportedNotice(target);
      setQuickScanTarget(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('riskshield_pending_scan');
      }
    }
  }, [location.state, quickScanTarget, setQuickScanTarget]);

  const handleScan = async (query: string, scanMode: ScanMode, contextPayload: ScannerContextPayload) => {
    // Guard against pasted passwords or credential inputs
    const lower = query.toLowerCase();
    if (lower.startsWith('password:') || lower.startsWith('otp:') || lower.includes('cvv:')) {
      const errMsg = 'Security warning: Never submit passwords, PINs, or card CVVs. RiskShield AI inspects technical indicators and domain signals only.';
      setError(errMsg);
      onScanStateChange?.({ isScanning: false, result: null, target: query, error: errMsg });
      return;
    }

    setError(null);
    setIsScanning(true);
    setScanResult(null);
    setWatchedSuccess(false);
    setImportedNotice(null);
    onScanStateChange?.({ isScanning: true, result: null, target: query, error: null });

    try {
      // Execute through the shared personal user scanner workflow with contextual telemetry
      const execution = await executePersonalScan(
        query, 
        scanMode, 
        {
          userId: user?.id || 'USR-DEMO',
          email: user?.email || '',
          authorizedHistory: scanHistory
        },
        contextPayload
      );

      setScanResult(execution.scanResult);
      addScanResult(execution.scanResult);
      onScanStateChange?.({ isScanning: false, result: execution.scanResult, target: query, error: null });
    } catch (err: any) {
      const errMsg = err?.message || 'An error occurred during evidence gathering. Please check your network and retry.';
      setError(errMsg);
      onScanStateChange?.({ isScanning: false, result: null, target: query, error: errMsg });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopySummary = async () => {
    if (!scanResult) return;
    try {
      await navigator.clipboard.writeText(`[RiskShield AI Scan Verdict]
Target: ${scanResult.target}
Category: ${scanResult.category || scanResult.mode}
Status: ${scanResult.status} (Score: ${scanResult.score}/100)
Assessment: ${scanResult.explanation}
Timestamp: ${scanResult.timestamp}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const handleAddToWatch = () => {
    if (!scanResult) return;
    const isAlreadyWatched = threatWatchList.some(w => w.target === scanResult.target);
    if (!isAlreadyWatched) {
      addThreatWatch({
        target: scanResult.target,
        targetType: scanResult.mode,
        assessment: scanResult.status,
        monitoringStatus: scanResult.status === 'KNOWN_THREAT' || scanResult.status === 'HIGH_RISK' ? 'Threat Detected' : 'Monitoring',
        notificationsEnabled: true,
        notes: `Saved from Universal Scanner (${scanResult.category || scanResult.mode})`
      });
    }
    setWatchedSuccess(true);
    setTimeout(() => setWatchedSuccess(false), 2200);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      {/* Decorative subtle accent */}
      <div 
        aria-hidden="true" 
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-amber-500 to-orange-600 opacity-80" 
      />

      {/* Card Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CONTEXT-AWARE ADAPTIVE SCANNER</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-foreground">
            Analyze Suspicious Indicator
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a content type below to reveal tailored telemetry fields and contextual verification questions.
          </p>
        </div>

        <div className="text-[11px] font-mono text-muted-foreground/80 self-start md:self-auto px-3 py-1.5 rounded-xl bg-muted/50 border border-border">
          <span>Engine: <strong>Shared Telemetry v2.5</strong></span>
        </div>
      </div>

      {/* Imported Notice Pill */}
      {importedNotice && (
        <div className="mb-4 p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-between text-xs font-mono text-brand-500 animate-in fade-in">
          <span>Queued from Home: <strong>{importedNotice}</strong></span>
          <button 
            type="button" 
            onClick={() => setImportedNotice(null)}
            className="text-xs underline hover:text-brand-600 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Adaptive Scanner Form Component */}
      <AdaptiveScannerForm
        onScan={handleScan}
        isScanning={isScanning}
        error={error}
        onClearError={() => setError(null)}
        initialTarget={initialTarget}
        onOpenEmergency={onOpenEmergency}
        onOpenReport={onOpenReport}
      />

      {/* Live Result View */}
      {scanResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-7 p-6 sm:p-7 rounded-3xl bg-muted/40 border border-border space-y-5"
        >
          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div className="flex items-center gap-2.5 flex-wrap">
              <RiskBadge status={scanResult.status} size="md" />
              <span className="text-xs font-mono font-bold text-foreground">
                Threat Score: {scanResult.score}/100
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                ({scanResult.evidence.length} evidence signals)
              </span>

              {/* Assessment Freshness Pill */}
              {scanResult.freshness && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  scanResult.freshness === 'FRESH'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {scanResult.freshness === 'FRESH' ? 'Fresh Telemetry' : 'Refreshed Assessment'}
                </span>
              )}
            </div>

            <span className="text-[11px] font-mono text-muted-foreground">
              {new Date(scanResult.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Previous Scan Re-scan Notice */}
          {scanResult.previousAssessment && (
            <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  Previously assessed on{' '}
                  <strong className="text-foreground">
                    {new Date(scanResult.previousAssessment.previousDate).toLocaleDateString()}
                  </strong>{' '}
                  ({scanResult.previousAssessment.ageHours}h ago) as{' '}
                  <strong className="text-foreground">{scanResult.previousAssessment.previousStatus}</strong>.
                </span>
              </div>
              <span className="text-[11px] text-brand-500 font-bold shrink-0">
                History Retained
              </span>
            </div>
          )}

          {/* Extracted Indicators if multiple */}
          {scanResult.extractedIndicators && scanResult.extractedIndicators.length > 1 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
                Extracted Sub-Indicators ({scanResult.extractedIndicators.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {scanResult.extractedIndicators.map((ind, i) => (
                  <span 
                    key={i} 
                    className="px-2.5 py-1 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground"
                  >
                    <span className="text-brand-500 uppercase font-bold mr-1">{ind.type}:</span>
                    {ind.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Explanation Text */}
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              {scanResult.explanation}
            </p>
            {scanResult.status === 'NO_KNOWN_THREAT_DETECTED' && (
              <p className="text-[11px] font-mono text-muted-foreground">
                ⚠️ Clean blocklist status does not guarantee 100% zero-day immunity. Always verify sender identity.
              </p>
            )}
          </div>

          {/* Source Coverage / Honest Availability Summary */}
          <div className="p-3.5 rounded-2xl bg-card/60 border border-border space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-bold uppercase text-[10px] text-foreground">Threat Intelligence Feeds</span>
              <span>{scanResult.sourcesChecked.length} active / {scanResult.sourceFailures.length} unavailable</span>
            </div>
            
            {/* Real-time Provider Lookup Details */}
            {scanResult.providerResults && scanResult.providerResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {scanResult.providerResults.map((pr, pidx) => {
                  const displayName =
                    pr.provider === 'OPENPHISH'
                      ? 'OpenPhish Community Feed'
                      : pr.provider === 'URLHAUS'
                      ? 'URLhaus Malware DB (abuse.ch)'
                      : pr.provider === 'GOOGLE_WEB_RISK'
                      ? 'Google Web Risk'
                      : pr.provider === 'PHISHTANK'
                      ? 'PhishTank'
                      : pr.provider;

                  return (
                    <div key={pidx} className="p-2.5 rounded-xl bg-card border border-border flex flex-col justify-between gap-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[11px] text-foreground">
                          {displayName}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          pr.status === 'MATCH'
                            ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                            : pr.status === 'NO_MATCH'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : pr.status === 'NOT_CONFIGURED'
                            ? 'bg-muted text-muted-foreground border border-border'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {pr.status === 'NO_MATCH' ? 'NO THREAT LISTED' : pr.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                        <span>
                          {pr.feedFreshness ? `Feed: ${pr.feedFreshness}` : pr.threatTypes && pr.threatTypes.length > 0 ? pr.threatTypes.join(', ') : 'All categories'}
                        </span>
                        <span>{pr.responseTimeMs > 0 ? `${pr.responseTimeMs}ms` : 'Offline'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {scanResult.sourcesChecked.map((src, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                  <CheckCircle2 className="w-3 h-3" />
                  {src}
                </span>
              ))}
              {scanResult.sourceFailures.map((fl, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                  <AlertCircle className="w-3 h-3" />
                  {fl}
                </span>
              ))}
            </div>
          </div>

          {/* Itemized Evidence Snippets (Up to 2) */}
          {scanResult.evidence.length > 0 && (
            <div className="space-y-2 pt-1.5">
              {scanResult.evidence.slice(0, 2).map((ev) => (
                <div key={ev.id} className="text-xs p-3 rounded-xl bg-card border border-border flex items-start gap-2.5">
                  <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    ev.severity === 'high' || ev.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <div>
                    <strong className="text-foreground">{ev.label}:</strong>{' '}
                    <span className="text-muted-foreground">{ev.detail}</span>
                    {ev.providerCitation && (
                      <span className="block text-[10px] font-mono text-brand-500/80 mt-0.5">
                        Citation: {ev.providerCitation}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Row */}
          <div className="pt-3.5 flex flex-wrap items-center justify-between gap-3.5 border-t border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onInspectResult(scanResult)}
                className="px-3.5 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 text-xs font-bold border border-brand-500/20 transition-colors"
              >
                Inspect All Evidence ({scanResult.evidence.length}) →
              </button>

              <button
                type="button"
                onClick={handleAddToWatch}
                className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3 h-3 text-brand-500" />
                <span>{watchedSuccess ? 'Added to Watch!' : 'Save to Threat Watch'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenReport(scanResult.target)}
                className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
              >
                <Flag className="w-3 h-3 text-amber-500" />
                <span>Report Scam</span>
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Emergency Mode Entry */}
            {(scanResult.status === 'KNOWN_THREAT' || scanResult.status === 'HIGH_RISK') && (
              <button
                type="button"
                onClick={() => onOpenEmergency('link')}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold border border-red-500/30 flex items-center gap-1.5 transition-colors ml-auto"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Clicked This Link?</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UniversalScannerCard;

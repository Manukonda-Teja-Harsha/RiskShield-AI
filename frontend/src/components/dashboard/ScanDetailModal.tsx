import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Bookmark, 
  Eye, 
  Flag, 
  ShieldCheck, 
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { ScanResult } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { useStore } from '../../store/useStore';

interface ScanDetailModalProps {
  scan: ScanResult | null;
  onClose: () => void;
  onOpenEmergency: (scenario?: 'link' | 'credentials' | 'money' | 'file') => void;
  onOpenReport: (target: string) => void;
}

export const ScanDetailModal: React.FC<ScanDetailModalProps> = ({
  scan,
  onClose,
  onOpenEmergency,
  onOpenReport
}) => {
  const { addThreatWatch, addSavedFinding, threatWatchList, savedFindings } = useStore();
  const [copied, setCopied] = useState(false);
  const [watchSaved, setWatchSaved] = useState(false);
  const [findingSaved, setFindingSaved] = useState(false);

  if (!scan) return null;

  const isAlreadyWatched = threatWatchList.some(w => w.target === scan.target);
  const isAlreadyBookmarked = savedFindings.some(f => f.scanId === scan.id);

  const handleCopy = async () => {
    try {
      const report = `[RiskShield AI Technical Evidence Report]
Target: ${scan.target}
Evaluation Mode: ${scan.mode}
Verdict: ${scan.status}
Threat Score: ${scan.score}/100
Timestamp: ${scan.timestamp}
Explanation: ${scan.explanation}

Evidence Factors:
${scan.evidence.map(e => `- [${e.severity.toUpperCase()}] ${e.label}: ${e.detail}`).join('\n')}

Sources Checked: ${scan.sourcesChecked.join(', ')}
${scan.sourceFailures.length ? `Source Failures: ${scan.sourceFailures.join(', ')}` : ''}

Recommended Mitigation:
${scan.recommendedActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Notice: Telemetry reflects indicators available at scan time. Absence of alert does not guarantee zero-day immunity.`;

      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToWatch = () => {
    if (isAlreadyWatched) return;
    addThreatWatch({
      target: scan.target,
      targetType: scan.mode,
      assessment: scan.status,
      monitoringStatus: scan.status === 'KNOWN_THREAT' || scan.status === 'HIGH_RISK' ? 'Threat Detected' : 'Monitoring',
      notificationsEnabled: true,
      notes: `Saved from scan verdict: ${scan.status}`
    });
    setWatchSaved(true);
    setTimeout(() => setWatchSaved(false), 2500);
  };

  const handleSaveFinding = () => {
    if (isAlreadyBookmarked) return;
    addSavedFinding({
      scanId: scan.id,
      target: scan.target,
      mode: scan.mode,
      status: scan.status,
      score: scan.score,
      explanation: scan.explanation,
      personalNotes: 'Bookmarked for security follow-up'
    });
    setFindingSaved(true);
    setTimeout(() => setFindingSaved(false), 2500);
  };

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-detail-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <RiskBadge status={scan.status} size="md" />
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border uppercase">
                  {scan.mode} Scan
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Score: <strong className="text-foreground">{scan.score}/100</strong>
                </span>
              </div>
              <h2 id="scan-detail-title" className="text-base sm:text-lg font-mono font-bold text-foreground truncate mt-1">
                {scan.target}
              </h2>
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(scan.timestamp).toLocaleString()}</span>
                </span>
                <span>•</span>
                <span>ID: {scan.id}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors shrink-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Explanation Box */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
            <span className="text-xs font-mono font-bold text-foreground block">Technical Assessment Verdict</span>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {scan.explanation}
            </p>
          </div>

          {/* Previous Scan Re-scan Notice */}
          {scan.previousAssessment && (
            <div className="p-3.5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  Prior check on <strong>{new Date(scan.previousAssessment.previousDate).toLocaleDateString()}</strong> ({scan.previousAssessment.ageHours}h ago) was <strong>{scan.previousAssessment.previousStatus}</strong>.
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                scan.previousAssessment.isFresh 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {scan.previousAssessment.isFresh ? 'FRESH TELEMETRY' : 'REFRESHED FROM STALE'}
              </span>
            </div>
          )}

          {/* Extracted Indicators if multiple */}
          {scan.extractedIndicators && scan.extractedIndicators.length > 1 && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1.5">
              <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
                Extracted Sub-Indicators ({scan.extractedIndicators.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {scan.extractedIndicators.map((ind, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-card border border-border text-[11px] font-mono text-foreground">
                    <strong className="text-brand-500 uppercase mr-1">{ind.type}:</strong> {ind.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Evidence Factors */}
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider mb-2.5 flex items-center justify-between">
              <span>Itemized Evidence Factors ({scan.evidence.length})</span>
              <span className="text-[10px] text-muted-foreground lowercase">Signal indicators</span>
            </h3>

            {scan.evidence.length === 0 ? (
              <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground">
                No adverse structural, lexical, or heuristic risk factors were triggered by this target.
              </div>
            ) : (
              <div className="space-y-2">
                {scan.evidence.map((factor) => (
                  <div key={factor.id} className="p-3.5 rounded-xl bg-card border border-border hover:border-border/80 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-foreground flex items-center gap-2">
                        <AlertCircle className={`w-3.5 h-3.5 ${
                          factor.severity === 'high' ? 'text-red-500' : factor.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
                        }`} />
                        <span>{factor.label}</span>
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold uppercase ${
                        factor.severity === 'high' 
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                          : factor.severity === 'medium'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}>
                        {factor.severity} severity
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-5.5">
                      {factor.detail}
                    </p>
                    {factor.providerCitation && (
                      <span className="text-[10px] font-mono text-muted-foreground/70 block pl-5.5">
                        Attribution: {factor.providerCitation}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sources Checked & Failures */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border text-xs font-mono space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">Threat Feeds:</span>
              <span className="text-foreground">{scan.sourcesChecked.join(', ')}</span>
            </div>

            {scan.providerResults && scan.providerResults.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-border/50">
                <span className="text-[11px] font-bold text-muted-foreground uppercase block">Provider Attestation Breakdown:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scan.providerResults.map((pr, pidx) => {
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
                      <div key={pidx} className="p-2 rounded-xl bg-card border border-border text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-foreground">
                            {displayName}
                          </strong>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            pr.status === 'MATCH'
                              ? 'bg-red-500/10 text-red-500'
                              : pr.status === 'NO_MATCH'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : pr.status === 'NOT_CONFIGURED'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {pr.status === 'NO_MATCH' ? 'NO THREAT LISTED' : pr.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>
                            {pr.feedFreshness ? `Feed: ${pr.feedFreshness}` : `Latency: ${pr.responseTimeMs > 0 ? `${pr.responseTimeMs}ms` : 'N/A'}`}
                          </span>
                          <span>{pr.threatTypes?.length ? pr.threatTypes.join(', ') : 'Clean'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {scan.sourceFailures.length > 0 && (
              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 pt-1 border-t border-border/50">
                <span className="shrink-0">Unavailable Adapters:</span>
                <span>{scan.sourceFailures.join(', ')} (Failsafe mode active)</span>
              </div>
            )}
          </div>

          {/* Recommended Actions */}
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider mb-2">
              Recommended Next Steps
            </h3>
            <div className="space-y-1.5">
              {scan.recommendedActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-foreground bg-card border border-border p-2.5 rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zero-Day Immunity Notice */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span>
              <strong>Detection Limitation Notice:</strong> A clean or inconclusive risk rating reflects indicators verified at scan time. Unreported zero-day lures may not yet appear on public blacklists.
            </span>
          </div>

          {/* Action Hub */}
          <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddToWatch}
                disabled={isAlreadyWatched || watchSaved}
                className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground border border-border flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5 text-brand-500" />
                <span>{isAlreadyWatched ? 'On Threat Watch' : watchSaved ? 'Added to Watch!' : 'Add to Threat Watch'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveFinding}
                disabled={isAlreadyBookmarked || findingSaved}
                className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground border border-border flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                <span>{isAlreadyBookmarked ? 'Bookmarked' : findingSaved ? 'Saved!' : 'Save Finding'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenReport(scan.target)}
                className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground border border-border flex items-center gap-1.5 transition-all"
              >
                <Flag className="w-3.5 h-3.5 text-amber-500" />
                <span>Report Scam</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground border border-border flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Summary' : 'Copy Evidence'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEmergency('link');
              }}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Already Interacted?</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ScanDetailModal;

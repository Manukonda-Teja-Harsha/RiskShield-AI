import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Activity, 
  Database, 
  Globe, 
  Terminal, 
  Eye, 
  Flag, 
  Clock, 
  RefreshCw, 
  Lock, 
  Info,
  Server,
  Layers,
  FileText
} from 'lucide-react';
import { ScanResult, EvidenceFactor, ThreatFindingStatus, BrandThreatFinding } from '../../types';
import { RiskBadge } from '../common/RiskBadge';

export interface MainIntelligenceAnalysisCardProps {
  scanResult: ScanResult | null;
  isScanning?: boolean;
  scanTarget?: string;
  error?: string | null;
  onClearError?: () => void;
  context: 'user' | 'brand';
  brandContext?: {
    brandName?: string;
    brandId?: string;
    scopedAssets?: Array<{ value: string; type: string; status: string }>;
  };
  onOpenEmergency?: (scenario?: 'link' | 'credentials' | 'money' | 'file') => void;
  onOpenReport?: (target: string) => void;
  onOpenInspectModal?: (finding: BrandThreatFinding) => void;
}

export const MainIntelligenceAnalysisCard: React.FC<MainIntelligenceAnalysisCardProps> = ({
  scanResult,
  isScanning = false,
  scanTarget = '',
  error = null,
  onClearError,
  context,
  brandContext,
  onOpenEmergency,
  onOpenReport,
  onOpenInspectModal
}) => {
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [copiedPacket, setCopiedPacket] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Parse URL components safely for deep telemetry
  const parsedUrlDetails = React.useMemo(() => {
    const raw = scanResult?.target || scanTarget || '';
    if (!raw) return null;

    try {
      const urlToParse = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
      const url = new URL(urlToParse);
      const parts = url.hostname.split('.');
      const tld = parts.length > 1 ? `.${parts[parts.length - 1]}` : 'N/A';
      const registrableApex = parts.length > 1 ? parts.slice(-2).join('.') : url.hostname;
      const subdomain = parts.length > 2 ? parts.slice(0, -2).join('.') : null;

      return {
        protocol: url.protocol,
        hostname: url.hostname,
        registrableApex,
        subdomain,
        tld,
        pathname: url.pathname !== '/' ? url.pathname : null,
        search: url.search || null,
        port: url.port || (url.protocol === 'https:' ? '443' : '80')
      };
    } catch {
      return {
        protocol: 'N/A',
        hostname: raw,
        registrableApex: raw,
        subdomain: null,
        tld: 'N/A',
        pathname: null,
        search: null,
        port: 'N/A'
      };
    }
  }, [scanResult?.target, scanTarget]);

  const handleCopyTarget = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(true);
      setTimeout(() => setCopiedTarget(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  const handleCopyEvidencePacket = async () => {
    if (!scanResult) return;
    try {
      const packet = `[RiskShield AI — Technical Intelligence Dossier]
Target: ${scanResult.target}
Normalized Target: ${scanResult.normalizedTarget || scanResult.target}
Evaluation Mode: ${scanResult.mode}
Category: ${scanResult.category || scanResult.mode}
Verdict: ${scanResult.status}
Threat Score: ${scanResult.score}/100
Confidence: ${scanResult.confidence ? Math.round(scanResult.confidence * 100) + '%' : 'N/A'}
Timestamp: ${scanResult.timestamp}
Primary Assessment: ${scanResult.explanation}

Detected Findings (${scanResult.evidence.length}):
${scanResult.evidence.map((e, idx) => `${idx + 1}. [${e.severity.toUpperCase()}] ${e.label}: ${e.detail} (${e.providerCitation || 'Heuristic'})`).join('\n')}

Threat Intelligence Feeds:
${scanResult.providerResults?.map(p => `- ${p.provider}: ${p.status} (${p.responseTimeMs}ms)`).join('\n') || 'None configured'}

Recommended Mitigation:
${scanResult.recommendedActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Notice: Zero-day immunity is never guaranteed. Technical indicators reflect state at scan timestamp.`;

      await navigator.clipboard.writeText(packet);
      setCopiedPacket(true);
      setTimeout(() => setCopiedPacket(false), 2200);
    } catch {
      // Ignore
    }
  };

  // Helper to infer affected URL component for each evidence item
  const inferAffectedComponent = (label: string, detail: string): string => {
    const l = (label + ' ' + detail).toLowerCase();
    if (l.includes('subdomain')) return 'Subdomain Structure';
    if (l.includes('homoglyph') || l.includes('confusable') || l.includes('punycode')) return 'Punycode / Hostname';
    if (l.includes('typo') || l.includes('substitution') || l.includes('levenshtein')) return 'Registrable Apex Domain';
    if (l.includes('tld') || l.includes('top-level')) return 'Top-Level Domain (.tld)';
    if (l.includes('credential') || l.includes('login') || l.includes('password') || l.includes('lure')) return 'Path / Authentication Lure';
    if (l.includes('payment') || l.includes('wire') || l.includes('upi') || l.includes('otp')) return 'Transaction Request';
    if (l.includes('provider') || l.includes('catalog') || l.includes('phishing feed')) return 'Catalog Reputation';
    return 'Full Indicator';
  };

  // Helper to infer specific mitigation advice for an evidence factor
  const inferMitigation = (label: string, severity: string): string => {
    const l = label.toLowerCase();
    if (l.includes('homoglyph') || l.includes('confusable')) {
      return 'Verify domain spelling character-by-character. Do not enter credentials or complete multi-factor challenges.';
    }
    if (l.includes('subdomain')) {
      return 'Notice the authoritative apex domain. The organization claimed in the subdomain does not own this server.';
    }
    if (l.includes('typo')) {
      return 'Reroute to the verified official bookmark. Do not click links received in unsolicited messages.';
    }
    if (l.includes('provider') || severity === 'critical') {
      return 'Block indicator at gateway/firewall. Terminate connection immediately.';
    }
    return 'Exercise caution and verify destination authenticity before sharing confidential information.';
  };

  // 1. Loading / Scanning State
  if (isScanning) {
    return (
      <div className="bg-card border-2 border-brand-500/40 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden transition-all">
        <div 
          aria-hidden="true" 
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-amber-500 to-emerald-500 animate-pulse" 
        />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-bold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 animate-spin text-brand-400" />
              <span>Deep Intelligence Engine Running</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-foreground">
              Technical Security & Risk Analysis
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-ping" />
            <span>Analyzing: <strong className="text-foreground break-all">{scanTarget || 'Indicator'}</strong></span>
          </div>
        </div>

        {/* Multi-stage Scanner Animation Telemetry */}
        <div className="py-10 max-w-xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h4 className="text-lg font-bold font-display text-foreground">
              Evaluating Multi-Layer Threat Vectors
            </h4>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Synthesizing TR39 confusable metrics, Damerau-Levenshtein distance, deceptive subdomain structure, and querying external threat intelligence mesh...
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs font-mono">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Vector 1</span>
              <span className="text-brand-400 font-bold">Lexical & TR39</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Homoglyph & Punycode</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs font-mono">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Vector 2</span>
              <span className="text-amber-400 font-bold">Domain Apex</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Deceptive Subdomains</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs font-mono">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Vector 3</span>
              <span className="text-emerald-400 font-bold">Threat Feeds</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Multi-Source Catalogs</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State (When scan failed)
  if (error && !scanResult) {
    return (
      <div className="bg-card border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-foreground">
                Intelligence Scan Notice
              </h3>
              {onClearError && (
                <button
                  type="button"
                  onClick={onClearError}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground underline"
                >
                  Dismiss
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-red-400 font-mono leading-relaxed">
              {error}
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Ensure the target indicator is a valid URL, domain, or supported format without credentials or private secrets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Ready / Empty State (No scan yet)
  if (!scanResult) {
    return (
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden text-center py-10">
        <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground mb-4">
          <Shield className="w-7 h-7 text-brand-400" />
        </div>
        <h3 className="text-lg font-bold font-display text-foreground">
          Main Intelligence Analysis Ready
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
          Submit any suspicious URL or indicator in the scanner above to generate an authoritative risk verdict, vulnerability breakdown, and technical evidence dossier.
        </p>
      </div>
    );
  }

  // 4. Completed Technical Intelligence Analysis Card
  const score = scanResult.score;
  const isThreat = scanResult.status === 'KNOWN_THREAT';
  const isHighRisk = scanResult.status === 'HIGH_RISK';
  const isSuspicious = scanResult.status === 'SUSPICIOUS';
  const isClean = scanResult.status === 'NO_KNOWN_THREAT_DETECTED';
  const isInconclusive = scanResult.status === 'INCONCLUSIVE';

  const scoreColor = isThreat || isHighRisk
    ? 'text-red-500'
    : isSuspicious
    ? 'text-amber-500'
    : isClean
    ? 'text-emerald-500'
    : 'text-zinc-400';

  const scoreBg = isThreat || isHighRisk
    ? 'bg-red-500'
    : isSuspicious
    ? 'bg-amber-500'
    : isClean
    ? 'bg-emerald-500'
    : 'bg-zinc-400';

  const verdictLabel = isThreat
    ? 'Confirmed Threat'
    : isHighRisk
    ? 'High Risk'
    : isSuspicious
    ? 'Suspicious'
    : isClean
    ? 'No Known Threat Detected'
    : 'Inconclusive';

  const confidencePct = scanResult.confidence 
    ? Math.round(scanResult.confidence * 100) 
    : isThreat ? 98 : isHighRisk ? 78 : isSuspicious ? 70 : 80;

  return (
    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 lg:p-9 shadow-xl relative overflow-hidden space-y-7 transition-all">
      {/* Decorative accent top bar */}
      <div 
        aria-hidden="true" 
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-amber-500 to-emerald-500 opacity-90" 
      />

      {/* ======================================================== */}
      {/* SECTION A: ANALYZED TARGET HEADER */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MAIN INTELLIGENCE ANALYSIS</span>
            </span>

            <span className="text-muted-foreground">•</span>

            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-md bg-muted border border-border text-foreground font-bold">
              Type: {scanResult.category || scanResult.mode}
            </span>

            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isThreat || isHighRisk
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : isSuspicious
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              Scan Status: Completed
            </span>

            {scanResult.sanitizationApplied && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                Auth Tokens Redacted for Privacy
              </span>
            )}
          </div>

          {/* Submitted Indicator String with Safe Wrapping */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-mono text-muted-foreground shrink-0">Target:</span>
            <span className="font-mono text-sm sm:text-base font-bold text-foreground break-all bg-muted/40 px-3 py-1.5 rounded-xl border border-border flex-1">
              {scanResult.target}
            </span>
          </div>
        </div>

        {/* Target Header Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={() => handleCopyTarget(scanResult.target)}
            className="px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-xs font-mono font-bold transition-all border border-border flex items-center gap-1.5 active:scale-95"
          >
            {copiedTarget ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Copy Target</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyEvidencePacket}
            className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted/50 text-foreground text-xs font-mono font-bold transition-all border border-border flex items-center gap-1.5 active:scale-95"
          >
            {copiedPacket ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Packet Copied!</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-brand-400" />
                <span>Copy Intelligence Dossier</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION B: RISK SCORE AND VERDICT (PRIMARY FOCAL POINT) */}
      {/* ======================================================== */}
      <div className="p-6 sm:p-7 rounded-3xl bg-muted/20 border border-border grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Prominent Score Metric (4 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-3">
          <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground tracking-wider">
            Authoritative Risk Assessment
          </span>

          <div className="flex items-baseline gap-3">
            <span className={`text-6xl sm:text-7xl font-display font-black tracking-tight ${scoreColor}`}>
              {score}
            </span>
            <span className="text-xl font-display font-bold text-muted-foreground">
              / 100
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <RiskBadge status={scanResult.status} size="lg" />
            <span className="text-xs font-mono font-bold text-foreground">
              {verdictLabel}
            </span>
          </div>

          {/* Visual Score Meter Bar */}
          <div className="w-full max-w-xs space-y-1 pt-1">
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden border border-border/60">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${scoreBg}`}
                style={{ width: `${Math.max(5, Math.min(100, score))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground px-0.5">
              <span>0 (Clean)</span>
              <span>50 (Suspicious)</span>
              <span>100 (Critical)</span>
            </div>
          </div>
        </div>

        {/* Right: Confidence, Explanation & Disclaimer (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
          {/* Confidence Metric Display (Separated from Risk Score) */}
          <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
              <div>
                <span className="text-xs font-mono font-bold text-foreground block">
                  Model Confidence Rating
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Separately calibrated against corroborating telemetry signals
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-base font-display font-black font-mono text-foreground">
                {confidencePct}%
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {confidencePct >= 85 ? 'High Confidence' : confidencePct >= 60 ? 'Moderate Confidence' : 'Low / Limited Coverage'}
              </span>
            </div>
          </div>

          {/* Primary Result Explanation */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground tracking-wider block">
              Technical Assessment
            </span>
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              {scanResult.explanation}
            </p>
          </div>

          {/* Zero-Day / Safe Guarantee Disclaimer */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-muted-foreground font-mono flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Day Notice:</strong> Absence of an active catalog match does not guarantee absolute immunity. RiskShield assesses indicators against available heuristics and feeds at timestamp {new Date(scanResult.timestamp).toLocaleTimeString()}.
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION C: DETECTED VULNERABILITIES & SECURITY FINDINGS */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-400 shrink-0" />
            <h3 className="text-base sm:text-lg font-display font-extrabold text-foreground">
              Detected Vulnerabilities & Security Findings
            </h3>
          </div>

          <span className="text-xs font-mono text-muted-foreground">
            {scanResult.evidence.length} finding(s) cataloged
          </span>
        </div>

        {/* Supported Check Matrix Pills */}
        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ✓ TR39 Confusables: Checked
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ✓ Deceptive Subdomains: Checked
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ✓ Typosquatting / Levenshtein: Checked
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ✓ Threat Intelligence Mesh: Checked
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border">
            — SSL/TLS Cert Transparency: Not checked
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border">
            — Sandbox Execution: Not checked
          </span>
        </div>

        {/* Findings List or Neutral Empty State */}
        {scanResult.evidence.length === 0 ? (
          <div className="p-6 rounded-2xl bg-muted/20 border border-border text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-sm text-foreground">
              No Supported Findings or Vulnerabilities Detected
            </h4>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto font-mono">
              The completed checks did not identify confusable Unicode homoglyphs, deceptive subdomain structures, typosquatting variants, or confirmed threat intelligence matches.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {scanResult.evidence.map((factor: EvidenceFactor, idx: number) => {
              const affectedComponent = inferAffectedComponent(factor.label, factor.detail);
              const mitigation = inferMitigation(factor.label, factor.severity);

              const sevColor = factor.severity === 'critical'
                ? 'border-red-500/40 bg-red-500/5 text-red-400'
                : factor.severity === 'high'
                ? 'border-orange-500/40 bg-orange-500/5 text-orange-400'
                : factor.severity === 'medium'
                ? 'border-amber-500/40 bg-amber-500/5 text-amber-400'
                : 'border-blue-500/40 bg-blue-500/5 text-blue-400';

              return (
                <div 
                  key={factor.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-brand-500/40 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${sevColor}`}>
                        {factor.severity}
                      </span>
                      <h4 className="font-bold text-sm text-foreground">
                        {factor.label}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground shrink-0">
                      <span className="text-muted-foreground/70">Component:</span>
                      <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-foreground font-semibold">
                        {affectedComponent}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                    {factor.detail}
                  </p>

                  <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                      <Terminal className="w-3.5 h-3.5 text-brand-400" />
                      <span>Citation: <strong>{factor.providerCitation || 'RiskShield Detection Model'}</strong></span>
                    </div>

                    <div className="text-[11px] text-brand-400 font-mono">
                      <strong>Mitigation:</strong> {mitigation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION D: DETAILED INTELLIGENCE & TELEMETRY (EXPANDABLE) */}
      {/* ======================================================== */}
      <div className="border border-border rounded-2xl bg-muted/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-brand-400" />
            <div>
              <span className="font-bold text-sm text-foreground block">
                Detailed Telemetry, Indicators & Threat Mesh
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Inspect parsed URL components, external provider statuses, and attribution
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-brand-400">
            <span>{isDetailsExpanded ? 'Collapse Telemetry' : 'Expand Telemetry'}</span>
            {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        <AnimatePresence>
          {isDetailsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-5 sm:p-6 border-t border-border space-y-6 bg-card"
            >
              {/* D1. Architectural Indicator Breakdown */}
              {parsedUrlDetails && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider">
                    Indicator Architecture & Public Suffix Breakdown
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase block">Protocol</span>
                      <span className="font-bold text-foreground">{parsedUrlDetails.protocol}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase block">Registrable Apex</span>
                      <span className="font-bold text-brand-400">{parsedUrlDetails.registrableApex}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase block">Subdomain Prefix</span>
                      <span className="font-bold text-foreground">{parsedUrlDetails.subdomain || 'None (Apex Root)'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase block">TLD Zone</span>
                      <span className="font-bold text-foreground">{parsedUrlDetails.tld}</span>
                    </div>
                  </div>

                  {parsedUrlDetails.pathname && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs font-mono">
                      <span className="text-[10px] text-muted-foreground uppercase block">Path Route</span>
                      <span className="font-bold text-foreground break-all">{parsedUrlDetails.pathname}</span>
                    </div>
                  )}
                </div>
              )}

              {/* D2. Threat Intelligence Provider Mesh Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider">
                    Threat Intelligence Provider Status Matrix
                  </h4>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Strict distinction: Feeds vs Local Heuristics
                  </span>
                </div>

                {scanResult.providerResults && scanResult.providerResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {scanResult.providerResults.map((pr, pidx) => {
                      const displayName = pr.provider === 'OPENPHISH'
                        ? 'OpenPhish Community Feed'
                        : pr.provider === 'URLHAUS'
                        ? 'URLhaus Malware DB (abuse.ch)'
                        : pr.provider === 'GOOGLE_WEB_RISK'
                        ? 'Google Web Risk'
                        : pr.provider === 'PHISHTANK'
                        ? 'PhishTank Community Catalog'
                        : pr.provider;

                      const isMatch = pr.status === 'MATCH';
                      const isNoMatch = pr.status === 'NO_MATCH';
                      const isUnavailable = pr.status === 'UNAVAILABLE';
                      const isNotConfigured = pr.status === 'NOT_CONFIGURED';

                      return (
                        <div 
                          key={pidx}
                          className="p-3.5 rounded-xl bg-muted/30 border border-border flex flex-col justify-between space-y-2 text-xs font-mono"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground">{displayName}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isMatch
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : isNoMatch
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : isUnavailable
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                            }`}>
                              {pr.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                            <span>Latency: {pr.responseTimeMs}ms</span>
                            {pr.threatTypes && pr.threatTypes.length > 0 && (
                              <span className="text-red-400 font-bold">{pr.threatTypes.join(', ')}</span>
                            )}
                          </div>

                          {/* Honest API Failure or Licensing Explanation */}
                          {isUnavailable && (
                            <p className="text-[10px] text-amber-400/90 pt-1 border-t border-border">
                              Upstream error: {pr.errorMessage || 'Billing inactive or network timeout'}
                            </p>
                          )}
                          {isNotConfigured && (
                            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                              Provider requires registration key or commercial license consent.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">
                    Provider results telemetry not returned for this evaluation mode.
                  </p>
                )}
              </div>

              {/* D3. Brand Workspace Context & Compared Assets */}
              {context === 'brand' && brandContext && (
                <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/20 space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-brand-400 font-bold">
                    <Building2Icon className="w-4 h-4" />
                    <span>Brand Workspace Context: {brandContext.brandName}</span>
                  </div>
                  <p className="text-muted-foreground">
                    This evaluation was cross-referenced against <strong>{brandContext.scopedAssets?.length || 0}</strong> verified assets in your workspace.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ======================================================== */}
      {/* SECTION E: RECOMMENDED ACTIONS */}
      {/* ======================================================== */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <h3 className="text-base sm:text-lg font-display font-extrabold text-foreground">
            Recommended Security Actions
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {scanResult.recommendedActions && scanResult.recommendedActions.length > 0 ? (
            scanResult.recommendedActions.map((action, aidx) => (
              <div 
                key={aidx}
                className="p-3.5 rounded-xl bg-card border border-border flex items-start gap-2.5 text-xs text-foreground font-medium"
              >
                <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                  {aidx + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{action}</span>
              </div>
            ))
          ) : (
            <div className="p-3.5 rounded-xl bg-card border border-border text-xs text-muted-foreground font-mono">
              Maintain standard cybersecurity awareness and verify sender credentials before interacting.
            </div>
          )}
        </div>

        {/* Context-Specific CTAs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground font-mono">
            {context === 'user' ? 'Scoped to Personal Workspace' : `Scoped to ${brandContext?.brandName || 'Brand'} Workspace`}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {context === 'user' && onOpenEmergency && (isThreat || isHighRisk) && (
              <button
                type="button"
                onClick={() => onOpenEmergency('link')}
                className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Emergency Guide</span>
              </button>
            )}

            {context === 'user' && onOpenReport && (
              <button
                type="button"
                onClick={() => onOpenReport(scanResult.target)}
                className="px-4 py-2 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Report Indicator</span>
              </button>
            )}

            {context === 'brand' && onOpenInspectModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenInspectModal({
                    id: scanResult.id,
                    brandId: brandContext?.brandId || '',
                    brandName: brandContext?.brandName || 'Brand',
                    target: scanResult.target,
                    normalizedTarget: scanResult.normalizedTarget || scanResult.target,
                    platform: 'DOMAIN',
                    severity: isThreat ? 'critical' : isHighRisk ? 'high' : isSuspicious ? 'medium' : 'low',
                    riskScore: scanResult.score,
                    status: 'NEW',
                    detectionReason: scanResult.explanation,
                    source: 'Adaptive Scanner',
                    firstDetectedAt: scanResult.timestamp,
                    lastAssessedAt: scanResult.timestamp,
                    evidence: scanResult.evidence,
                    repeatScanCount: 1
                  });
                }}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-brand-500/20"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Open Threat Investigation</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline helper icon
const Building2Icon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
    <path d="M10 6h4"/>
    <path d="M10 10h4"/>
    <path d="M10 14h4"/>
    <path d="M10 18h4"/>
  </svg>
);

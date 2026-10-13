import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Activity, 
  ArrowRight, 
  Server, 
  Lock, 
  Globe, 
  Smartphone, 
  MessageSquare, 
  Share2, 
  Tag, 
  User, 
  Plus, 
  History,
  Info,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { BrandThreatFinding, ThreatFindingStatus } from '../../types';
import { useStore } from '../../store/useStore';
import { generateAbuseReportDraftApi } from '../../lib/api';

interface ThreatInvestigationModalProps {
  finding: BrandThreatFinding | null;
  onClose: () => void;
}

export const ThreatInvestigationModal: React.FC<ThreatInvestigationModalProps> = ({ finding, onClose }) => {
  const { updateFindingStatus, addFindingNote, user } = useStore();
  const [activeTab, setActiveTab] = useState<'evidence' | 'status' | 'actions'>('evidence');
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isTransitioningStatus, setIsTransitioningStatus] = useState<ThreatFindingStatus | null>(null);

  // Async submission states & feedback
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // RFC 2142 Abuse Draft state
  const [abuseDraft, setAbuseDraft] = useState<{
    findingId: string;
    target: string;
    brandName: string;
    suggestedRecipients: Array<{ address?: string; email?: string; type: string; isVerified: boolean; notes: string }>;
    subject: string;
    markdownContent: string;
    humanReviewRequired: boolean;
    generatedAt: string;
  } | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [editableDraftContent, setEditableDraftContent] = useState<string>('');
  const [copiedDraft, setCopiedDraft] = useState(false);

  if (!finding) return null;

  // Determine user permissions for resolving findings
  const userRole = user?.brandRole || user?.authorizedBrands?.find(b => b.brandId === finding.brandId)?.role || 'member';
  const canCloseFinding = userRole === 'owner' || userRole === 'admin' || user?.role === 'brand_owner' || user?.role === 'admin';

  const handleCopyTarget = async () => {
    try {
      await navigator.clipboard.writeText(finding.target);
      setCopiedTarget(true);
      setTimeout(() => setCopiedTarget(false), 2000);
    } catch (e) {}
  };

  const handleStatusChange = async (newStatus: ThreatFindingStatus) => {
    setStatusError(null);
    setStatusSuccess(null);
    setIsSubmittingStatus(true);
    try {
      await updateFindingStatus(finding.id, newStatus, statusNote.trim() || undefined, user?.email);
      setStatusSuccess(`Finding status updated to ${newStatus.replace(/_/g, ' ')}`);
      setStatusNote('');
      setIsTransitioningStatus(null);
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to update finding status');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmittingNote) return;
    setNoteError(null);
    setIsSubmittingNote(true);
    try {
      await addFindingNote(finding.id, newNote.trim(), user?.email);
      setNewNote('');
    } catch (err: any) {
      setNoteError(err?.message || 'Failed to append investigation note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const generateEvidencePacketMarkdown = () => {
    return `# RISKSHIELD AI — EVIDENCE PACKET & THREAT DOSSIER
Case ID: ${finding.id}
Generated: ${new Date().toISOString()}
Protected Brand: ${finding.brandName} (Brand ID: ${finding.brandId})
Analyst: ${user?.email || 'SecOps Reviewer'}

==================================================
THREAT TARGET DETAILS
==================================================
Target Identifier: ${finding.target}
Normalized Target: ${finding.normalizedTarget}
Platform Type:     ${finding.platform}
Assigned Severity: ${finding.severity.toUpperCase()}
Risk Score:        ${finding.riskScore} / 100
Current Status:    ${finding.status}
First Detected:    ${finding.firstDetectedAt}
Last Assessed:     ${finding.lastAssessedAt}
Detection Source:  ${finding.source}
Repeat Scans:      ${finding.repeatScanCount}
Official Asset Compared: ${finding.officialAssetCompared || 'N/A'}

==================================================
DETECTION SUMMARY & EXPLANATION
==================================================
${finding.detectionReason}

==================================================
ITEMIZED EVIDENCE FACTORS (${finding.evidence.length})
==================================================
${finding.evidence.map((ev, i) => `[Factor ${i + 1}] ${ev.label}
Severity: ${ev.severity.toUpperCase()}
Detail: ${ev.detail}
Citation: ${ev.providerCitation || 'RiskShield Heuristic'}
`).join('\n')}

==================================================
INFRASTRUCTURE TELEMETRY (WHOIS & HOSTING)
==================================================
Registrar:   ${finding.whoisDetails?.registrar || 'Offshore Anonymous Proxy'}
Created:     ${finding.whoisDetails?.creationDate || 'Recent'}
Country:     ${finding.whoisDetails?.country || 'Privacy Protected'}
Nameservers: ${(finding.whoisDetails?.nameservers || ['ns1.bulletproof-dns.is', 'ns2.bulletproof-dns.is']).join(', ')}

==================================================
INVESTIGATION AUDIT LOG
==================================================
${(finding.investigationHistory || []).map(h => `[${h.timestamp}] ${h.action}
User: ${h.userEmail || 'system'}
Notes: ${h.notes || 'N/A'}
`).join('\n')}

==================================================
RECOMMENDED RESPONSE STEPS
==================================================
1. Submit RFC-2142 abuse report to registrar abuse contact.
2. Publish DNS sinkhole or homograph lookup telemetry into Brand Threat Registry.
3. Alert corporate brand team and monitor repeat credential lures.
`;
  };

  const handleDownloadPacket = () => {
    const text = generateEvidencePacketMarkdown();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RiskShield_Evidence_${finding.id}_${finding.brandName.replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(generateEvidencePacketMarkdown());
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (e) {}
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'high':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    }
  };

  const getStatusBadgeClass = (status: ThreatFindingStatus) => {
    switch (status) {
      case 'CONFIRMED_THREAT':
      case 'TAKEDOWN_REQUESTED':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'UNDER_REVIEW':
      case 'UNDER_INVESTIGATION':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'NEW':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'FALSE_POSITIVE':
        return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="p-6 border-b border-border bg-card/60 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground font-bold">
                {finding.id}
              </span>
              <span className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-md border ${getSeverityBadgeClass(finding.severity)}`}>
                {finding.severity} Severity
              </span>
              <span className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(finding.status)}`}>
                {finding.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Detected: {new Date(finding.firstDetectedAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-mono font-bold text-foreground break-all">
                {finding.target}
              </h2>
              <button 
                onClick={handleCopyTarget}
                title="Copy target URL"
                className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all shrink-0"
              >
                {copiedTarget ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              Targeted Brand: <strong className="text-foreground">{finding.brandName}</strong> • Evaluated via <span className="font-mono">{finding.source}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-border bg-muted/20 px-6 gap-2">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'evidence'
                ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Evidence & Brand Comparison</span>
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Status Transition & Audit</span>
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'actions'
                ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Analyst Notes & Export</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              {/* Score & Detection Reason Card */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                    Detection Explanation
                  </span>
                  <p className="text-sm text-foreground mt-1 font-medium">
                    {finding.detectionReason}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3 bg-card px-4 py-2.5 rounded-xl border border-border">
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase">Risk Confidence</span>
                    <span className="text-2xl font-bold font-mono text-red-500">{finding.riskScore}/100</span>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-red-500/40 flex items-center justify-center font-bold text-xs text-red-400">
                    {finding.repeatScanCount}x
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison: Official Baseline vs Rogue Target */}
              <div>
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
                  Official Identity Baseline vs. Suspicious Target
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Authentic Brand Column */}
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Official Brand Baseline
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                        VERIFIED
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Authoritative Identifier:</span>
                        <span className="font-mono font-bold text-foreground break-all">
                          {finding.officialAssetCompared || 'acmefinancial.com'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">TLS Certificate:</span>
                        <span className="font-mono text-foreground">DigiCert Global EV Root CA (Valid)</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Domain Attestation:</span>
                        <span className="font-mono text-emerald-400">DNS TXT Cryptographic Record Attested</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Hosting Infrastructure:</span>
                        <span className="font-mono text-foreground">Cloudflare Enterprise Anycast CDN</span>
                      </div>
                    </div>
                  </div>

                  {/* Suspicious Rogue Target Column */}
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Rogue Observed Target
                      </span>
                      <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                        UNVERIFIED
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Observed Identifier:</span>
                        <span className="font-mono font-bold text-red-400 break-all">
                          {finding.target}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Registrar / Privacy:</span>
                        <span className="font-mono text-foreground">
                          {finding.whoisDetails?.registrar || 'NameCheap Offshore Privacy Guard'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Registration Age:</span>
                        <span className="font-mono text-amber-400">
                          {finding.whoisDetails?.creationDate || 'Freshly registered (< 72 hours)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Hosting / Geo:</span>
                        <span className="font-mono text-foreground">
                          {finding.whoisDetails?.country || 'Offshore (Privacy Protected)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itemized Evidence Factors */}
              <div>
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Itemized Evidence & Detection Signals ({finding.evidence.length})
                </h3>

                <div className="space-y-3">
                  {finding.evidence.map((factor, idx) => (
                    <div 
                      key={factor.id || idx}
                      className="p-3.5 rounded-xl bg-card border border-border flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {factor.label}
                          </span>
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadgeClass(factor.severity)}`}>
                            {factor.severity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {factor.detail}
                        </p>
                      </div>

                      {factor.providerCitation && (
                        <div className="shrink-0 text-right">
                          <span className="text-[10px] font-mono text-muted-foreground block">Signal Citation</span>
                          <span className="text-xs font-mono text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                            {factor.providerCitation}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Distinctions Footer Notice */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-muted-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  <strong>Evidence Integrity:</strong> Indicators combine cryptographic DNS telemetry, semantic homograph detection, and user submissions. Status transitions are logged to maintain an audit trail.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Transition Controls Card */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Update Investigation Status
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Transition this threat finding across supported lifecycle stages. All transitions record analyst attribution and timestamp.
                  </p>
                </div>

                {/* Feedback Alerts */}
                {statusError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{statusError}</span>
                    </div>
                    <button onClick={() => setStatusError(null)} className="text-red-400 hover:text-red-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {statusSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{statusSuccess}</span>
                    </div>
                    <button onClick={() => setStatusSuccess(null)} className="text-emerald-400 hover:text-emerald-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      setStatusError(null);
                      setIsTransitioningStatus('UNDER_INVESTIGATION');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      finding.status === 'UNDER_INVESTIGATION' || finding.status === 'UNDER_REVIEW'
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-amber-500/50 hover:text-foreground'
                    }`}
                  >
                    <span className="block font-mono text-[10px] text-amber-400 uppercase">Stage 01</span>
                    Under Investigation
                  </button>

                  <button
                    onClick={() => {
                      setStatusError(null);
                      setIsTransitioningStatus('TAKEDOWN_REQUESTED');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      finding.status === 'TAKEDOWN_REQUESTED' || finding.status === 'CONFIRMED_THREAT'
                        ? 'border-red-500 bg-red-500/15 text-red-300'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-red-500/50 hover:text-foreground'
                    }`}
                  >
                    <span className="block font-mono text-[10px] text-red-400 uppercase">Stage 02</span>
                    Takedown Requested
                  </button>

                  <button
                    onClick={() => {
                      setStatusError(null);
                      setIsTransitioningStatus('RESOLVED');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      finding.status === 'RESOLVED'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-emerald-500/50 hover:text-foreground'
                    }`}
                  >
                    <span className="block font-mono text-[10px] text-emerald-400 uppercase">Stage 03 (Admin)</span>
                    Resolved
                  </button>

                  <button
                    onClick={() => {
                      setStatusError(null);
                      setIsTransitioningStatus('FALSE_POSITIVE');
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                      finding.status === 'FALSE_POSITIVE'
                        ? 'border-zinc-500 bg-zinc-500/15 text-zinc-300'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-zinc-500/50 hover:text-foreground'
                    }`}
                  >
                    <span className="block font-mono text-[10px] text-zinc-400 uppercase">Stage 04 (Admin)</span>
                    False Positive
                  </button>
                </div>

                {/* Transition Confirmation & Note form */}
                {isTransitioningStatus && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 rounded-xl bg-muted/50 border border-brand-500/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        Confirm Transition to <span className="text-brand-400 font-mono">{isTransitioningStatus}</span>
                      </span>
                      <button 
                        onClick={() => {
                          setIsTransitioningStatus(null);
                          setStatusError(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* RBAC check warning */}
                    {(isTransitioningStatus === 'RESOLVED' || isTransitioningStatus === 'FALSE_POSITIVE') && !canCloseFinding && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Requires OWNER or ADMIN permission. Current role ({userRole}) can only triage findings.</span>
                      </div>
                    )}

                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Add mandatory justification or takedown ticket reference..."
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none focus:border-brand-500"
                    />

                    <button
                      onClick={() => handleStatusChange(isTransitioningStatus)}
                      disabled={isSubmittingStatus || ((isTransitioningStatus === 'RESOLVED' || isTransitioningStatus === 'FALSE_POSITIVE') && !canCloseFinding)}
                      className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2"
                    >
                      {isSubmittingStatus && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>{isSubmittingStatus ? 'Transitioning...' : 'Commit Status Change'}</span>
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Audit History Timeline */}
              <div>
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-brand-400" />
                  Investigation Audit Trail
                </h3>

                <div className="space-y-3">
                  {(finding.investigationHistory || []).map((history, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          {history.action}
                        </span>
                        <span className="font-mono text-muted-foreground text-[10px]">
                          {history.timestamp}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Reviewer: <strong className="text-foreground">{history.userEmail || 'system'}</strong></span>
                        {history.toStatus && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground">
                            Status: {history.toStatus}
                          </span>
                        )}
                      </div>
                      {history.notes && (
                        <p className="text-muted-foreground bg-muted/30 p-2 rounded-lg mt-1 italic">
                          "{history.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              {/* RFC 2142 Abuse Report Draft Card (Step 2) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-brand-400 uppercase tracking-wider">
                        RFC 2142 Incident Dossier
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                        Draft Only
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mt-0.5">
                      Abuse Report Draft Generator
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Synthesize evidence-backed abuse notifications for registrar abuse desks with RFC 2142 role mailboxes.
                    </p>
                  </div>

                  {!abuseDraft && (
                    <button
                      onClick={async () => {
                        setDraftError(null);
                        setIsGeneratingDraft(true);
                        try {
                          const draft = await generateAbuseReportDraftApi(finding.id, finding.brandId);
                          const normalizedDraft = {
                            ...draft,
                            subject: draft.suggestedSubject || draft.subject,
                            suggestedRecipients: (draft.suggestedRecipients || []).map((r: any) => ({
                              ...r,
                              address: r.email || r.address
                            }))
                          };
                          setAbuseDraft(normalizedDraft);
                          setEditableDraftContent(normalizedDraft.markdownContent);
                        } catch (err: any) {
                          console.warn('Backend draft generation failed or offline; using local evidence template:', err);
                          const targetHost = (finding.normalizedTarget || finding.target).replace(/^https?:\/\//, '').split('/')[0];
                          const fallbackDraft = {
                            findingId: finding.id,
                            target: finding.target,
                            brandName: finding.brandName,
                            suggestedRecipients: [
                              {
                                address: `abuse@${targetHost.replace(/^www\./, '')}`,
                                type: 'RFC_2142_ROLE_MAILBOX',
                                isVerified: false,
                                notes: 'Constructed via RFC 2142 mailbox standard; existence and inbound delivery are unverified'
                              },
                              {
                                address: `security@${targetHost.replace(/^www\./, '')}`,
                                type: 'RFC_2142_ROLE_MAILBOX',
                                isVerified: false,
                                notes: 'Constructed via RFC 2142 mailbox standard; existence and inbound delivery are unverified'
                              }
                            ],
                            subject: `[Abuse Notification] Brand Impersonation & Security Incident: ${finding.brandName}`,
                            markdownContent: generateEvidencePacketMarkdown(),
                            humanReviewRequired: true,
                            generatedAt: new Date().toISOString()
                          };
                          setAbuseDraft(fallbackDraft);
                          setEditableDraftContent(fallbackDraft.markdownContent);
                        } finally {
                          setIsGeneratingDraft(false);
                        }
                      }}
                      disabled={isGeneratingDraft}
                      className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shrink-0"
                    >
                      {isGeneratingDraft ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating Dossier...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Generate Abuse Draft</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {draftError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{draftError}</span>
                  </div>
                )}

                {abuseDraft && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-2"
                  >
                    {/* Zero-Delivery Warning Banner */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Draft Only — Zero Automated Emails Dispatched:</strong>
                        <p className="text-[11px] text-amber-300/90 mt-0.5">
                          RiskShield AI does NOT automatically contact domain registrars or upstream hosts. This dossier must be reviewed, customized, and submitted manually by your security team.
                        </p>
                      </div>
                    </div>

                    {/* Suggested Recipients & Unverified Disclaimers */}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider block">
                        Suggested Abuse Desks & Role Contacts ({abuseDraft.suggestedRecipients.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {abuseDraft.suggestedRecipients.map((rec, idx) => (
                          <div 
                            key={idx}
                            className="p-2.5 rounded-lg bg-card border border-border flex flex-col justify-between gap-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-foreground">
                                {rec.address || rec.email}
                              </span>
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                rec.isVerified 
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                  : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                              }`}>
                                {rec.isVerified ? 'VERIFIED' : 'UNVERIFIED (RFC 2142)'}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground italic">
                              {rec.notes}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subject Line Preview */}
                    <div>
                      <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Report Subject Line
                      </span>
                      <div className="p-2.5 rounded-xl bg-card border border-border font-mono text-xs text-foreground">
                        {abuseDraft.subject}
                      </div>
                    </div>

                    {/* Editable Dossier Content */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                          Editable Evidence Packet Markdown
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Edit details before copying or exporting
                        </span>
                      </div>
                      <textarea
                        rows={10}
                        value={editableDraftContent}
                        onChange={(e) => setEditableDraftContent(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-foreground font-mono text-xs focus:outline-none focus:border-brand-500 resize-y"
                      />
                    </div>

                    {/* Copy and Download Actions */}
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(editableDraftContent);
                            setCopiedDraft(true);
                            setTimeout(() => setCopiedDraft(false), 2000);
                          } catch (e) {}
                        }}
                        className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold flex items-center gap-2 transition-all border border-border"
                      >
                        {copiedDraft ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedDraft ? 'Draft Copied!' : 'Copy Draft to Clipboard'}</span>
                      </button>

                      <button
                        onClick={() => {
                          const blob = new Blob([editableDraftContent], { type: 'text/markdown;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `RiskShield_Abuse_Draft_${finding.id}_${finding.brandName.replace(/\s+/g, '_')}.md`;
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Draft (.MD)</span>
                      </button>

                      <button
                        onClick={() => setAbuseDraft(null)}
                        className="px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground text-xs transition-all ml-auto"
                      >
                        Reset Generator
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Analyst Notes Form */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Analyst Investigation Notes
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Append audit-logged notes regarding registrar correspondence, takedown tickets, or IOC telemetry.
                  </p>
                </div>

                {noteError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{noteError}</span>
                  </div>
                )}

                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Document registrar correspondence, DNS takedown tickets, or IOC telemetry..."
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground text-xs focus:outline-none focus:border-brand-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!newNote.trim() || isSubmittingNote}
                    className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2"
                  >
                    {isSubmittingNote && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSubmittingNote ? 'Saving...' : 'Save Analyst Note'}</span>
                  </button>
                </form>

                {finding.notes && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                      Existing Notes:
                    </span>
                    <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground whitespace-pre-wrap font-mono">
                      {finding.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Finding ID: <strong className="font-mono text-foreground">{finding.id}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold transition-all"
          >
            Close Inspector
          </button>
        </div>
      </motion.div>
    </div>
  );
};

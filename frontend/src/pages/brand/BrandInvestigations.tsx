import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  ExternalLink,
  Activity,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useBrandDashboard } from './BrandDashboardLayout';
import { BrandThreatFinding, ThreatFindingStatus } from '../../types';

export const BrandInvestigations: React.FC = () => {
  const { openInspectModal } = useBrandDashboard();
  const { 
    activeBrandId, 
    registeredBrands, 
    brandThreatFindings, 
    updateFindingStatus,
    user
  } = useStore();

  const activeBrand = registeredBrands.find(b => b.id === activeBrandId) || registeredBrands[0] || (user?.brandName ? {
    id: user.brandId || 'user-brand',
    name: user.brandName,
    slug: (user.brandName || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    logoInitial: (user.brandName || 'B').slice(0, 2).toUpperCase(),
    accentColor: '#FF5500',
    category: 'Company & Product',
    description: '',
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
  } : undefined);

  const scopedFindings = useMemo(() => {
    return brandThreatFindings.filter(f => f.brandId === activeBrand?.id || f.brandName === activeBrand?.name);
  }, [brandThreatFindings, activeBrand]);

  const [activeStage, setActiveStage] = useState<'ALL' | 'UNDER_INVESTIGATION' | 'NEW' | 'TAKEDOWN_REQUESTED' | 'RESOLVED' | 'FALSE_POSITIVE'>('ALL');

  // Grouped by stage for workflow columns
  const underInvestigation = useMemo(() => {
    return scopedFindings.filter(f => f.status === 'UNDER_INVESTIGATION' || f.status === 'UNDER_REVIEW');
  }, [scopedFindings]);
  const newCases = useMemo(() => {
    return scopedFindings.filter(f => f.status === 'NEW');
  }, [scopedFindings]);
  const takedownRequested = useMemo(() => {
    return scopedFindings.filter(f => f.status === 'TAKEDOWN_REQUESTED' || f.status === 'CONFIRMED_THREAT');
  }, [scopedFindings]);
  const resolvedCases = useMemo(() => {
    return scopedFindings.filter(f => f.status === 'RESOLVED');
  }, [scopedFindings]);
  const falsePositives = useMemo(() => {
    return scopedFindings.filter(f => f.status === 'FALSE_POSITIVE');
  }, [scopedFindings]);

  const stageFiltered = useMemo(() => {
    if (activeStage === 'ALL') return scopedFindings;
    if (activeStage === 'UNDER_INVESTIGATION') return underInvestigation;
    if (activeStage === 'TAKEDOWN_REQUESTED') return takedownRequested;
    if (activeStage === 'NEW') return newCases;
    if (activeStage === 'RESOLVED') return resolvedCases;
    if (activeStage === 'FALSE_POSITIVE') return falsePositives;
    return scopedFindings;
  }, [scopedFindings, activeStage, underInvestigation, takedownRequested, newCases, resolvedCases, falsePositives]);

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

  return (
    <div className="space-y-8 lg:space-y-10 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="rounded-3xl bg-card border border-border p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase">
              Brand Threat Investigations
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground">
              {activeBrand.name} Case Review
            </span>
          </div>
          <h2 className="text-2xl font-display font-black text-foreground tracking-tight">
            Lifecycle & RFC-2142 Abuse Packets
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage evidence-backed threat investigations, official vs. rogue comparisons, and audit dossiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-center">
            <span className="text-[10px] font-mono text-muted-foreground uppercase block">Pending Decisions</span>
            <span className="text-lg font-bold font-mono text-amber-400">{underInvestigation.length} Active</span>
          </div>
        </div>
      </div>

      {/* Stage Selector Pills */}
      <div className="flex p-1.5 bg-card border border-border rounded-2xl w-fit gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveStage('ALL')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeStage === 'ALL'
              ? 'bg-muted text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>All Investigations ({scopedFindings.length})</span>
        </button>
        <button
          onClick={() => setActiveStage('UNDER_INVESTIGATION')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeStage === 'UNDER_INVESTIGATION'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Under Investigation ({underInvestigation.length})</span>
        </button>
        <button
          onClick={() => setActiveStage('NEW')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeStage === 'NEW'
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>New Detections ({newCases.length})</span>
        </button>
        <button
          onClick={() => setActiveStage('TAKEDOWN_REQUESTED')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeStage === 'TAKEDOWN_REQUESTED'
              ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span>Takedowns ({takedownRequested.length})</span>
        </button>
        <button
          onClick={() => setActiveStage('RESOLVED')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeStage === 'RESOLVED'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Resolved ({resolvedCases.length})</span>
        </button>
        <button
          onClick={() => setActiveStage('FALSE_POSITIVE')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeStage === 'FALSE_POSITIVE'
              ? 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          <span>False Positives ({falsePositives.length})</span>
        </button>
      </div>

      {/* Cases Grid */}
      {stageFiltered.length === 0 ? (
        <div className="p-16 rounded-3xl bg-card border border-border text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-75" />
          <h3 className="text-sm font-bold text-foreground">
            No investigations in this stage
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All cases in this category have been processed or none currently exist for {activeBrand.name}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {stageFiltered.map((finding) => (
            <div
              key={finding.id}
              className="p-6 rounded-3xl bg-card border border-border hover:border-brand-500/40 shadow-sm transition-all space-y-5 flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                      {finding.id}
                    </span>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadgeClass(finding.severity)}`}>
                      {finding.severity}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold text-red-500">
                    Risk: {finding.riskScore}/100
                  </span>
                </div>

                {/* Target Title */}
                <div>
                  <h3 className="text-sm sm:text-base font-mono font-bold text-foreground break-all group-hover:text-brand-400 transition-colors">
                    {finding.target}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {finding.detectionReason}
                  </p>
                </div>

                {/* Comparison Snapshot */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs space-y-2 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Official Baseline:</span>
                    <span className="text-emerald-400 font-bold truncate max-w-[180px]">
                      {finding.officialAssetCompared || 'acmefinancial.com'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Detection Source:</span>
                    <span className="text-foreground truncate max-w-[180px]">
                      {finding.source}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Evidence Strength:</span>
                    <span className="text-brand-400 font-bold">
                      {finding.evidence.length} Documented Factors
                    </span>
                  </div>
                </div>

                {/* Analyst Notes Snippet */}
                {finding.notes && (
                  <p className="text-[11px] text-muted-foreground italic line-clamp-1 border-l-2 border-brand-500/50 pl-2">
                    "{finding.notes.split('\n')[0]}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3.5 border-t border-border flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Status: <strong className="text-foreground">{finding.status.replace(/_/g, ' ')}</strong>
                </span>

                <button
                  onClick={() => openInspectModal(finding)}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-white border border-brand-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>Open Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrandInvestigations;

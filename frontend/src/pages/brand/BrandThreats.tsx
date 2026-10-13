import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ShieldAlert, 
  ArrowUpDown, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Globe,
  Smartphone,
  Share2,
  MessageSquare
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useBrandDashboard } from './BrandDashboardLayout';
import { ThreatFindingStatus, ThreatSeverity, ThreatPlatform } from '../../types';

export const BrandThreats: React.FC = () => {
  const { openInspectModal } = useBrandDashboard();
  const { activeBrandId, registeredBrands, brandThreatFindings } = useStore();

  const { user } = useStore();
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

  // Scoped Findings for active brand
  const scopedFindings = useMemo(() => {
    return brandThreatFindings.filter(f => f.brandId === activeBrand?.id || f.brandName === activeBrand?.name);
  }, [brandThreatFindings, activeBrand]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'severity' | 'score' | 'last_assessed'>('newest');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtered & Sorted Findings
  const filteredFindings = useMemo(() => {
    return scopedFindings.filter((item) => {
      // Search
      const matchesSearch = 
        item.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.normalizedTarget.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.detectionReason.toLowerCase().includes(searchTerm.toLowerCase());

      // Severity
      const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter.toLowerCase();

      // Platform
      const matchesPlatform = platformFilter === 'ALL' || item.platform === platformFilter;

      // Status
      let matchesStatus = statusFilter === 'ALL';
      if (!matchesStatus) {
        if (statusFilter === 'UNDER_INVESTIGATION' || statusFilter === 'UNDER_REVIEW') {
          matchesStatus = item.status === 'UNDER_INVESTIGATION' || item.status === 'UNDER_REVIEW';
        } else if (statusFilter === 'TAKEDOWN_REQUESTED' || statusFilter === 'CONFIRMED_THREAT') {
          matchesStatus = item.status === 'TAKEDOWN_REQUESTED' || item.status === 'CONFIRMED_THREAT';
        } else {
          matchesStatus = item.status === statusFilter;
        }
      }

      return matchesSearch && matchesSeverity && matchesPlatform && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.firstDetectedAt).getTime() - new Date(a.firstDetectedAt).getTime();
      }
      if (sortBy === 'severity') {
        const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (rank[b.severity] || 0) - (rank[a.severity] || 0);
      }
      if (sortBy === 'score') {
        return b.riskScore - a.riskScore;
      }
      if (sortBy === 'last_assessed') {
        return new Date(b.lastAssessedAt).getTime() - new Date(a.lastAssessedAt).getTime();
      }
      return 0;
    });
  }, [scopedFindings, searchTerm, severityFilter, platformFilter, statusFilter, sortBy]);

  // Paginated Results
  const totalPages = Math.ceil(filteredFindings.length / itemsPerPage) || 1;
  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFindings.slice(start, start + itemsPerPage);
  }, [filteredFindings, currentPage]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {}
  };

  const getSeverityBadge = (severity: ThreatSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'high':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    }
  };

  const getStatusBadge = (status: ThreatFindingStatus) => {
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

  const clearFilters = () => {
    setSearchTerm('');
    setSeverityFilter('ALL');
    setPlatformFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered = searchTerm !== '' || severityFilter !== 'ALL' || platformFilter !== 'ALL' || statusFilter !== 'ALL';

  return (
    <div className="space-y-8 lg:space-y-10 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-card border border-border p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold text-red-500 uppercase">
              Brand Threat Register
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground">
              {activeBrand.name} Digital Identity
            </span>
          </div>
          <h2 className="text-2xl font-display font-black text-foreground tracking-tight">
            Impersonation & Lookalike Indicators
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active threat catalog containing {scopedFindings.length} recorded items for {activeBrand.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono text-muted-foreground uppercase block">Active Scope</span>
            <span className="text-sm font-bold font-mono text-foreground">
              {filteredFindings.length} / {scopedFindings.length} Matched
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl bg-card border border-border p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-center gap-3.5">
          {/* Search Input */}
          <div className="relative w-full lg:flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by URL, domain, handle, or threat keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-brand-500 font-mono transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-bold focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">Severity: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-bold focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">Platform: All</option>
              <option value="DOMAIN">Domains / Web</option>
              <option value="SOCIAL">Social Profiles</option>
              <option value="MESSAGING">Messaging Links</option>
              <option value="MOBILE_APP">Mobile Apps</option>
              <option value="MARKETPLACE">Marketplaces</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-bold focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">Status: All</option>
              <option value="NEW">New</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="TAKEDOWN_REQUESTED">Takedown Requested</option>
              <option value="RESOLVED">Resolved</option>
              <option value="FALSE_POSITIVE">False Positive</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-bold focus:outline-none focus:border-brand-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="severity">Sort: Severity High-Low</option>
              <option value="score">Sort: Risk Score</option>
              <option value="last_assessed">Sort: Last Assessed</option>
            </select>

            {isFiltered && (
              <button
                onClick={clearFilters}
                className="px-3.5 py-2.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-all"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Threats Table */}
      <div className="rounded-3xl bg-card border border-border shadow-sm overflow-hidden">
        {paginatedFindings.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">
              No matching threat findings
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {isFiltered 
                ? 'Try adjusting your search query, severity, or platform filters.' 
                : `No threats currently cataloged under ${activeBrand.name}.`}
            </p>
            {isFiltered && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold"
              >
                Clear Active Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-mono text-[10px] uppercase">
                  <th className="py-3.5 px-5 font-bold">Target Identifier</th>
                  <th className="py-3.5 px-5 font-bold">Platform</th>
                  <th className="py-3.5 px-5 font-bold">Severity</th>
                  <th className="py-3.5 px-5 font-bold">Risk Score</th>
                  <th className="py-3.5 px-5 font-bold">Evidence Factors</th>
                  <th className="py-3.5 px-5 font-bold">First Detected</th>
                  <th className="py-3.5 px-5 font-bold">Status</th>
                  <th className="py-3.5 px-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedFindings.map((finding) => (
                  <tr 
                    key={finding.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => openInspectModal(finding)}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground max-w-[220px] sm:max-w-[260px] truncate block">
                          {finding.target}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(finding.id, finding.target);
                          }}
                          title="Copy target"
                          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {copiedId === finding.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {finding.detectionReason}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-muted-foreground font-medium">
                      {finding.platform}
                    </td>

                    <td className="py-4 px-5">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge(finding.severity)}`}>
                        {finding.severity}
                      </span>
                    </td>

                    <td className="py-4 px-5 font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full bg-red-500" 
                            style={{ width: `${finding.riskScore}%` }} 
                          />
                        </div>
                        <span className="text-foreground">{finding.riskScore}/100</span>
                      </div>
                    </td>

                    <td className="py-4 px-5 font-mono text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded font-bold text-foreground">
                        {finding.evidence.length} Signals
                      </span>
                    </td>

                    <td className="py-4 px-5 text-muted-foreground font-mono text-[11px]">
                      {new Date(finding.firstDetectedAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-5">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(finding.status)}`}>
                        {finding.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInspectModal(finding);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-card border border-border hover:border-brand-500 text-foreground font-bold text-[11px] transition-all shadow-sm"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 sm:p-5 border-t border-border bg-card/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong> ({filteredFindings.length} items)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-card border border-border disabled:opacity-40 text-foreground hover:bg-muted transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-card border border-border disabled:opacity-40 text-foreground hover:bg-muted transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandThreats;

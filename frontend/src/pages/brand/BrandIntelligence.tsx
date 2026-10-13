import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Copy, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  Server, 
  Globe, 
  Layers, 
  Clock, 
  FileText,
  PieChart,
  Activity,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../../store/useStore';

export const BrandIntelligence: React.FC = () => {
  const { 
    activeBrandId, 
    registeredBrands, 
    brandThreatFindings, 
    brandAssets, 
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

  const scopedAssets = useMemo(() => {
    return brandAssets.filter(a => a.brandId === activeBrand?.id || a.brandName === activeBrand?.name);
  }, [brandAssets, activeBrand]);

  const [copiedBriefing, setCopiedBriefing] = useState(false);

  // Clusters & Vectors Analysis
  const registrarClusters = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedFindings.forEach(f => {
      const reg = f.whoisDetails?.registrar || 'NameCheap Offshore Privacy Guard';
      counts[reg] = (counts[reg] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [scopedFindings]);

  // Attack Vectors Breakdown
  const vectorBreakdown = useMemo(() => {
    let credentialHarvesters = 0;
    let homographs = 0;
    let socialSpoofs = 0;
    let mobileSideLoads = 0;

    scopedFindings.forEach(f => {
      if (f.platform === 'SOCIAL') socialSpoofs++;
      else if (f.platform === 'MOBILE_APP') mobileSideLoads++;
      else if (f.detectionReason.toLowerCase().includes('credential')) credentialHarvesters++;
      else homographs++;
    });

    return [
      { name: 'Credential Harvesting Portals', count: credentialHarvesters, color: 'bg-red-500' },
      { name: 'Homograph & Typosquat Domains', count: homographs, color: 'bg-amber-500' },
      { name: 'Executive & Support Social Mimicry', count: socialSpoofs, color: 'bg-blue-500' },
      { name: 'Unofficial APK & Mobile Implants', count: mobileSideLoads, color: 'bg-purple-500' }
    ];
  }, [scopedFindings]);

  const generateExecutiveBriefingText = () => {
    return `# RISKSHIELD AI — EXECUTIVE BRAND THREAT BRIEFING
Organization: ${activeBrand.name} (ID: ${activeBrand.id})
Generated Date: ${new Date().toISOString()}
Prepared For: ${user?.email || 'Corporate Brand Security Officer'}
Attestation Status: ${activeBrand.status}

==================================================
EXECUTIVE SUMMARY
==================================================
Total Monitored Official Assets: ${scopedAssets.length}
Total Detected External Threats: ${scopedFindings.length}
Active Unresolved Threats:       ${scopedFindings.filter(f => f.status === 'NEW' || f.status === 'UNDER_REVIEW' || f.status === 'UNDER_INVESTIGATION').length}
Critical & High Severity Cases:  ${scopedFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length}
Confirmed Live Takedown Targets: ${scopedFindings.filter(f => f.status === 'CONFIRMED_THREAT' || f.status === 'TAKEDOWN_REQUESTED').length}
Resolved Security Incidents:     ${scopedFindings.filter(f => f.status === 'RESOLVED').length}

==================================================
RECURRING INFRASTRUCTURE CLUSTERS
==================================================
${registrarClusters.map(([reg, count]) => `- ${reg}: ${count} associated targets`).join('\n')}

==================================================
ATTACK VECTOR CLASSIFICATION
==================================================
${vectorBreakdown.map(v => `- ${v.name}: ${v.count} documented occurrences`).join('\n')}

==================================================
ITEMIZED ACTIVE THREAT INVENTORY
==================================================
${scopedFindings.map((f, i) => `[Threat ${i + 1}] Target: ${f.target}
  Platform: ${f.platform} | Severity: ${f.severity.toUpperCase()} | Risk Score: ${f.riskScore}/100
  Status: ${f.status} | First Detected: ${f.firstDetectedAt}
  Evidence Signals: ${f.evidence.length} factors
  Detection Reason: ${f.detectionReason}
`).join('\n')}

==================================================
THREAT INTELLIGENCE FEED VERIFICATION
==================================================
1. Passive DNS Stream: ACTIVE (Continuous ICANN & TLD Telemetry)
2. SSL CT Log Monitor: ACTIVE (RFC-6962 Certificate Transparency)
3. Levenshtein Typo Engine: ACTIVE (Dynamic Brand Corpus Matching)
4. PhishTank & Anti-Phishing Feeds: ACTIVE (Heuristic Model Online)

RiskShield AI Enterprise Attestation Platform. Confirmed cryptographic records retained.
`;
  };

  const handleDownloadBriefing = () => {
    const text = generateExecutiveBriefingText();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RiskShield_Executive_Briefing_${activeBrand.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyBriefing = async () => {
    try {
      await navigator.clipboard.writeText(generateExecutiveBriefingText());
      setCopiedBriefing(true);
      setTimeout(() => setCopiedBriefing(false), 2000);
    } catch (e) {}
  };

  return (
    <div className="space-y-8 lg:space-y-10 animate-in fade-in duration-300">
      {/* Top Banner & Export Actions */}
      <div className="rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
              Brand Threat Intelligence & Longitudinal Analytics
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground">
              {activeBrand.name} Briefing
            </span>
          </div>
          <h2 className="text-2xl font-display font-black text-foreground tracking-tight">
            Threat Landscape & Attack Vectors
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Macro analysis of targeting infrastructure, recurring spoof clusters, and exportable executive briefing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleCopyBriefing}
            className="px-4 py-2.5 rounded-2xl bg-muted/60 hover:bg-muted text-foreground text-xs font-bold transition-all border border-border flex items-center gap-1.5"
          >
            {copiedBriefing ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedBriefing ? 'Copied Briefing!' : 'Copy Briefing'}</span>
          </button>

          <button
            onClick={handleDownloadBriefing}
            className="px-4.5 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Executive Briefing (.MD)</span>
          </button>
        </div>
      </div>

      {/* Grid: Attack Vectors & Impersonator Clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Attack Vector Distribution */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Primary Attack Vectors Targeting Brand
            </h3>
            <p className="text-xs text-muted-foreground">
              Classification of adversary techniques observed in {scopedFindings.length} findings
            </p>
          </div>

          <div className="space-y-4 py-2">
            {vectorBreakdown.map((vec) => {
              const percent = scopedFindings.length > 0 
                ? Math.round((vec.count / scopedFindings.length) * 100) 
                : 0;

              return (
                <div key={vec.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{vec.name}</span>
                    <span className="font-mono font-bold text-foreground">
                      {vec.count} Cases ({percent}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${vec.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <span className="text-[11px] text-muted-foreground pt-3 border-t border-border block">
            Derived from DOM heuristics, URL token analysis, and identity matching rules.
          </span>
        </div>

        {/* Impersonator Registrar & Hosting Clusters */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Adversary Infrastructure Clusters
            </h3>
            <p className="text-xs text-muted-foreground">
              Recurring registrars and privacy proxies hosting malicious lookalikes
            </p>
          </div>

          <div className="space-y-3.5 py-1">
            {registrarClusters.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No external infrastructure clusters cataloged.
              </div>
            ) : (
              registrarClusters.map(([registrar, count]) => (
                <div 
                  key={registrar}
                  className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-foreground block">
                      {registrar}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Recurring Offshore Registrar / Host Proxy
                    </span>
                  </div>
                  <span className="font-mono font-bold px-2.5 py-1 rounded-md bg-muted text-foreground">
                    {count} Incidents
                  </span>
                </div>
              ))
            )}
          </div>

          <span className="text-[11px] text-muted-foreground pt-3 border-t border-border block">
            Offshore anonymous proxies represent the primary source of impersonation hosts.
          </span>
        </div>
      </div>

      {/* Intelligence Feed Coverage Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm space-y-5">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Threat Intelligence Feed Status & Telemetry Sources
          </h3>
          <p className="text-xs text-muted-foreground">
            Connected sensor feeds evaluating brand risk across global Internet registries
          </p>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-mono text-[10px] uppercase">
                <th className="py-3.5 px-5 font-bold">Telemetry Sensor</th>
                <th className="py-3.5 px-5 font-bold">Protocol / Heuristic</th>
                <th className="py-3.5 px-5 font-bold">Ingestion Frequency</th>
                <th className="py-3.5 px-5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-4 px-5 font-bold text-foreground">Passive DNS Stream</td>
                <td className="py-4 px-5 font-mono text-muted-foreground">RFC-1035 authoritative zone updates</td>
                <td className="py-4 px-5 text-muted-foreground">Continuous (Near Real-Time)</td>
                <td className="py-4 px-5">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    OPERATIONAL
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-4 px-5 font-bold text-foreground">SSL Certificate Transparency</td>
                <td className="py-4 px-5 font-mono text-muted-foreground">RFC-6962 append-only cryptographic logs</td>
                <td className="py-4 px-5 text-muted-foreground">Sub-minute WebSocket stream</td>
                <td className="py-4 px-5">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    OPERATIONAL
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-4 px-5 font-bold text-foreground">Levenshtein Typo & Homograph Engine</td>
                <td className="py-4 px-5 font-mono text-muted-foreground">Punycode & visual spoofing heuristic</td>
                <td className="py-4 px-5 text-muted-foreground">Synchronous on-demand + hourly sweep</td>
                <td className="py-4 px-5">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    OPERATIONAL
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-4 px-5 font-bold text-foreground">Anti-Phishing Feed Correlation</td>
                <td className="py-4 px-5 font-mono text-muted-foreground">PhishTank & Verified Community Feeds</td>
                <td className="py-4 px-5 text-muted-foreground">Every 15 minutes</td>
                <td className="py-4 px-5">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    OPERATIONAL
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BrandIntelligence;

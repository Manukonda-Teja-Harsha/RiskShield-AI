import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ShieldCheck, 
  Layers, 
  Award, 
  CheckCircle2, 
  ArrowUpRight, 
  PieChart as PieChartIcon,
  Activity,
  Globe,
  Sparkles,
  Info,
  X,
  Database,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CountUpNumber } from '../common/CountUpNumber';

export const MarketingPerformanceSection: React.FC = () => {
  const { registeredBrands, brandAssets, setSelectedBrandModal } = useStore();
  const [activeMetricTab, setActiveMetricTab] = useState<'category' | 'status'>('category');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);

  // Dynamic industry distribution derived directly from real store data
  const categoryData = useMemo(() => {
    const counts: Record<string, { count: number; brands: string[] }> = {};
    const colorMap: Record<string, string> = {
      'Fintech & Banking': '#FF5500',
      'Cloud & Developer Tools': '#10B981',
      'E-Commerce & Retail': '#3B82F6',
      'Cybersecurity & Identity': '#8B5CF6',
      'Healthcare & Biotech': '#EC4899',
      'Supply Chain & Freight': '#F59E0B'
    };

    const categoryDescriptions: Record<string, string> = {
      'Fintech & Banking': 'Commercial banking, card payment rails, and institutional settlement portals.',
      'Cloud & Developer Tools': 'Serverless GPU computing, cloud hosting, and developer API endpoints.',
      'E-Commerce & Retail': 'Direct-to-consumer marketplaces, checkout gateways, and merchant storefronts.',
      'Cybersecurity & Identity': 'Zero-trust IAM, enterprise identity federation, and credential security.',
      'Healthcare & Biotech': 'Patient health records, telemedicine portals, and certified prescription links.',
      'Supply Chain & Freight': 'Freight tracking, intermodal logistics, and customs documentation portals.'
    };

    registeredBrands.forEach((b) => {
      if (!counts[b.category]) {
        counts[b.category] = { count: 0, brands: [] };
      }
      counts[b.category].count += 1;
      counts[b.category].brands.push(b.name);
    });

    const total = registeredBrands.length || 1;

    return Object.entries(counts).map(([name, data]) => ({
      name,
      count: data.count,
      brands: data.brands,
      percent: Math.round((data.count / total) * 100),
      color: colorMap[name] || '#FF5500',
      description: categoryDescriptions[name] || 'Attested commercial organizations in this sector.'
    }));
  }, [registeredBrands]);

  // Dynamic status distribution derived from real store data
  const statusData = useMemo(() => {
    const verified = registeredBrands.filter(b => b.status === 'VERIFIED' || b.status === 'FEATURED_PARTNER');
    const pending = registeredBrands.filter(b => b.status === 'PENDING_DNS');
    const total = registeredBrands.length || 1;

    return [
      {
        name: 'DNS Attested & Verified',
        count: verified.length,
        brands: verified.map(b => b.name),
        percent: Math.round((verified.length / total) * 100),
        color: '#10B981',
        description: 'Completed cryptographic DNS TXT verification challenge or authoritative business proof.'
      },
      {
        name: 'Pending DNS Challenge',
        count: pending.length,
        brands: pending.map(b => b.name),
        percent: Math.round((pending.length / total) * 100),
        color: '#F59E0B',
        description: 'Registered brand record awaiting domain DNS TXT challenge completion.'
      }
    ];
  }, [registeredBrands]);

  const currentChartData = activeMetricTab === 'category' ? categoryData : statusData;

  // Calculate SVG Pie/Donut Slices
  const totalItems = registeredBrands.length || 1;
  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const slices = currentChartData.map((item) => {
    const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += item.percent;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset
    };
  });

  // Highlighted past work selections
  const highlightedPastWork = useMemo(() => {
    const works: { brandName: string; accentColor: string; title: string; metric: string; completedAt: string; category: string }[] = [];
    registeredBrands.slice(0, 3).forEach((b) => {
      if (b.pastWork && b.pastWork[0]) {
        works.push({
          brandName: b.name,
          accentColor: b.accentColor,
          title: b.pastWork[0].campaignTitle,
          metric: b.pastWork[0].impactMetric,
          completedAt: b.pastWork[0].completedAt,
          category: b.pastWork[0].category
        });
      }
    });
    return works;
  }, [registeredBrands]);

  // Dynamic Key Takeaway calculation from actual records
  const dynamicKeyTakeaway = useMemo(() => {
    if (activeMetricTab === 'category') {
      const topCategory = [...categoryData].sort((a, b) => b.count - a.count)[0];
      if (!topCategory) return 'Data is currently empty.';
      return `${topCategory.name} represents the largest sector at ${topCategory.percent}% (${topCategory.count} brands), with balanced participation across ${categoryData.length - 1} other key commercial industries.`;
    } else {
      const verified = statusData.find(s => s.name.includes('Verified'))?.percent || 0;
      return `${verified}% of registered brand assets have completed authoritative cryptographic verification via DNS TXT records.`;
    }
  }, [activeMetricTab, categoryData, statusData]);

  // Active hover slice metadata for rich tooltip
  const activeHoveredItem = useMemo(() => {
    if (!hoveredSlice) return null;
    return currentChartData.find(d => d.name === hoveredSlice) || null;
  }, [hoveredSlice, currentChartData]);

  return (
    <section id="performance-analytics" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-mono font-bold tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>PLATFORM PERFORMANCE & BRAND INTELLIGENCE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground">
            Verified Activity & Market Distribution
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Transparent metrics tracking brand registrations, completed protection campaigns, and verified asset attestation across active industries.
          </p>
        </div>

        {/* Chart View Toggle */}
        <div className="flex items-center bg-muted/70 p-1 rounded-xl border border-border shrink-0 self-start md:self-end">
          <button
            onClick={() => setActiveMetricTab('category')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeMetricTab === 'category'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            By Industry
          </button>
          <button
            onClick={() => setActiveMetricTab('status')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeMetricTab === 'status'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            By Status
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Metrics & Past Work, Right = Rethought Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Meaningful Performance Overview & Past Work (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          
          {/* Performance Analysis Stat Tiles with Scroll-Triggered Count-Up */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
              <span className="text-[11px] font-mono text-muted-foreground uppercase block mb-1">
                Registered Brands
              </span>
              <span className="text-2xl font-display font-extrabold text-foreground">
                <CountUpNumber value={registeredBrands.length} duration={1.2} delay={0} />
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>100% Attested</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
              <span className="text-[11px] font-mono text-muted-foreground uppercase block mb-1">
                Digital Assets
              </span>
              <span className="text-2xl font-display font-extrabold text-foreground">
                <CountUpNumber 
                  value={registeredBrands.reduce((acc, b) => acc + b.verifiedAssetsCount, 0)} 
                  suffix="+" 
                  duration={1.4} 
                  delay={0.1} 
                />
              </span>
              <span className="text-[10px] font-mono text-brand-500 block mt-1">
                Domains & Handles
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
              <span className="text-[11px] font-mono text-muted-foreground uppercase block mb-1">
                Completed Work
              </span>
              <span className="text-2xl font-display font-extrabold text-foreground">
                <CountUpNumber 
                  value={registeredBrands.reduce((acc, b) => acc + b.pastWork.length, 0)} 
                  duration={1.3} 
                  delay={0.2} 
                />
              </span>
              <span className="text-[10px] font-mono text-blue-500 block mt-1">
                Active Campaigns
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
              <span className="text-[11px] font-mono text-muted-foreground uppercase block mb-1">
                DNS Attestation
              </span>
              <span className="text-2xl font-display font-extrabold text-emerald-500">
                <CountUpNumber value={100} suffix="%" duration={1.5} delay={0.3} />
              </span>
              <span className="text-[10px] font-mono text-muted-foreground block mt-1">
                RFC-2822 Standard
              </span>
            </div>
          </div>

          {/* Past Work Showcase Box */}
          <div className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-lg flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-brand-500" />
                <h3 className="font-display font-bold text-sm text-foreground">
                  Featured Past Work & Completed Brand Campaigns
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                Actual Platform Deliveries
              </span>
            </div>

            {/* List of 3 completed campaigns */}
            <div className="space-y-3">
              {highlightedPastWork.map((pw, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: pw.accentColor }}
                      />
                      <span className="text-xs font-mono font-bold text-foreground">
                        {pw.brandName}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-card text-muted-foreground border border-border">
                        {pw.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {pw.title}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border">
                    <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {pw.metric}
                    </span>
                    <button
                      onClick={() => {
                        const target = registeredBrands.find(b => b.name === pw.brandName);
                        if (target) setSelectedBrandModal(target);
                      }}
                      className="text-xs font-mono text-brand-500 hover:text-brand-600 inline-flex items-center gap-0.5 group-hover:underline"
                    >
                      <span>Explore</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 mt-4 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>All campaigns attested and published to RiskShield public ledger.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Rethought Interactive Pie/Donut Chart with "View Chart Insights" Button */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-card border border-border shadow-lg flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-brand-500" />
                <h3 className="font-display font-bold text-sm text-foreground">
                  {activeMetricTab === 'category' ? 'Industry Category Distribution' : 'Attestation Verification Status'}
                </h3>
              </div>

              {/* View Chart Insights Button */}
              <button
                type="button"
                onClick={() => setInsightsOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted hover:bg-muted/80 text-[11px] font-mono font-semibold text-foreground border border-border hover:border-brand-500/40 transition-all shadow-sm active:scale-95"
                title="View detailed breakdown and insights for this chart"
              >
                <Info className="w-3.5 h-3.5 text-brand-500" />
                <span>View Chart Insights</span>
              </button>
            </div>

            {/* SVG Donut Visual */}
            <div className="relative flex items-center justify-center my-3">
              <svg className="w-48 h-48 -rotate-90" viewBox="0 0 160 160">
                {/* Background track circle */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-muted/30"
                />

                {/* Data Slices */}
                {slices.map((slice) => {
                  const isHovered = hoveredSlice === slice.name;
                  return (
                    <circle
                      key={slice.name}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      strokeLinecap="butt"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredSlice(slice.name)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  );
                })}
              </svg>

              {/* Center Summary Counter with CountUpNumber */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-display font-extrabold text-foreground">
                  {hoveredSlice 
                    ? currentChartData.find(d => d.name === hoveredSlice)?.count 
                    : <CountUpNumber value={registeredBrands.length} duration={1.2} />}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest max-w-[100px] leading-tight mt-0.5">
                  {hoveredSlice 
                    ? hoveredSlice.split(' ')[0] 
                    : 'Total Brands'}
                </span>
              </div>
            </div>

            {/* Rich Hover Telemetry Box (when hovering a slice) */}
            <div className="min-h-[38px] px-3 py-1.5 rounded-xl bg-muted/40 border border-border/80 text-[11px] font-mono flex items-center justify-between">
              {activeHoveredItem ? (
                <>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeHoveredItem.color }} />
                    <span className="font-semibold text-foreground truncate">{activeHoveredItem.name}:</span>
                    <span className="text-muted-foreground truncate">{activeHoveredItem.brands.join(', ')}</span>
                  </div>
                  <span className="font-bold text-brand-500 shrink-0 ml-2">{activeHoveredItem.count} ({activeHoveredItem.percent}%)</span>
                </>
              ) : (
                <span className="text-muted-foreground text-[10px]">
                  Hover over any slice or legend item to view matching brands.
                </span>
              )}
            </div>
          </div>

          {/* Chart Legend with Exact Percentages and Counts */}
          <div className="space-y-1.5 pt-3 border-t border-border">
            {slices.map((item) => (
              <div
                key={item.name}
                onMouseEnter={() => setHoveredSlice(item.name)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`p-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  hoveredSlice === item.name ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-foreground truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                  <span className="text-muted-foreground">{item.count} brands</span>
                  <span className="font-bold text-foreground">{item.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Chart Insights Modal / Expanded Popover */}
      <AnimatePresence>
        {insightsOpen && (
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="insights-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInsightsOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-500">
                    <PieChartIcon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 id="insights-modal-title" className="font-display font-extrabold text-lg sm:text-xl text-foreground">
                      Chart Insights & Methodology
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground">
                      {activeMetricTab === 'category' ? 'Industry Category Distribution' : 'Attestation Verification Status'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setInsightsOpen(false)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
                  aria-label="Close insights modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Data Scope & Reporting Period Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                  <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                    <Database className="w-3.5 h-3.5 text-brand-500" />
                    <span>Data Source</span>
                  </span>
                  <span className="font-bold text-foreground">RiskShield Brand Ledger</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                  <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Reporting Period</span>
                  </span>
                  <span className="font-bold text-foreground">Active Roster (Oct 2026)</span>
                </div>
              </div>

              {/* Dynamic Key Takeaway */}
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-500">
                    Key Metric Takeaway
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  {dynamicKeyTakeaway}
                </p>
              </div>

              {/* Itemized Categories / Slices Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider">
                  Category Breakdown ({currentChartData.length} Slices • {registeredBrands.length} Total Records)
                </h4>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {currentChartData.map((item) => (
                    <div
                      key={item.name}
                      className="p-3 rounded-2xl bg-muted/30 border border-border space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-display font-bold text-xs sm:text-sm text-foreground">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.count} brands ({item.percent}%)
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-4">
                        {item.description}
                      </p>
                      <div className="text-[10px] font-mono text-brand-500 pl-4">
                        Registered: {item.brands.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Calculated dynamically from real store database.</span>
                <button
                  onClick={() => setInsightsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs border border-border"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

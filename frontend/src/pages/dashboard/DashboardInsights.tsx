import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  ShieldCheck, 
  AlertTriangle, 
  Info,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CountUpNumber } from '../../components/common/CountUpNumber';
import { RiskStatus } from '../../types';

type TimeFilter = '7d' | '30d' | '90d' | 'all';

export const DashboardInsights: React.FC = () => {
  const { scanHistory, threatWatchList, userReports } = useStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Filter scans by time window
  const filteredScans = useMemo(() => {
    if (timeFilter === 'all') return scanHistory;
    const now = Date.now();
    const days = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return scanHistory.filter(s => new Date(s.timestamp).getTime() >= cutoff);
  }, [scanHistory, timeFilter]);

  // 1. Outcome Distribution
  const outcomeStats = useMemo(() => {
    const counts: Record<RiskStatus, number> = {
      KNOWN_THREAT: 0,
      HIGH_RISK: 0,
      SUSPICIOUS: 0,
      NO_KNOWN_THREAT_DETECTED: 0,
      INCONCLUSIVE: 0
    };

    filteredScans.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });

    const total = filteredScans.length || 1;

    const meta: { status: RiskStatus; label: string; color: string; desc: string }[] = [
      { status: 'KNOWN_THREAT', label: 'Known Threat', color: '#EF4444', desc: 'Verified malicious indicator on active feeds' },
      { status: 'HIGH_RISK', label: 'High Risk', color: '#F97316', desc: 'Severe structural homoglyph or urgency signals' },
      { status: 'SUSPICIOUS', label: 'Suspicious', color: '#F59E0B', desc: 'Elevated anomalies requiring caution' },
      { status: 'NO_KNOWN_THREAT_DETECTED', label: 'No Known Threat', color: '#10B981', desc: 'Clean telemetry on connected sources' },
      { status: 'INCONCLUSIVE', label: 'Inconclusive', color: '#6B7280', desc: 'Upstream timeout or unrated endpoint' }
    ];

    return meta.map(m => {
      const count = counts[m.status];
      const percent = Math.round((count / total) * 100);
      return {
        ...m,
        count,
        percent
      };
    });
  }, [filteredScans]);

  // Donut SVG parameters
  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  const slices = outcomeStats.map(s => {
    const strokeDasharray = `${(s.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulative / 100) * circumference);
    cumulative += s.percent;
    return { ...s, strokeDasharray, strokeDashoffset };
  });

  // 2. Scan Type Distribution
  const modeStats = useMemo(() => {
    const counts: Record<string, number> = { url: 0, message: 0, profile: 0, product: 0, phone: 0, payment: 0, app: 0, job: 0 };
    filteredScans.forEach(s => {
      if (counts[s.mode] !== undefined) counts[s.mode]++;
      else counts.url++;
    });
    const total = filteredScans.length || 1;
    return [
      { mode: 'url', label: 'Website URLs', count: counts.url, percent: Math.round((counts.url / total) * 100), color: '#FF5500' },
      { mode: 'message', label: 'Scam Messages', count: counts.message, percent: Math.round((counts.message / total) * 100), color: '#F59E0B' },
      { mode: 'profile', label: 'Public Profiles', count: counts.profile, percent: Math.round((counts.profile / total) * 100), color: '#3B82F6' },
      { mode: 'product', label: 'Product Listings', count: counts.product, percent: Math.round((counts.product / total) * 100), color: '#8B5CF6' }
    ];
  }, [filteredScans]);

  // 3. Status change and Threat Watch summary
  const watchThreatsCount = threatWatchList.filter(w => w.monitoringStatus === 'Threat Detected').length;
  const watchActiveCount = threatWatchList.filter(w => w.monitoringStatus === 'Monitoring').length;
  const watchPausedCount = threatWatchList.filter(w => w.monitoringStatus === 'Monitoring Paused').length;

  // 4. Report resolution metrics
  const totalReports = userReports.length;
  const confirmedReports = userReports.filter(r => r.status === 'CONFIRMED').length;
  const underReviewReports = userReports.filter(r => r.status === 'UNDER_REVIEW' || r.status === 'SUBMITTED').length;

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Page Title & Time Range Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight">
            Security Intelligence & Insights
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Transparent analytics derived from your actual scan queries and threat monitoring data.
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-muted/60 p-1.5 rounded-2xl border border-border self-start sm:self-auto">
          {(['7d', '30d', '90d', 'all'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTimeFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                timeFilter === f
                  ? 'bg-card text-foreground shadow-sm font-bold border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === '7d' ? '7 Days' : f === '30d' ? '30 Days' : f === '90d' ? '90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left = Outcome Donut, Right = Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Outcome Donut Chart (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-brand-500" />
                <h3 className="font-display font-bold text-sm sm:text-base text-foreground">
                  Scan Outcome Distribution
                </h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {filteredScans.length} Total Evaluated
              </span>
            </div>

            {filteredScans.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                <Info className="w-6 h-6 mx-auto text-muted-foreground/60" />
                <p>No scans found in selected time range.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-10 my-6">
                {/* SVG Donut Visual */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth={strokeWidth}
                      className="text-muted/30"
                    />
                    {slices.map((slice) => {
                      const isHovered = hoveredSlice === slice.label;
                      return (
                        <circle
                          key={slice.label}
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredSlice(slice.label)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-2xl font-display font-extrabold text-foreground">
                      {hoveredSlice 
                        ? outcomeStats.find(o => o.label === hoveredSlice)?.count 
                        : filteredScans.length}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest max-w-[80px] leading-tight">
                      {hoveredSlice || 'Total'}
                    </span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-2 flex-1 w-full text-xs font-mono">
                  {outcomeStats.map((item) => (
                    <div
                      key={item.label}
                      onMouseEnter={() => setHoveredSlice(item.label)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        hoveredSlice === item.label ? 'bg-muted' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-foreground truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{item.count}</span>
                        <span className="font-bold text-foreground">{item.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border text-[11px] font-mono text-muted-foreground">
            Computed from user-initiated heuristic evaluation queries.
          </div>
        </div>

        {/* Scan Type Distribution (5 Cols) */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                <h3 className="font-display font-bold text-sm sm:text-base text-foreground">
                  Scanned Target Categories
                </h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Distribution
              </span>
            </div>

            {filteredScans.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No scan category telemetry for this period.
              </div>
            ) : (
              <div className="space-y-5 my-3">
                {modeStats.map((item) => (
                  <div key={item.mode} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-foreground">{item.label}</span>
                      <span className="text-muted-foreground">{item.count} ({item.percent}%)</span>
                    </div>
                    {/* Horizontal Bar */}
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border text-[11px] font-mono text-muted-foreground">
            Categorization determined by target format at ingestion.
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Threat Watch Stats & Report Resolution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1 */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-1.5">
          <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase block mb-1.5">
            Threat Watch Active
          </span>
          <span className="text-2xl font-display font-extrabold text-emerald-500">
            {watchActiveCount}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground block mt-1.5">
            Endpoints in active check cycle
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-1.5">
          <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase block mb-1.5">
            Threats On Watchlist
          </span>
          <span className="text-2xl font-display font-extrabold text-red-500">
            {watchThreatsCount}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground block mt-1.5">
            Confirmed alerts on saved items
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-1.5">
          <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase block mb-1.5">
            Community Reports Filed
          </span>
          <span className="text-2xl font-display font-extrabold text-foreground">
            {totalReports}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground block mt-1.5">
            Submitted scam indicators
          </span>
        </div>

        {/* Metric 4 */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-1.5">
          <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase block mb-1.5">
            Confirmed Malicious
          </span>
          <span className="text-2xl font-display font-extrabold text-amber-500">
            {confirmedReports}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground block mt-1.5">
            Verified by threat analysts
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardInsights;

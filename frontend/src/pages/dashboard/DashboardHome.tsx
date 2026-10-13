import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  Eye, 
  Flag, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  ExternalLink,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CountUpNumber } from '../../components/common/CountUpNumber';
import { RiskBadge } from '../../components/common/RiskBadge';
import { UniversalScannerCard } from '../../components/dashboard/UniversalScannerCard';
import { MainIntelligenceAnalysisCard } from '../../components/dashboard/MainIntelligenceAnalysisCard';
import { ScanResult } from '../../types';

interface DashboardContextType {
  onInspectResult: (result: ScanResult) => void;
  onOpenEmergency: (scenario?: 'link' | 'credentials' | 'money' | 'file') => void;
  onOpenReport: (target: string) => void;
}

export const DashboardHome: React.FC = () => {
  const { user, scanHistory, threatWatchList, userReports } = useStore();
  const { onInspectResult, onOpenEmergency, onOpenReport } = useOutletContext<DashboardContextType>();

  // Main Intelligence Analysis State (Additive Enhancement)
  const [activeScanResult, setActiveScanResult] = React.useState<ScanResult | null>(() => scanHistory[0] || null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanTarget, setScanTarget] = React.useState<string>('');
  const [scanError, setScanError] = React.useState<string | null>(null);

  // Sync with newest scan from store
  React.useEffect(() => {
    if (!activeScanResult && scanHistory.length > 0) {
      setActiveScanResult(scanHistory[0]);
    }
  }, [scanHistory, activeScanResult]);

  const handleScanStateChange = (state: {
    isScanning: boolean;
    result: ScanResult | null;
    target?: string;
    error?: string | null;
  }) => {
    setIsScanning(state.isScanning);
    if (state.target !== undefined) setScanTarget(state.target);
    if (state.error !== undefined) setScanError(state.error);
    if (state.result) {
      setActiveScanResult(state.result);
      setScanError(null);
    }
  };

  // Real computed summary metrics
  const totalScans = scanHistory.length;
  const highRiskFindings = scanHistory.filter(
    s => s.status === 'KNOWN_THREAT' || s.status === 'HIGH_RISK'
  ).length;
  const activeThreatWatches = threatWatchList.filter(
    w => w.monitoringStatus !== 'Monitoring Paused'
  ).length;
  const resolvedReports = userReports.filter(
    r => r.status === 'CONFIRMED' || r.status === 'DISMISSED'
  ).length;

  const recentScans = scanHistory.slice(0, 5);
  const threatWatchPreview = threatWatchList.slice(0, 3);

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* 3A. Welcome Section */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 lg:p-9 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-brand-500 uppercase tracking-wider">
              {user?.isDemo ? 'Demonstration Sandbox Workspace' : 'Personal Security Center'}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground truncate max-w-xs">
              {user?.email || 'Authenticated User'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight">
            Your digital safety, at a glance.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed pt-0.5">
            Check suspicious links, messages, profiles, and listings before they put you at risk.
          </p>
        </div>

        {/* Emergency Assistance Quick Entry */}
        <button
          type="button"
          onClick={() => onOpenEmergency('link')}
          className="shrink-0 px-5 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-bold font-mono flex items-center gap-2.5 transition-all active:scale-95 shadow-sm"
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Scam Emergency Mode</span>
        </button>
      </div>

      {/* 3B. Universal Scanner — Main Focus */}
      <UniversalScannerCard
        onInspectResult={onInspectResult}
        onOpenEmergency={onOpenEmergency}
        onOpenReport={onOpenReport}
        onScanStateChange={handleScanStateChange}
      />

      {/* 3B-2. Main Intelligence Analysis Card (Enhanced Detailed Dossier) */}
      <MainIntelligenceAnalysisCard
        scanResult={activeScanResult}
        isScanning={isScanning}
        scanTarget={scanTarget}
        error={scanError}
        onClearError={() => setScanError(null)}
        context="user"
        onOpenEmergency={onOpenEmergency}
        onOpenReport={onOpenReport}
      />

      {/* 3C. Security Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Scans */}
        <div className="p-6 sm:p-7 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider block mb-2">
            Total Scans
          </span>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-foreground">
            <CountUpNumber value={totalScans} duration={1.2} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground block mt-2">
            Logged in your session
          </span>
        </div>

        {/* Card 2: High-Risk Findings */}
        <div className="p-6 sm:p-7 rounded-3xl bg-card border border-red-500/20 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold text-red-500 uppercase tracking-wider block mb-2">
            High-Risk Findings
          </span>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-red-500">
            <CountUpNumber value={highRiskFindings} duration={1.2} delay={0.1} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground block mt-2">
            Intercepted threats
          </span>
        </div>

        {/* Card 3: Active Threat Watches */}
        <div className="p-6 sm:p-7 rounded-3xl bg-card border border-amber-500/20 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold text-amber-500 uppercase tracking-wider block mb-2">
            Active Threat Watches
          </span>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-amber-500">
            <CountUpNumber value={activeThreatWatches} duration={1.2} delay={0.2} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground block mt-2">
            Monitored endpoints
          </span>
        </div>

        {/* Card 4: Resolved Reports */}
        <div className="p-6 sm:p-7 rounded-3xl bg-card border border-emerald-500/20 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold text-emerald-500 uppercase tracking-wider block mb-2">
            Resolved Reports
          </span>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-emerald-500">
            <CountUpNumber value={resolvedReports} duration={1.2} delay={0.3} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground block mt-2">
            Confirmed or dismissed
          </span>
        </div>
      </div>

      {/* Grid: Left = Recent Scans (3D), Right = Threat Watch Preview (3E) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 3D. Recent Scans (7 Cols) */}
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="font-display font-bold text-base text-foreground">
                Recent Scans
              </h3>
              <p className="text-xs text-muted-foreground">
                Your latest analyzed indicators and security verdicts.
              </p>
            </div>

            {totalScans > 0 && (
              <Link
                to="/dashboard/activity"
                className="text-xs font-mono font-bold text-brand-500 hover:text-brand-600 transition-colors"
              >
                View Full Activity →
              </Link>
            )}
          </div>

          {recentScans.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-display font-bold text-sm text-foreground">No Scans Recorded Yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Paste a suspicious link or message into the Universal Scanner above to generate your first technical evaluation.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="p-4 sm:p-5 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <RiskBadge status={scan.status} size="sm" />
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-card text-muted-foreground border border-border uppercase">
                        {scan.mode}
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground truncate max-w-[240px]">
                        {scan.target}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {scan.explanation}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {new Date(scan.timestamp).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => onInspectResult(scan)}
                      className="text-xs font-bold text-brand-500 hover:text-brand-600 group-hover:underline"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3E. Threat Watch Preview (5 Cols) */}
        <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="font-display font-bold text-base text-foreground">
                Threat Watch Preview
              </h3>
              <p className="text-xs text-muted-foreground">
                Periodic reputation inspection of saved targets.
              </p>
            </div>

            <Link
              to="/dashboard/threat-watch"
              className="text-xs font-mono font-bold text-brand-500 hover:text-brand-600 transition-colors"
            >
              All Monitors ({threatWatchList.length}) →
            </Link>
          </div>

          {threatWatchPreview.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground">
                <Eye className="w-6 h-6" />
              </div>
              <h4 className="font-display font-bold text-sm text-foreground">No Monitored Items</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Add domains or suspicious URLs from your scan results to Threat Watch for scheduled checks.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {threatWatchPreview.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-foreground truncate max-w-[180px]">
                      {item.target}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      item.monitoringStatus === 'Threat Detected'
                        ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                        : item.monitoringStatus === 'Monitoring'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {item.monitoringStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <RiskBadge status={item.assessment} size="sm" />
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Checked: {item.lastChecked}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Honest Check Limitation Notice */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border flex items-start gap-2.5 text-[11px] text-muted-foreground leading-relaxed">
            <Info className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
            <span>
              Periodic checks query external feeds on scheduled intervals. Not a guarantee of zero-day immunity.
            </span>
          </div>
        </div>
      </div>

      {/* 3F. Emergency Assistance Banner */}
      <div className="p-6 sm:p-8 lg:p-9 rounded-3xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/25 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="font-display font-extrabold text-base text-foreground">
              Encountered a Real Scam or Shared Credentials?
            </h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Select your scenario in Scam Emergency Mode for immediate defensive steps: bank fraud hotline guidelines, credential isolation, and official regulatory reporting.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenEmergency('link')}
          className="shrink-0 px-6 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs tracking-wide shadow-md shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2.5"
        >
          <span>Launch Emergency Guidance</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default DashboardHome;

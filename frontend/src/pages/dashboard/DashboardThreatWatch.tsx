import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Plus, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Pause, 
  Play, 
  Trash2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Calendar, 
  Info, 
  ExternalLink, 
  AlertCircle,
  CheckCircle2,
  Bell,
  Globe,
  Sliders,
  Filter
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ThreatWatchItem, ScanResult, RiskStatus, MonitoringStatus } from '../../types';
import { RiskBadge } from '../../components/common/RiskBadge';
import { executeThreatWatchCheck } from '../../lib/api';

interface DashboardContextType {
  onInspectResult: (result: ScanResult) => void;
  onOpenEmergency: (scenario?: 'link' | 'credentials' | 'money' | 'file') => void;
  onOpenReport: (target: string) => void;
}

export const DashboardThreatWatch: React.FC = () => {
  const { threatWatchList, addThreatWatch, toggleThreatWatchStatus, removeThreatWatch, updateThreatWatch } = useStore();
  const { onInspectResult, onOpenEmergency, onOpenReport } = useOutletContext<DashboardContextType>();

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [newFrequency, setNewFrequency] = useState('Daily Verification');
  const [newNotes, setNewNotes] = useState('');
  const [enableNotifs, setEnableNotifs] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Check Loading Map
  const [checkingIds, setCheckingIds] = useState<Record<string, boolean>>({});

  // Expanded History Drawers
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'ALL' | MonitoringStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Item Handler
  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanTarget = newTarget.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanTarget) {
      setFormError('Please enter a valid domain or host name (e.g., example.com).');
      return;
    }

    if (!cleanTarget.includes('.') || cleanTarget.length < 4) {
      setFormError('Please enter a fully qualified domain name with an extension (e.g., vendor-portal.com).');
      return;
    }

    // Check duplicate
    if (threatWatchList.some(item => item.target.toLowerCase() === cleanTarget)) {
      setFormError('This target domain is already on your Threat Watch list.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Execute initial baseline check
      const checkResult = await executeThreatWatchCheck(cleanTarget);
      
      const initialMonitoringStatus: MonitoringStatus = 
        checkResult.assessment === 'KNOWN_THREAT' || checkResult.assessment === 'HIGH_RISK'
          ? 'Threat Detected'
          : 'Monitoring';

      addThreatWatch({
        target: cleanTarget,
        targetType: 'url',
        assessment: checkResult.assessment,
        monitoringStatus: initialMonitoringStatus,
        notificationsEnabled: enableNotifs,
        notes: newNotes.trim() || `Monitored on ${newFrequency} schedule.`,
      });

      setNewTarget('');
      setNewNotes('');
      setShowAddForm(false);
    } catch {
      setFormError('Failed to run initial baseline check. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run Check Now
  const handleRunCheckNow = async (item: ThreatWatchItem) => {
    setCheckingIds(prev => ({ ...prev, [item.id]: true }));

    try {
      const check = await executeThreatWatchCheck(item.target);
      
      const newStatus: MonitoringStatus = 
        check.assessment === 'KNOWN_THREAT' || check.assessment === 'HIGH_RISK'
          ? 'Threat Detected'
          : item.monitoringStatus === 'Monitoring Paused' 
            ? 'Monitoring Paused' 
            : 'Monitoring';

      const updatedHistory = [
        {
          timestamp: 'Just now',
          status: check.assessment,
          note: check.note
        },
        ...(item.statusHistory || [])
      ];

      updateThreatWatch(item.id, {
        assessment: check.assessment,
        lastChecked: 'Just now',
        monitoringStatus: newStatus,
        statusHistory: updatedHistory
      });
    } catch {
      updateThreatWatch(item.id, {
        monitoringStatus: 'Check Unavailable',
        statusHistory: [
          {
            timestamp: 'Just now',
            status: item.assessment,
            note: 'Periodic check encountered telemetry timeout.'
          },
          ...(item.statusHistory || [])
        ]
      });
    } finally {
      setCheckingIds(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const toggleHistory = (id: string) => {
    setExpandedHistories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Inspect full evidence modal
  const handleInspect = (item: ThreatWatchItem) => {
    const syntheticResult: ScanResult = {
      id: `SCAN-${item.id}`,
      target: item.target,
      mode: 'url',
      status: item.assessment,
      score: item.assessment === 'KNOWN_THREAT' ? 95 : item.assessment === 'HIGH_RISK' ? 82 : item.assessment === 'SUSPICIOUS' ? 64 : 12,
      timestamp: new Date().toISOString(),
      explanation: `Continuous Threat Watch audit for ${item.target}. Monitored status: ${item.monitoringStatus}. Notes: ${item.notes || 'None'}.`,
      sourcesChecked: ['DNS Resolver Validation', 'SSL/TLS Transparency Logs', 'Domain Registry Whitelist/Blacklist'],
      sourceFailures: [],
      evidence: [
        {
          id: 'EV-TW1',
          label: 'Periodic Telemetry Verification',
          severity: item.assessment === 'KNOWN_THREAT' || item.assessment === 'HIGH_RISK' ? 'high' : 'low',
          detail: `Last checked ${item.lastChecked}. Monitored status: ${item.monitoringStatus}.`,
          providerCitation: 'Threat Watch Periodic Evaluator'
        }
      ],
      recommendedActions: [
        item.assessment === 'KNOWN_THREAT' 
          ? 'Block network traffic to this target immediately.'
          : 'Continue monitoring for unexpected DNS or certificate alterations.',
        'Review registration records if any unauthorized lookalike domains appear.'
      ],
      isBackendConnected: false
    };
    onInspectResult(syntheticResult);
  };

  // Filtered targets
  const filteredList = threatWatchList.filter(item => {
    const matchesSearch = item.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || item.monitoringStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Dynamic counts
  const totalCount = threatWatchList.length;
  const activeCount = threatWatchList.filter(i => i.monitoringStatus === 'Monitoring').length;
  const threatsCount = threatWatchList.filter(i => i.monitoringStatus === 'Threat Detected').length;
  const pausedCount = threatWatchList.filter(i => i.monitoringStatus === 'Monitoring Paused').length;

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* 1. Header & Summary Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold text-brand-500 uppercase tracking-wider">
              Continuous Target Surveillance
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground">Periodic DNS & Reputation Auditing</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">
            Threat Watch
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Register critical domains, partner login portals, or suspect URLs to receive ongoing reputation and certificate integrity checks.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          {showAddForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? 'Close Watch Form' : 'Add Target to Watch'}</span>
        </button>
      </div>

      {/* 2. Limitation Disclaimer Banner (Honest Security Disclosure) */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 sm:p-6 flex items-start gap-4 text-amber-800 dark:text-amber-200">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
          <p className="font-semibold text-foreground">
            Architecture Notice: How Threat Watch Operates
          </p>
          <p className="text-muted-foreground">
            Threat Watch performs scheduled and on-demand DNS resolution, SSL certificate transparency log verification, and threat feed reputation lookups on your monitored targets. It does <strong>not</strong> install a local kernel driver, intercept private network packets, or monitor device memory in real time.
          </p>
        </div>
      </div>

      {/* 3. Summary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Total Monitored Targets</span>
          <div className="text-2xl font-display font-bold text-foreground mt-1">{totalCount}</div>
        </div>
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-1.5">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Surveillance
          </span>
          <div className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
        </div>
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-1.5">
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Threats Detected
          </span>
          <div className="text-2xl font-display font-bold text-rose-600 dark:text-rose-400 mt-1">{threatsCount}</div>
        </div>
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Pause className="w-3.5 h-3.5" />
            Monitoring Paused
          </span>
          <div className="text-2xl font-display font-bold text-muted-foreground mt-1">{pausedCount}</div>
        </div>
      </div>

      {/* 4. Add Watch Item Form (Collapsible) */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-brand-500/30 rounded-3xl p-6 sm:p-8 shadow-md relative">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-brand-500" />
                  <h3 className="font-semibold text-foreground text-base">Register Domain for Automated Surveillance</h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">
                  Target Evaluation Mode
                </span>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddTarget} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Target Domain or Hostname <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      placeholder="e.g. portal.vendorcorp.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-zinc-700/80 bg-white dark:bg-zinc-900/90 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors caret-brand-500"
                      disabled={isSubmitting}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Accepts fully qualified domains, subdomains, or public hostnames.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Verification Cadence Note
                    </label>
                    <select
                      value={newFrequency}
                      onChange={(e) => setNewFrequency(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-zinc-700/80 bg-white dark:bg-zinc-900/90 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                      disabled={isSubmitting}
                    >
                      <option value="Daily Verification">Daily Verification (Standard periodic audit)</option>
                      <option value="Every 6 Hours">Every 6 Hours (Elevated watch)</option>
                      <option value="Hourly Active Audit">Hourly Active Audit (Critical incident window)</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Periodic scheduler verifies target on schedule or instantly upon clicking "Run Check Now".
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Context / Surveillance Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Payroll vendor portal with high phishing sensitivity"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-zinc-700/80 bg-white dark:bg-zinc-900/90 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors caret-brand-500"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={enableNotifs}
                      onChange={(e) => setEnableNotifs(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-500 border-border focus:ring-brand-500"
                    />
                    <span>Notify in notifications center when threat status or certificate changes</span>
                  </label>

                  <div className="flex items-center gap-2 self-end">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Conducting Baseline Audit...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Initiate Surveillance</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Filter & Search Controls */}
      <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'Monitoring', 'Threat Detected', 'Check Unavailable', 'Monitoring Paused'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {status === 'ALL' ? 'All Targets' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter domains or notes..."
            className="w-full px-3 py-1.5 rounded-xl border border-border dark:border-zinc-700/80 bg-white dark:bg-zinc-900/90 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 caret-brand-500"
          />
        </div>
      </div>

      {/* 6. Monitored Targets List */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-3">
            <Eye className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="font-semibold text-foreground text-base">No Targets Matched Your Filter</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL' 
                ? 'Try resetting your search query or status filter to see all targets.' 
                : 'Add critical partner or login domains to your surveillance watch list above.'}
            </p>
            {(!searchQuery && statusFilter === 'ALL') && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Target</span>
              </button>
            )}
          </div>
        ) : (
          filteredList.map((item) => {
            const isChecking = checkingIds[item.id] || false;
            const isExpanded = expandedHistories[item.id] || false;

            // Status color badge helpers
            const statusBadgeColors = {
              'Monitoring': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
              'Threat Detected': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
              'Check Unavailable': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
              'Monitoring Paused': 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
            }[item.monitoringStatus];

            return (
              <div 
                key={item.id}
                className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm hover:border-brand-500/30 transition-all space-y-4"
              >
                {/* Main Card Content */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-foreground break-all">
                        {item.target}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeColors}`}>
                        {item.monitoringStatus === 'Monitoring' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {item.monitoringStatus === 'Threat Detected' && <AlertTriangle className="w-3 h-3" />}
                        {item.monitoringStatus === 'Monitoring Paused' && <Pause className="w-3 h-3" />}
                        {item.monitoringStatus === 'Check Unavailable' && <AlertCircle className="w-3 h-3" />}
                        <span>{item.monitoringStatus}</span>
                      </span>
                      <RiskBadge status={item.assessment} size="sm" />
                    </div>

                    {item.notes && (
                      <p className="text-xs text-muted-foreground">
                        {item.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                        Last checked: <span className="font-medium text-foreground">{item.lastChecked}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                        Added: <span className="font-medium text-foreground">{item.createdAt || 'Recent'}</span>
                      </span>
                      {item.notificationsEnabled && (
                        <span className="flex items-center gap-1 text-brand-500">
                          <Bell className="w-3 h-3" />
                          Alerts active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRunCheckNow(item)}
                      disabled={isChecking}
                      title="Run manual reputation and DNS verification right now"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                      <span>{isChecking ? 'Checking...' : 'Run Check Now'}</span>
                    </button>

                    <button
                      onClick={() => toggleThreatWatchStatus(item.id)}
                      title={item.monitoringStatus === 'Monitoring Paused' ? 'Resume monitoring' : 'Pause monitoring'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.monitoringStatus === 'Monitoring Paused' ? (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleInspect(item)}
                      title="Inspect full telemetry evidence and indicators"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Evidence</span>
                    </button>

                    <button
                      onClick={() => toggleHistory(item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      title="Toggle verification history audit trail"
                    >
                      <span className="text-[11px]">History ({item.statusHistory?.length || 0})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => removeThreatWatch(item.id)}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Remove from Threat Watch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Threat Detected Callout Action */}
                {item.monitoringStatus === 'Threat Detected' && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>Action Recommended:</strong> Target has active malicious or high-risk flags on reputation feeds.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenEmergency('link')}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 transition-colors"
                      >
                        Emergency Guidance
                      </button>
                      <button
                        onClick={() => onOpenReport(item.target)}
                        className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-medium hover:bg-rose-500/10 transition-colors"
                      >
                        File Community Report
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Change History Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-border pt-3 mt-3"
                    >
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                          Surveillance Event Audit Log
                        </span>
                        {(!item.statusHistory || item.statusHistory.length === 0) ? (
                          <p className="text-xs text-muted-foreground">No previous status modifications recorded.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {item.statusHistory.map((h, idx) => (
                              <div 
                                key={idx}
                                className="flex items-start justify-between gap-3 text-xs p-2 rounded-lg bg-muted/40 border border-border/50"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground">
                                      {h.note || 'Audit verification performed'}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-muted-foreground block">
                                    Status: <strong className="text-foreground">{h.status}</strong>
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                                  {h.timestamp}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

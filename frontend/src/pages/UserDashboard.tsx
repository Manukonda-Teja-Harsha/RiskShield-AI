import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Search, 
  History, 
  Bookmark, 
  Settings, 
  Trash2, 
  ArrowRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  ExternalLink 
} from 'lucide-react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { RiskBadge } from '../components/common/RiskBadge';
import { useStore } from '../store/useStore';
import { RiskStatus } from '../types';

import { CountUpNumber } from '../components/common/CountUpNumber';

export const UserDashboard: React.FC = () => {

  const { user, scanHistory, removeScanResult, clearHistory } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RiskStatus>('ALL');

  const filteredHistory = scanHistory.filter((item) => {
    const matchesSearch = item.target.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.explanation.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const threatsCount = scanHistory.filter(s => s.status === 'KNOWN_THREAT' || s.status === 'HIGH_RISK').length;
  const safeCount = scanHistory.filter(s => s.status === 'NO_KNOWN_THREAT_DETECTED').length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* User Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-border mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-brand-500 uppercase">Personal Protection Vault</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs font-mono text-muted-foreground">{user?.email || 'Signed in user'}</span>
            </div>
            <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">
              Security Overview & Telemetry History
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-orange-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Launch New Scan</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-card border border-border rounded-2xl w-fit mb-8 gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-brand-500" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-3.5 h-3.5 text-brand-500" />
            <span>Scan History ({scanHistory.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-brand-500" />
            <span>Privacy & Settings</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Real Stored Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-card border border-border">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Total Scans Recorded</span>
                <div className="text-3xl font-display font-extrabold text-foreground mt-2">
                  <CountUpNumber value={scanHistory.length} duration={1.2} delay={0} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Queries logged in your local private session</p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-red-500/20">
                <span className="text-xs font-mono font-bold text-red-500 uppercase">Threats Detected</span>
                <div className="text-3xl font-display font-extrabold text-red-500 mt-2">
                  <CountUpNumber value={threatsCount} duration={1.3} delay={0.1} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">High risk & known phishing links intercepted</p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-emerald-500/20">
                <span className="text-xs font-mono font-bold text-emerald-500 uppercase">Clean Lookups</span>
                <div className="text-3xl font-display font-extrabold text-emerald-500 mt-2">
                  <CountUpNumber value={safeCount} duration={1.4} delay={0.2} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Resources with no detected threat signatures</p>
              </div>
            </div>

            {/* Recent Scans Strip */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <div>
                  <h3 className="font-display font-bold text-base text-foreground">Recent Scan Findings</h3>
                  <p className="text-xs text-muted-foreground">Latest evidence evaluations performed by your account.</p>
                </div>
                {scanHistory.length > 0 && (
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-bold text-brand-500 hover:underline"
                  >
                    View All →
                  </button>
                )}
              </div>

              {scanHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">No Scan History Yet</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                    Run your first suspicious URL, message, or profile lookup to populate your personal security vault.
                  </p>
                  <Link
                    to="/"
                    className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <span>Scan an Indicator Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {scanHistory.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <RiskBadge status={item.status} size="sm" />
                          <code className="text-xs font-mono font-bold text-foreground">{item.target}</code>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.explanation}</p>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FULL SCAN HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by target or keyword..."
                  className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 caret-brand-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="KNOWN_THREAT">KNOWN_THREAT</option>
                  <option value="HIGH_RISK">HIGH_RISK</option>
                  <option value="SUSPICIOUS">SUSPICIOUS</option>
                  <option value="INCONCLUSIVE">INCONCLUSIVE</option>
                  <option value="NO_KNOWN_THREAT_DETECTED">NO_KNOWN_THREAT_DETECTED</option>
                </select>

                {scanHistory.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="px-3 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* History Table */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-xs">
                  No scan records matching current search filters.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredHistory.map((item) => (
                    <div key={item.id} className="p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <RiskBadge status={item.status} size="sm" />
                          <code className="text-xs font-mono font-bold text-foreground truncate max-w-md">{item.target}</code>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">{item.mode}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.explanation}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => removeScanResult(item.id)}
                          title="Delete finding"
                          className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PRIVACY & SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base text-foreground mb-1">Privacy & Data Governance</h3>
              <p className="text-xs text-muted-foreground">
                Control how your scanning activity and telemetry records are handled.
              </p>
            </div>

            <div className="space-y-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-0.5">Zero Telemetry Logging</h4>
                  <p className="text-muted-foreground">Your query text is processed ephemerally in RAM and never monetized or sold to data brokers.</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-500">ENFORCED</span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-0.5">Automatic PII Scrubbing</h4>
                  <p className="text-muted-foreground">Phone numbers, emails, and full names are stripped from pasted message snippets before evaluation.</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-500">ACTIVE</span>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground mb-0.5">Purge All Local History</h4>
                  <p className="text-muted-foreground">Permanently delete all stored scan results from this browser session.</p>
                </div>
                <button
                  onClick={clearHistory}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 font-mono text-xs font-bold transition-colors"
                >
                  Purge History
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

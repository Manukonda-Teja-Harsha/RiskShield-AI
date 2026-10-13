import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  Send,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { useStore } from '../store/useStore';
import { BrandAssetType } from '../types';

export const BrandDashboard: React.FC = () => {
  const { user, brandAssets, addBrandAsset, verifyBrandAsset, removeBrandAsset, threatReports, addThreatReport } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'radar' | 'reports'>('overview');

  // New Asset Modal State
  const [newAssetModalOpen, setNewAssetModalOpen] = useState(false);
  const [assetType, setAssetType] = useState<BrandAssetType>('DOMAIN');
  const [assetValue, setAssetValue] = useState('');

  // Report Scam Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState('');
  const [reportCategory, setReportCategory] = useState('Credential Phishing');
  const [reportNotes, setReportNotes] = useState('');

  // Copy TXT feedback
  const [copiedTxtId, setCopiedTxtId] = useState<string | null>(null);

  const brandName = user?.brandName || 'Acme Financial';
  const verifiedAssetsCount = brandAssets.filter(a => a.status === 'VERIFIED').length;
  const pendingAssetsCount = brandAssets.filter(a => a.status === 'PENDING_DNS').length;
  const activeReportsCount = threatReports.filter(r => r.status === 'INVESTIGATING' || r.status === 'CONFIRMED').length;

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetValue.trim()) return;
    addBrandAsset({
      brandName,
      type: assetType,
      value: assetValue.trim(),
      status: 'PENDING_DNS'
    });
    setAssetValue('');
    setNewAssetModalOpen(false);
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget.trim()) return;
    addThreatReport({
      target: reportTarget.trim(),
      targetType: 'URL',
      category: reportCategory,
      status: 'PENDING_REVIEW',
      notes: reportNotes
    });
    setReportTarget('');
    setReportNotes('');
    setReportModalOpen(false);
  };

  const handleCopyDnsTxt = async (id: string, record: string) => {
    try {
      await navigator.clipboard.writeText(record);
      setCopiedTxtId(id);
      setTimeout(() => setCopiedTxtId(null), 2500);
    } catch (err) {
      console.error('Failed to copy TXT record', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Brand Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-border mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase">Brand Owner Workspace</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs font-mono text-muted-foreground">{brandName}</span>
            </div>
            <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">
              Brand Identity & Impersonation Defense
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewAssetModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-card border border-border text-foreground hover:border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-amber-500" />
              <span>Add Digital Asset</span>
            </button>
            <button
              onClick={() => setReportModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report Impersonation</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-card border border-border rounded-2xl w-fit mb-8 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Brand Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assets'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Registered Assets ({brandAssets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'radar'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Lookalike Radar & Threats</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>Takedown Reports ({threatReports.length})</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-card border border-border">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Verified Brand Assets</span>
                <div className="text-3xl font-display font-extrabold text-foreground mt-2">
                  {verifiedAssetsCount} / {brandAssets.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Authoritative domains & handles in platform whitelist</p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-amber-500/20">
                <span className="text-xs font-mono font-bold text-amber-500 uppercase">Pending DNS Verification</span>
                <div className="text-3xl font-display font-extrabold text-amber-500 mt-2">
                  {pendingAssetsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Assets requiring DNS TXT record challenge</p>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-red-500/20">
                <span className="text-xs font-mono font-bold text-red-500 uppercase">Active Impersonations</span>
                <div className="text-3xl font-display font-extrabold text-red-500 mt-2">
                  {activeReportsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Threat targets currently in escalation or review</p>
              </div>
            </div>

            {/* Quick Impersonation Alert Banner */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <div>
                  <h3 className="font-display font-bold text-base text-foreground">Live Threat Dossiers</h3>
                  <p className="text-xs text-muted-foreground">Recent rogue domains and unauthorized social handles abusing {brandName}.</p>
                </div>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="text-xs font-bold text-amber-500 hover:underline"
                >
                  Manage Reports →
                </button>
              </div>

              <div className="space-y-3">
                {threatReports.map((report) => (
                  <div key={report.id} className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          report.status === 'CONFIRMED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          report.status === 'INVESTIGATING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}>
                          {report.status}
                        </span>
                        <code className="text-xs font-mono font-bold text-foreground">{report.target}</code>
                      </div>
                      <p className="text-xs text-muted-foreground">{report.notes || report.category}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{report.reportedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTERED ASSETS & DNS VERIFICATION */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl">
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">Whitelisted Brand Assets</h3>
                <p className="text-xs text-muted-foreground">Official web touchpoints authenticated via DNS TXT records.</p>
              </div>
              <button
                onClick={() => setNewAssetModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register New Asset</span>
              </button>
            </div>

            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
              <div className="divide-y divide-border">
                {brandAssets.map((asset) => (
                  <div key={asset.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          asset.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {asset.status === 'VERIFIED' ? '✓ DNS VERIFIED' : '⏳ PENDING DNS'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">{asset.type}</span>
                        <code className="text-xs font-mono font-bold text-foreground truncate">{asset.value}</code>
                      </div>

                      {asset.status === 'PENDING_DNS' && asset.dnsTxtRecord && (
                        <div className="p-3 rounded-xl bg-muted/60 border border-border mt-2 space-y-1">
                          <span className="text-[11px] font-mono text-muted-foreground block">
                            Add this DNS TXT record to verify ownership:
                          </span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-amber-500 bg-background px-2 py-1 rounded border border-border flex-1 select-all">
                              {asset.dnsTxtRecord}
                            </code>
                            <button
                              onClick={() => handleCopyDnsTxt(asset.id, asset.dnsTxtRecord!)}
                              className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-xs font-mono text-foreground flex items-center gap-1 border border-border"
                            >
                              {copiedTxtId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedTxtId === asset.id ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button
                              onClick={() => verifyBrandAsset(asset.id)}
                              className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold"
                            >
                              Verify DNS
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {asset.verifiedAt && (
                        <span className="text-xs font-mono text-muted-foreground">
                          Verified on {asset.verifiedAt}
                        </span>
                      )}
                      <button
                        onClick={() => removeBrandAsset(asset.id)}
                        title="Remove asset"
                        className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LOOKALIKE RADAR */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h3 className="font-display font-bold text-base text-foreground">Autonomous Lookalike Domain Radar</h3>
                  <p className="text-xs text-muted-foreground">Newly registered domains exhibiting Levenshtein proximity to {brandName}.</p>
                </div>
                <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  Continuous TLD Surveillance
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded">Levenshtein: 1</span>
                      <code className="text-xs font-mono font-bold text-foreground">acmefinancia1-update.com</code>
                    </div>
                    <p className="text-xs text-muted-foreground">Character substitution: "1" replaces "l". Registered 48h ago in Panama.</p>
                  </div>
                  <button
                    onClick={() => {
                      setReportTarget('acmefinancia1-update.com');
                      setReportModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-bold font-mono transition-colors self-start md:self-auto"
                  >
                    Escalate to Dossier
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">Prefix Typo: 2</span>
                      <code className="text-xs font-mono font-bold text-foreground">verify-acmefinancial-kyc.org</code>
                    </div>
                    <p className="text-xs text-muted-foreground">Unauthorized banking KYC claim. Hosted on bulletproof proxy IP.</p>
                  </div>
                  <button
                    onClick={() => {
                      setReportTarget('verify-acmefinancial-kyc.org');
                      setReportModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-bold font-mono transition-colors self-start md:self-auto"
                  >
                    Escalate to Dossier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TAKEDOWN REPORTS & EVIDENCE DOSSIERS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl">
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">RFC-Compliant Abuse Dossiers</h3>
                <p className="text-xs text-muted-foreground">Pre-packaged evidence packets formatted for registrar & CDN abuse desks.</p>
              </div>
              <button
                onClick={() => setReportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit New Threat Report</span>
              </button>
            </div>

            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl divide-y divide-border">
              {threatReports.map((report) => (
                <div key={report.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                        {report.id}
                      </span>
                      <code className="text-xs font-mono font-bold text-foreground">{report.target}</code>
                      <span className="text-xs font-mono text-muted-foreground">({report.category})</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{report.notes}</p>
                    <div className="text-[11px] font-mono text-emerald-500 flex items-center gap-2 pt-1">
                      <span>✓ DOM Snapshot Stored</span>
                      <span>•</span>
                      <span>✓ Authoritative WHOIS Zone Linked</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        console.info(`Downloaded RFC-2822 Abuse Evidence Packet for ${report.target}`);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 border border-border text-xs font-mono font-bold text-foreground flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-brand-500" />
                      <span>Download Packet</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* MODAL: REGISTER DIGITAL ASSET */}
      {newAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-base text-foreground">Register Official Brand Asset</h3>
            <p className="text-xs text-muted-foreground">
              Add your official domain, handle, or merchant link to the authoritative platform whitelist.
            </p>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Asset Classification *</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as any)}
                  className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="DOMAIN">Primary Domain (e.g. brand.com)</option>
                  <option value="SUBDOMAIN">Subdomain (e.g. login.brand.com)</option>
                  <option value="SOCIAL_HANDLE">Official Social Handle (@brand)</option>
                  <option value="MERCHANT">Authorized Merchant / Store</option>
                  <option value="TRADEMARK">Registered Trademark ID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Asset Value *</label>
                <input
                  type="text"
                  required
                  value={assetValue}
                  onChange={(e) => setAssetValue(e.target.value)}
                  placeholder="e.g. acmefinancial-portal.com"
                  className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 caret-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewAssetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPORT IMPERSONATION */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-base text-foreground">Report Impersonating Target</h3>
            <p className="text-xs text-muted-foreground">
              Queue a rogue domain, social profile, or listing for forensic evidence compilation.
            </p>

            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Impersonating Target URL / Handle *</label>
                <input
                  type="text"
                  required
                  value={reportTarget}
                  onChange={(e) => setReportTarget(e.target.value)}
                  placeholder="e.g. acme-online-verify.cc"
                  className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 caret-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Threat Classification</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Credential Phishing">Credential Phishing</option>
                  <option value="Executive Impersonation">Executive Impersonation</option>
                  <option value="Typosquat Domain">Typosquat Domain</option>
                  <option value="Counterfeit Storefront">Counterfeit Storefront</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Forensic Notes</label>
                <textarea
                  rows={2}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Observed credential harvest kit targeting retail customers..."
                  className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 resize-none caret-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20"
                >
                  Queue for Investigation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

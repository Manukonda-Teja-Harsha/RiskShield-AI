import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Plus, 
  Globe, 
  Share2, 
  Smartphone, 
  Tag, 
  Copy, 
  Check, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ExternalLink,
  Shield,
  FileText,
  RefreshCw,
  X,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { BrandAssetType } from '../../types';

export const BrandProfilePage: React.FC = () => {
  const { 
    activeBrandId, 
    registeredBrands, 
    brandAssets, 
    addBrandAsset, 
    verifyBrandAsset, 
    removeBrandAsset,
    updateBrandProfile,
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

  const scopedAssets = useMemo(() => {
    return brandAssets.filter(a => a.brandId === activeBrand?.id || a.brandName === activeBrand?.name);
  }, [brandAssets, activeBrand]);

  // Asset Filter Tab
  const [activeAssetType, setActiveAssetType] = useState<string>('ALL');

  // Add Asset Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAssetType, setNewAssetType] = useState<BrandAssetType>('DOMAIN');
  const [newAssetValue, setNewAssetValue] = useState('');
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [createAssetError, setCreateAssetError] = useState<string | null>(null);

  // Verification Feedback State
  const [verifyFeedback, setVerifyFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Alternative Name State
  const [newAlias, setNewAlias] = useState('');

  // Copy TXT Feedback State
  const [copiedTxtId, setCopiedTxtId] = useState<string | null>(null);

  // Verifying State
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const filteredAssets = useMemo(() => {
    if (activeAssetType === 'ALL') return scopedAssets;
    return scopedAssets.filter(a => a.type === activeAssetType);
  }, [scopedAssets, activeAssetType]);

  const handleCopyTxt = async (id: string, record: string) => {
    try {
      await navigator.clipboard.writeText(record);
      setCopiedTxtId(id);
      setTimeout(() => setCopiedTxtId(null), 2500);
    } catch (e) {}
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetValue.trim() || !activeBrand) return;

    setCreateAssetError(null);
    setIsCreatingAsset(true);
    try {
      await addBrandAsset({
        brandId: activeBrand.id,
        brandName: activeBrand.name,
        type: newAssetType,
        value: newAssetValue.trim(),
        status: 'PENDING_DNS'
      });
      setNewAssetValue('');
      setAddModalOpen(false);
      setVerifyFeedback({
        id: 'new',
        success: true,
        message: `Asset "${newAssetValue.trim()}" registered. Please publish the DNS TXT record to verify ownership.`
      });
      setTimeout(() => setVerifyFeedback(null), 6000);
    } catch (err: any) {
      setCreateAssetError(err?.message || 'Failed to register brand asset');
    } finally {
      setIsCreatingAsset(false);
    }
  };

  const handleVerifyDnsChallenge = async (id: string) => {
    setVerifyingId(id);
    setVerifyFeedback(null);
    try {
      const res = await verifyBrandAsset(id);
      setVerifyFeedback({
        id,
        success: res.verified,
        message: res.message
      });
      setTimeout(() => setVerifyFeedback(null), 6000);
    } catch (err: any) {
      setVerifyFeedback({
        id,
        success: false,
        message: err?.message || 'Verification attempt failed'
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAddAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias.trim()) return;
    const currentAliases = activeBrand.alternativeNames || [];
    if (!currentAliases.includes(newAlias.trim())) {
      updateBrandProfile(activeBrand.id, {
        alternativeNames: [...currentAliases, newAlias.trim()]
      });
    }
    setNewAlias('');
  };

  const handleRemoveAlias = (alias: string) => {
    if (activeBrand) {
      const currentAliases = activeBrand.alternativeNames || [];
      updateBrandProfile(activeBrand.id, {
        alternativeNames: currentAliases.filter(a => a !== alias)
      });
    }
  };

  if (!activeBrand) {
    return (
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-500 flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-extrabold text-foreground">
            No Brand Workspace Registered
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Register your official brand identity to manage authorized domains, subdomains, social handles, and verification records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 lg:space-y-10 animate-in fade-in duration-300">
      {/* Brand Identity Card */}
      <div className="rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-extrabold text-2xl text-white shadow-lg shrink-0"
              style={{ backgroundColor: activeBrand.accentColor }}
            >
              {activeBrand.logoInitial}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-display font-black text-foreground tracking-tight">
                  {activeBrand.name}
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {activeBrand.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeBrand.category} • Official Domain: <a href={activeBrand.website} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline font-mono">{activeBrand.website.replace('https://', '')}</a>
              </p>
            </div>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4.5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Asset</span>
          </button>
        </div>

        {/* Identity Attributes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider block">
              Brand Mission & Scope
            </span>
            <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-4 rounded-2xl border border-border">
              {activeBrand.description}
            </p>
          </div>

          {/* Alternative Names & Aliases for Threat Heuristics */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider block">
              Alternative Names & Spelling Variations (Used for Heuristics)
            </span>
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3.5">
              <div className="flex flex-wrap gap-1.5">
                {(activeBrand.alternativeNames || []).map((alias) => (
                  <span 
                    key={alias} 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-mono text-foreground font-bold"
                  >
                    <span>{alias}</span>
                    <button
                      onClick={() => handleRemoveAlias(alias)}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                      title="Remove alias"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <form onSubmit={handleAddAlias} className="flex gap-2">
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="Add alias (e.g. Acme Bank)..."
                  className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:border-brand-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!newAlias.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all disabled:opacity-40 shrink-0"
                >
                  Add Alias
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      {verifyFeedback && (
        <div className={`p-4 rounded-2xl border text-xs font-mono flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
          verifyFeedback.success
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-2">
            {verifyFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{verifyFeedback.message}</span>
          </div>
          <button
            onClick={() => setVerifyFeedback(null)}
            className="text-muted-foreground hover:text-foreground p-1 shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Official Assets Register */}
      <div className="rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Official Digital Assets Register ({scopedAssets.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified assets establish the cryptographic baseline for proactive impersonation defense.
            </p>
          </div>

          {/* Type Filter Pills */}
          <div className="flex bg-muted/40 p-1.5 rounded-xl gap-1 text-xs font-bold overflow-x-auto no-scrollbar">
            {['ALL', 'DOMAIN', 'SUBDOMAIN', 'SOCIAL_HANDLE', 'MOBILE_APP'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveAssetType(t)}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeAssetType === t
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Assets List */}
        {filteredAssets.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No assets registered in this category. Click "Register New Asset" above.
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border hover:border-border/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {asset.value}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold uppercase">
                      {asset.type}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      asset.status === 'VERIFIED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {asset.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {asset.dnsTxtRecord && (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span>DNS TXT Record:</span>
                      <code className="bg-background px-2 py-0.5 rounded border border-border text-brand-400 font-bold">
                        {asset.dnsTxtRecord}
                      </code>
                      <button
                        onClick={() => handleCopyTxt(asset.id, asset.dnsTxtRecord!)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                        title="Copy DNS TXT record"
                      >
                        {copiedTxtId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-muted-foreground block">
                    {asset.status === 'VERIFIED' ? `Verified on ${asset.verifiedAt || 'Baseline Registration'}` : 'Awaiting DNS TXT record lookup on authoritative nameserver'}
                  </span>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {asset.status !== 'VERIFIED' && (
                    <button
                      onClick={() => handleVerifyDnsChallenge(asset.id)}
                      disabled={verifyingId === asset.id}
                      className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {verifyingId === asset.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Checking DNS...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify DNS Record</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => removeBrandAsset(asset.id)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Remove asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                Register New Digital Asset
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Asset Category
                </label>
                <select
                  value={newAssetType}
                  onChange={(e) => setNewAssetType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-bold focus:outline-none focus:border-brand-500"
                >
                  <option value="DOMAIN">Primary Domain</option>
                  <option value="SUBDOMAIN">Subdomain Portal</option>
                  <option value="SOCIAL_HANDLE">Official Social Handle</option>
                  <option value="MOBILE_APP">Mobile App Package ID</option>
                  <option value="TRADEMARK">Registered Trademark</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Asset Value / Identifier
                </label>
                <input
                  type="text"
                  value={newAssetValue}
                  onChange={(e) => setNewAssetValue(e.target.value)}
                  placeholder={
                    newAssetType === 'DOMAIN' ? 'e.g. acmepayments.com' :
                    newAssetType === 'SUBDOMAIN' ? 'e.g. portal.acmepayments.com' :
                    newAssetType === 'SOCIAL_HANDLE' ? 'e.g. @acmeofficial' :
                    'e.g. com.acme.mobile.app'
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              {createAssetError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{createAssetError}</span>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Upon creation, a cryptographic DNS TXT verification challenge will be generated for domain ownership validation.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddModalOpen(false);
                    setCreateAssetError(null);
                  }}
                  disabled={isCreatingAsset}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAsset || !newAssetValue.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {isCreatingAsset && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isCreatingAsset ? 'Registering...' : 'Register Asset'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandProfilePage;

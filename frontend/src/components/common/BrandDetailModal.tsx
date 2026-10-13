import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ExternalLink, 
  ShieldCheck, 
  CheckCircle2, 
  Globe, 
  Clock, 
  Award, 
  Layers, 
  Search,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

export const BrandDetailModal: React.FC = () => {
  const { selectedBrandModal, setSelectedBrandModal, setQuickScanTarget } = useStore();
  const navigate = useNavigate();

  if (!selectedBrandModal) return null;

  const brand = selectedBrandModal;

  const handleScanAsset = (domain: string) => {
    setSelectedBrandModal(null);
    setQuickScanTarget(domain);
    if (window.location.pathname !== '/') {
      navigate('/');
    }
    const el = document.getElementById('quick-scanner');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const input = document.getElementById('quick-scanner-input') as HTMLInputElement | null;
    setTimeout(() => {
      input?.focus();
    }, 400);
  };

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="brand-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedBrandModal(null)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-3.5">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg font-mono shadow-md"
                style={{ backgroundColor: brand.accentColor }}
              >
                {brand.logoInitial}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="brand-modal-title" className="text-xl sm:text-2xl font-display font-extrabold text-foreground">
                    {brand.name}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                    brand.status === 'FEATURED_PARTNER'
                      ? 'bg-brand-500/15 text-brand-500 border border-brand-500/30'
                      : brand.status === 'VERIFIED'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  }`}>
                    <ShieldCheck className="w-3 h-3" />
                    <span>{brand.status.replace('_', ' ')}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono text-brand-500">{brand.category}</span>
                  <span>•</span>
                  <span>Registered {brand.relativeTime}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedBrandModal(null)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
              aria-label="Close brand details modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider mb-1.5">
              Brand Overview
            </h3>
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              {brand.description}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <a
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-500 hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{brand.website.replace('https://', '')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Verified Official Assets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Attested Digital Assets ({brand.verifiedDomains.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                Cryptographically Attested via DNS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {brand.verifiedDomains.map((domain) => (
                <div
                  key={domain}
                  className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between gap-2"
                >
                  <span className="font-mono text-xs text-foreground truncate">{domain}</span>
                  <button
                    onClick={() => handleScanAsset(domain)}
                    className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-mono text-brand-500 hover:text-brand-600 flex items-center gap-1 shrink-0 transition-colors"
                    title={`Scan ${domain} in Unified Scanner`}
                  >
                    <Search className="w-3 h-3" />
                    <span>Scan</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Past Work / Completed Campaigns */}
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5 mb-2.5">
              <Award className="w-3.5 h-3.5 text-brand-500" />
              <span>Past Work & Protection Campaigns</span>
            </h3>

            <div className="space-y-2.5">
              {brand.pastWork.map((pw) => (
                <div
                  key={pw.id}
                  className="p-3.5 rounded-2xl bg-card border border-border hover:border-brand-500/30 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-xs sm:text-sm text-foreground">
                      {pw.campaignTitle}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {pw.completedAt}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pw.summary}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{pw.impactMetric}</span>
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{pw.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">
              Official Whitelist Record ID: {brand.id}
            </span>
            <button
              onClick={() => handleScanAsset(brand.verifiedDomains[0] || brand.website)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>Scan Brand Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

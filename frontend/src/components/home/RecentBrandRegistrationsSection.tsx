import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  ShieldCheck, 
  Calendar, 
  ArrowUpRight, 
  Sparkles, 
  Clock, 
  ExternalLink,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface RecentBrandRegistrationsSectionProps {
  onOpenBrandAuth: () => void;
}

export const RecentBrandRegistrationsSection: React.FC<RecentBrandRegistrationsSectionProps> = ({ onOpenBrandAuth }) => {
  const { registeredBrands, setSelectedBrandModal } = useStore();

  // Sort by actual registration date, newest first
  const sortedRecentBrands = useMemo(() => {
    return [...registeredBrands]
      .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
  }, [registeredBrands]);

  return (
    <section id="recent-registrations" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border bg-muted/10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Recent Registrations Table/Cards (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold tracking-wider mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>FRESH REGISTRATIONS & NEW ONBOARDING</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground">
                Recently Registered Brands
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Newest verified companies cataloging their digital footprint on the RiskShield ledger.
              </p>
            </div>

            <span className="text-[11px] font-mono text-muted-foreground self-start sm:self-end">
              Ordered by recency (Newest first)
            </span>
          </div>

          {/* List of Recent Brands with Subtle Entrance Stagger */}
          <div className="space-y-3">
            {sortedRecentBrands.map((brand, idx) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-brand-500/40 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Brand Logo & Basic Info */}
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold font-mono text-sm shadow-inner shrink-0"
                    style={{ backgroundColor: brand.accentColor }}
                  >
                    {brand.logoInitial}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-sm sm:text-base text-foreground group-hover:text-brand-500 transition-colors">
                        {brand.name}
                      </span>
                      
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                        brand.status === 'VERIFIED' || brand.status === 'FEATURED_PARTNER'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        <span>{brand.status === 'FEATURED_PARTNER' ? 'Verified' : brand.status.replace('_', ' ')}</span>
                      </span>

                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-500/15 text-brand-500 border border-brand-500/30">
                          Newest Registration
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span className="font-mono text-brand-500">{brand.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span>{brand.relativeTime}</span>
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[11px]">{brand.verifiedAssetsCount} assets attested</span>
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedBrandModal(brand)}
                    className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 border border-border text-xs font-semibold text-foreground group-hover:border-brand-500/40 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span>Explore Brand</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-brand-500" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column: Promotional Onboarding Action Card (4 Cols) */}
        <div className="lg:col-span-4 bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 sticky top-24">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-foreground">
                Join the Verified Brand Registry
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                Free Cryptographic Whitelist
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              Are you a domain or corporate trademark owner? Catalog your legitimate web endpoints, mobile portals, and support handles to shield customers against lookalike phishing schemes.
            </p>
            
            <div className="space-y-2 pt-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-[11px] text-foreground">DNS TXT record validation within 18 minutes</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-[11px] text-foreground">Immunity against automated false-positive warnings</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-[11px] text-foreground">Autonomous typosquat radar monitoring</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenBrandAuth}
              type="button"
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs tracking-wide shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Your Brand Now</span>
            </button>
            <span className="text-[10px] font-mono text-muted-foreground text-center block mt-2">
              No credit card required for standard verification
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};

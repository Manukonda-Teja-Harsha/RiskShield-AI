import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../../store/useStore';

export const FeaturedBrandCardsSection: React.FC = () => {
  const { registeredBrands, setSelectedBrandModal } = useStore();
  const totalBrands = registeredBrands.length;

  // Responsive desktop detection (>= 768px shows 3 cards, < 768px shows 1 card)
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Triple the array to create an infinite, continuous circular loop
  const allBrands = useMemo(() => {
    if (totalBrands === 0) return [];
    return [...registeredBrands, ...registeredBrands, ...registeredBrands];
  }, [registeredBrands, totalBrands]);

  // Start in the middle cycle at Acme Financial
  const initialIndex = useMemo(() => {
    if (totalBrands === 0) return 0;
    const acmeIdx = registeredBrands.findIndex(b => b.slug === 'acme-financial');
    const baseIdx = acmeIdx >= 0 ? acmeIdx : 0;
    return totalBrands + baseIdx;
  }, [registeredBrands, totalBrands]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);

  // Auto-advance carousel smoothly and continuously every 2.8s
  useEffect(() => {
    if (isPaused || totalBrands < 2) return;

    // Respect reduced-motion accessibility settings
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((prev) => prev + 1);
    }, 2800);

    return () => clearInterval(timer);
  }, [isPaused, totalBrands]);

  // Handle wraparound seamlessly: when end of cycle 2 is reached, reset silently to cycle 1
  // This guarantees that when the last card passes, its next card is always the first card without end.
  const handleAnimationComplete = () => {
    if (totalBrands === 0) return;

    if (activeIndex >= totalBrands * 2) {
      setSkipTransition(true);
      setActiveIndex(activeIndex - totalBrands);
    } else if (activeIndex < totalBrands) {
      setSkipTransition(true);
      setActiveIndex(activeIndex + totalBrands);
    }
  };

  // Re-enable smooth transition on next animation frame after silent reset
  useEffect(() => {
    if (skipTransition) {
      const raf = requestAnimationFrame(() => {
        setSkipTransition(false);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [skipTransition]);

  // Track translation:
  // Desktop: centered card is index `activeIndex`, so track translates by -(activeIndex - 1) * 33.333%
  // Mobile: active card fills screen, translates by -activeIndex * 100%
  const trackTranslateX = isDesktop
    ? -((activeIndex - 1) * (100 / 3))
    : -(activeIndex * 100);

  // Normalized active brand index (0 to totalBrands - 1) for indicators
  const normalizedIndex = totalBrands > 0 ? ((activeIndex % totalBrands) + totalBrands) % totalBrands : 0;
  const currentFeaturedBrand = registeredBrands[normalizedIndex];

  if (totalBrands === 0) {
    return (
      <section id="featured-brands" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="text-center p-12 rounded-3xl bg-card border border-border max-w-xl mx-auto">
          <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-foreground mb-1">No Registered Brands Yet</h3>
          <p className="text-xs text-muted-foreground">Be the first enterprise to register official digital assets on RiskShield AI.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="featured-brands" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border">
      {/* Clean Section Header (Arrows and upside rotation notifications removed) */}
      <div className="max-w-2xl mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-mono font-bold tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>FEATURED PARTNERS & BRAND SHOWCASE</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-foreground">
          Discover Verified Platform Brands
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          Continuously rotating showcase of organizations that have attested their digital assets on the RiskShield cryptographic ledger.
        </p>
      </div>

      {/* CAROUSEL CARDS WRAPPER: Hover Pause handlers are attached strictly here */}
      <div 
        className="carousel-cards-wrapper relative w-full overflow-hidden py-4 select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Continuous Motion Track: smoothly glides from brand to brand */}
        <motion.div
          className="flex items-stretch"
          animate={{ x: `${trackTranslateX}%` }}
          transition={
            skipTransition
              ? { duration: 0 }
              : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
          }
          onAnimationComplete={handleAnimationComplete}
        >
          {allBrands.map((brand, idx) => {
            const isCenter = idx === activeIndex;

            return (
              <div
                key={`${brand.id}-${idx}`}
                className={`shrink-0 p-3 flex ${
                  isDesktop ? 'w-1/3' : 'w-full'
                }`}
              >
                <motion.div
                  animate={{
                    scale: isCenter ? (isDesktop ? 1.03 : 1) : 1,
                    borderColor: isCenter ? 'rgba(255, 85, 0, 0.85)' : 'var(--border)',
                    boxShadow: isCenter
                      ? '0 0 30px rgba(255, 85, 0, 0.22), 0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                      : '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}
                  transition={
                    skipTransition
                      ? { duration: 0 }
                      : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
                  }
                  onClick={() => setSelectedBrandModal(brand)}
                  className={`w-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between h-full bg-card border-2 relative transition-colors duration-200 cursor-pointer ${
                    isCenter
                      ? 'z-20 glow-orange-sm'
                      : 'z-10 hover:border-brand-500/40 hover:bg-card/95 group'
                  }`}
                >
                  {/* Highlight Banner on Center Card */}
                  <motion.div
                    animate={{
                      opacity: isCenter ? 1 : 0,
                      scale: isCenter ? 1 : 0.85,
                      y: isCenter ? 0 : -6
                    }}
                    transition={
                      skipTransition
                        ? { duration: 0 }
                        : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
                    }
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-brand-500 to-amber-500 text-white font-mono font-bold text-[11px] shadow-md flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Featured Platform Partner</span>
                  </motion.div>

                  <div>
                    {/* Brand Header: Logo, Name & Verification Pill */}
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-2xl flex items-center justify-center text-white font-bold font-mono shadow-md transition-all duration-300 ${
                            isCenter ? 'w-13 h-13 text-xl' : 'w-11 h-11 text-base'
                          }`}
                          style={{ backgroundColor: brand.accentColor }}
                        >
                          {brand.logoInitial}
                        </div>
                        <div>
                          <h3 className="font-display font-extrabold text-base sm:text-lg text-foreground flex items-center gap-1.5 leading-snug">
                            <span>{brand.name}</span>
                            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          </h3>
                          <span className="text-[11px] font-mono text-muted-foreground block">
                            {brand.category}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 transition-colors ${
                        isCenter 
                          ? 'bg-brand-500/15 text-brand-500 border border-brand-500/30' 
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {brand.status === 'FEATURED_PARTNER' ? 'Featured' : brand.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Short Description */}
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-2">
                      {brand.description}
                    </p>

                    {/* Relevant Registration & Activity Telemetry */}
                    <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/50 border border-border mb-6 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Attested Assets:</span>
                        <span className="font-bold text-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{brand.verifiedAssetsCount} Domains & Handles</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Registered Since:</span>
                        <span className="text-foreground">{brand.relativeTime}</span>
                      </div>

                      {brand.pastWork[0] && (
                        <div className="pt-2 border-t border-border flex items-start justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">Latest Work:</span>
                          <span className="text-[11px] text-right font-medium text-brand-500 truncate max-w-[160px]">
                            {brand.pastWork[0].campaignTitle}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBrandModal(brand);
                      }}
                      className={`w-full py-3 px-4 rounded-2xl font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 active:scale-95 ${
                        isCenter
                          ? 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25'
                          : 'bg-muted hover:bg-muted/80 text-foreground border border-border hover:border-brand-500/40'
                      }`}
                    >
                      <span>{isCenter ? 'Explore Featured Work' : 'View Brand & Work'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Pagination Position Dots and Carousel Indicators */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-xs font-mono text-muted-foreground order-2 sm:order-1">
          Brand {normalizedIndex + 1} of {totalBrands}: <strong className="text-foreground">{currentFeaturedBrand?.name}</strong> currently featured in center.
        </p>

        {/* Indicator Dots */}
        <div className="flex items-center gap-1.5 order-1 sm:order-2" aria-label="Brand carousel navigation dots">
          {registeredBrands.map((b, i) => (
            <button
              key={b.id}
              onClick={() => {
                setActiveIndex(totalBrands + i);
              }}
              title={`Switch to ${b.name}`}
              aria-label={`Go to ${b.name}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === normalizedIndex
                  ? 'w-7 bg-brand-500 shadow-sm shadow-orange-500/50'
                  : 'w-2 bg-border hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

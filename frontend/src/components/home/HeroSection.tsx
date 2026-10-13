import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ShieldAlert, Building2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { executeScan } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { RiskBadge } from '../common/RiskBadge';
import { ScanResult } from '../../types';

interface HeroSectionProps {
  onOpenBrandAuth: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenBrandAuth }) => {
  const navigate = useNavigate();
  const { user, addScanResult, quickScanTarget, setQuickScanTarget } = useStore();
  const [urlInput, setUrlInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickResult, setQuickResult] = useState<ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // In-page listener for external triggers (e.g. from BrandDetailModal or Workflow CTA)
  useEffect(() => {
    if (quickScanTarget) {
      setUrlInput(quickScanTarget);
      setQuickScanTarget(null);
      const el = document.getElementById('quick-scanner');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
    }
  }, [quickScanTarget, setQuickScanTarget]);

  const handleLaunchScanner = () => {
    const el = document.getElementById('quick-scanner');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    inputRef.current?.focus();
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = urlInput.trim();
    if (!target) {
      setError('Please enter a URL or web address to analyze.');
      return;
    }

    // Authentication Guard Check:
    // If not logged in, redirect user to login page while preserving target link
    if (!user) {
      setQuickScanTarget(target);
      try {
        localStorage.setItem('riskshield_pending_scan', target);
      } catch (err) {}

      navigate('/login', {
        state: {
          from: '/dashboard',
          pendingScanTarget: target,
        },
      });
      return;
    }

    // User is authenticated: execute scan
    setError(null);
    setIsScanning(true);
    setQuickResult(null);

    try {
      const result = await executeScan({ target, mode: 'url' });
      setQuickResult(result);
      addScanResult(result);
    } catch (err) {
      setError('An unexpected error occurred during scan execution.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <section className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Trust & Transparency Pill */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 dark:text-brand-400 text-xs font-mono font-medium shadow-sm">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span>Evidence-Based Digital Risk Protection Platform</span>
        </div>
      </motion.div>

      {/* Main Headline */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-center max-w-4xl mx-auto mb-8"
      >
        <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-foreground leading-[1.12]">
          Detect Deceptive Scams &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-amber-500">
            Brand Impersonation
          </span>{' '}
          Before Damage Occurs.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          RiskShield AI aggregates external threat feeds, domain telemetry, and brand verification records to deliver transparent, evidence-backed verdicts for everyday users and commercial brands.
        </p>
      </motion.div>

      {/* Quick Scanner Interactive Form */}
      <motion.div 
        id="quick-scanner"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-3xl mx-auto bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden scroll-mt-28"
      >
        <form onSubmit={handleScanSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="quick-scanner-input"
                ref={inputRef}
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter a suspicious URL (e.g. verify-account-login.top or google.com)"
                className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all caret-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={isScanning}
              className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
            >
              {isScanning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing Evidence...</span>
                </>
              ) : (
                <>
                  <span>Scan a Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400 font-mono pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Quick Example Chips */}
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">Sample tests:</span>
            <button
              type="button"
              onClick={() => setUrlInput('https://chase-security-verify-session.top')}
              className="font-mono text-brand-500 hover:underline"
            >
              chase-security.top
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setUrlInput('https://apple.com')}
              className="font-mono text-brand-500 hover:underline"
            >
              apple.com (clean)
            </button>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground/70">
            Unified Heuristics Engine v2.0
          </span>
        </div>

        {/* Live Inline Result Card if Scanned */}
        {quickResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-5 rounded-2xl bg-muted/50 border border-border space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <RiskBadge status={quickResult.status} size="md" />
              <span className="text-[11px] font-mono text-muted-foreground">
                Score: {quickResult.score}/100
              </span>
            </div>

            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              {quickResult.explanation}
            </p>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground">
                Target: <code className="text-foreground">{quickResult.target}</code>
              </span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified in Current Session</span>
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Dual Route CTAs */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleLaunchScanner}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-muted hover:bg-muted/80 border border-border text-xs sm:text-sm font-semibold text-foreground transition-all active:scale-95 shadow-sm"
        >
          <ShieldAlert className="w-4 h-4 text-brand-500" />
          <span>Launch Full Unified Scanner</span>
        </button>

        <button
          onClick={() => navigate('/login', { state: { initialRole: 'brand_owner' } })}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-card hover:bg-muted border border-border text-xs sm:text-sm font-semibold text-foreground transition-all hover:border-brand-500/40"
        >
          <Building2 className="w-4 h-4 text-amber-500" />
          <span>Protect Your Brand Digital Identity</span>
        </button>
      </div>
    </section>
  );
};

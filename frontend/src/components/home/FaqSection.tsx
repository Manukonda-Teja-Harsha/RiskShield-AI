import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSectionProps {
  onOpenAuth?: () => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ onOpenAuth }) => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleCtaClick = () => {
    if (!user) {
      navigate('/login');
      return;
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

  const faqs: FaqItem[] = [
    {
      q: 'What does RiskShield AI check during a scan?',
      a: 'RiskShield AI evaluates domain registration recency (WHOIS age), SSL/TLS Certificate Transparency logs, DNS zone records, URL redirect chains, Unicode homoglyph lookalikes (e.g. Cyrillic letters mimicking Latin trademarks), and known active threat indicators from connected repositories like PhishTank and URLhaus.'
    },
    {
      q: 'How does a scan work from start to finish?',
      a: 'When you submit a URL or text snippet, our preprocessor cleans tracking parameters and strips any identifiable personal tokens (PII). Next, technical domain signals are gathered concurrently with feed adapter queries. Finally, our rule-based aggregator synthesizes the collected indicators into an explainable verdict with specific recommended actions.'
    },
    {
      q: 'What do the platform risk statuses mean?',
      a: 'We use 5 canonical statuses: 1) KNOWN_THREAT (confirmed malicious on verified threat feeds); 2) HIGH_RISK (severe impersonation or homoglyph indicators on newly registered domain); 3) SUSPICIOUS (elevated anomalies such as coercive urgency or masked WHOIS); 4) INCONCLUSIVE (upstream API failure or unreachable host); and 5) NO_KNOWN_THREAT_DETECTED (no active alerts found; healthy digital skepticism still advised).'
    },
    {
      q: 'Can RiskShield AI detect every possible scam or zero-day threat?',
      a: 'No automated security system can guarantee 100% zero-day prevention. Newly registered domains or targeted spear-phishing lures without prior public telemetry might not immediately trigger blocklists. That is why RiskShield AI explains supporting technical evidence rather than claiming absolute safety.'
    },
    {
      q: 'How does brand verification work for corporate asset owners?',
      a: 'Brand owners verify domain ownership by adding an authoritative DNS TXT record challenge (e.g. riskshield-verification=...) or completing corporate domain email confirmation. Once verified, the brand assets populate the platform whitelist to protect customers from lookalike clones.'
    },
    {
      q: 'What happens when a threat source or external feed is unavailable?',
      a: 'If an external feed adapter experiences a network timeout or 5xx server failure, RiskShield AI fails safe: it never marks the target as clean. Instead, it emits an INCONCLUSIVE status with an explicit note detailing which source check was temporarily unreachable.'
    },
    {
      q: 'How are submitted scan data and personal scan history handled?',
      a: 'Your submitted URLs and text snippets are processed ephemerally in RAM for feature extraction. We do not sell, broker, or monetize your scan queries. Authenticated users retain full control over their personal scan history vault with the ability to delete individual records or purge history at any time.'
    }
  ];

  return (
    <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-mono font-medium mb-3">
          <HelpCircle className="w-3.5 h-3.5" />
          Transparency & Guidance
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Honest answers regarding detection accuracy, risk statuses, brand verification, and data handling.
        </p>
      </div>

      {/* Accordion Container */}
      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isOpen 
                  ? 'bg-card border-brand-500/40 shadow-lg shadow-orange-500/5' 
                  : 'bg-card/60 border-border hover:border-border/80'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl"
              >
                <span className="font-display font-semibold text-sm sm:text-base text-foreground">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-brand-500' : ''
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Final Action CTA Block */}
      <div className="mt-16 text-center bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground">
            Encountered an Unverified Link or Suspicious Message?
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Run an instant heuristic analysis before clicking or submitting credentials. It takes less than two seconds.
          </p>
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={handleCtaClick}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-orange-700 text-white font-bold text-sm tracking-wide shadow-xl shadow-orange-500/25 transition-all flex items-center gap-2 active:scale-95"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Scan a Link Free Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

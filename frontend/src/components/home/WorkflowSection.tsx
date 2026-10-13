import React from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Cpu, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface WorkflowStep {
  step: string;
  title: string;
  action: string;
  desc: string;
  detail: string;
  tag: string;
  icon: React.ElementType;
  accent: string;
}

export const WorkflowSection: React.FC = () => {
  const handleTryScanner = () => {
    const el = document.getElementById('quick-scanner');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const input = document.getElementById('quick-scanner-input') as HTMLInputElement | null;
    setTimeout(() => {
      input?.focus();
    }, 400);
  };

  const steps: WorkflowStep[] = [
    {
      step: '01',
      title: 'Submit',
      action: 'Submit Indicator',
      desc: 'Users submit a suspicious URL, pasted scam message, public social profile handle, or brand domain for verification.',
      detail: 'Strips identifiable PII tokens, extracts destination hostnames, and schedules concurrent API adapter queries.',
      tag: 'Indicator Ingestion',
      icon: Search,
      accent: '#FF5500'
    },
    {
      step: '02',
      title: 'Analyze',
      action: 'Analyze Signals',
      desc: 'The engine evaluates WHOIS domain registration recency, SSL Certificate Transparency logs, DNS records, and threat feeds.',
      detail: 'Calculates Levenshtein homoglyph distance against our cryptographic brand registry to spot typosquats.',
      tag: 'Heuristic Telemetry',
      icon: Cpu,
      accent: '#F59E0B'
    },
    {
      step: '03',
      title: 'Verify',
      action: 'Verify Evidence',
      desc: 'The system synthesizes collected signals into an explainable assessment mapped to one of 5 canonical platform risk statuses.',
      detail: 'Produces itemized technical evidence factors without black-box scores or fabricated safety claims.',
      tag: 'Verifiable Assessment',
      icon: ShieldCheck,
      accent: '#10B981'
    },
    {
      step: '04',
      title: 'Protect',
      action: 'Take Action & Protect',
      desc: 'Users receive clear mitigation guidance. Brand owners export RFC-compliant abuse dossiers or track typosquats via Radar.',
      detail: 'Empowers fast domain registrar escalations and updates the public whitelist registry.',
      tag: 'Actionable Defense',
      icon: ShieldAlert,
      accent: '#3B82F6'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border scroll-mt-20">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-mono font-bold tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>FOUR-STAGE PROTECTION WORKFLOW</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-foreground tracking-tight">
          How RiskShield AI Works
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
          From indicator triage to cryptographic attestation—an explainable, evidence-backed workflow for consumers and brand owners.
        </p>
      </div>

      {/* Connected 4-Step Workflow Grid */}
      <div className="relative">
        {/* Subtle Horizontal Connecting Line (Desktop) */}
        <div 
          aria-hidden="true" 
          className="hidden md:block absolute top-[2.4rem] left-[6%] right-[6%] h-0.5 bg-gradient-to-r from-brand-500/30 via-amber-500/30 to-emerald-500/30 -z-0"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
          {steps.map((st, idx) => {
            const Icon = st.icon;

            return (
              <motion.div
                key={st.step}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="rounded-3xl p-6 sm:p-7 bg-card border border-border hover:border-brand-500/40 shadow-lg flex flex-col justify-between transition-all duration-300 group relative"
              >
                <div>
                  {/* Step Header with Step Badge & Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <span 
                      className="text-xs font-mono font-extrabold px-3 py-1 rounded-full border shadow-sm flex items-center gap-1"
                      style={{ 
                        backgroundColor: `${st.accent}15`, 
                        borderColor: `${st.accent}35`,
                        color: st.accent
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.accent }} />
                      <span>STEP {st.step}</span>
                    </span>

                    <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground group-hover:text-brand-500 transition-colors shadow-sm">
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  </div>

                  {/* Title & Headline */}
                  <div className="mb-3">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-0.5">
                      {st.tag}
                    </span>
                    <h3 className="font-display font-extrabold text-lg text-foreground group-hover:text-brand-500 transition-colors">
                      {st.title} — {st.action}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                    {st.desc}
                  </p>
                </div>

                {/* Technical Footnote */}
                <div className="pt-4 border-t border-border text-[11px] font-mono text-muted-foreground/80 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{st.detail}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Responsible Disclosure & System Scope Notice */}
      <div className="mt-12 p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-4xl mx-auto">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Evidence-Based Assessment:</strong> Verifications represent automated technical indicators available at scan time. Unreported zero-day domains benefit from multi-layered defense and ongoing brand monitoring.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTryScanner}
          className="shrink-0 px-4 py-2 rounded-xl bg-card hover:bg-muted border border-border text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1.5 whitespace-nowrap active:scale-95 shadow-sm"
        >
          <span>Try Scanner</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};

export default WorkflowSection;

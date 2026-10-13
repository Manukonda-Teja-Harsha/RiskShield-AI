import React from 'react';
import { motion } from 'framer-motion';
import { Search, Database, Cpu, AlertCircle, ArrowRight } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Scan Indicator',
      desc: 'Submit a suspicious URL, pasted scam text, public social handle, or counterfeit listing.',
      icon: Search,
      detail: 'Parses raw text, strips PII tokens, and extracts underlying destination hostnames.'
    },
    {
      step: '02',
      title: 'Collect Evidence',
      desc: 'Checks domain registration age, SSL Certificate Transparency, DNS zone records, and external feeds.',
      icon: Database,
      detail: 'Queries PhishTank/URLhaus adapters and calculates Levenshtein homoglyph distance against brand registries.'
    },
    {
      step: '03',
      title: 'Assess Risk',
      desc: 'Generates an explainable canonical verdict with itemized supporting indicators and safe actions.',
      icon: Cpu,
      detail: 'Maps evidence deterministically to KNOWN_THREAT, HIGH_RISK, SUSPICIOUS, or NO_KNOWN_THREAT_DETECTED.'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-xs font-mono uppercase font-bold text-brand-500 tracking-wider">
          Verification Pipeline
        </span>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-foreground mt-2">
          How RiskShield AI Evaluates Evidence
        </h2>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          Every submitted resource undergoes structured evidence collection. We don't issue opaque scores; we provide itemized technical proof.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((st, idx) => {
          const Icon = st.icon;
          return (
            <motion.div
              key={st.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.15 }}
              className="p-7 rounded-3xl bg-card border border-border flex flex-col justify-between relative group hover:border-brand-500/40 transition-all shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20">
                    STEP {st.step}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground group-hover:text-brand-500 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="font-display font-bold text-lg text-foreground mb-2">
                  {st.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                  {st.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-border text-[11px] font-mono text-muted-foreground/80">
                {st.detail}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Responsible Detection Notice */}
      <div className="mt-10 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3 max-w-3xl mx-auto">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Evidence-Dependent Verdicts:</strong> Platform findings represent automated technical assessments based on evidence available at scan time. Newly registered domains without prior reporting may not trigger active alerts immediately.
        </p>
      </div>
    </section>
  );
};

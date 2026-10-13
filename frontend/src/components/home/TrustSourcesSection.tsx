import React from 'react';
import { motion } from 'framer-motion';
import { Database, ShieldCheck, Globe, Server, CheckCircle2 } from 'lucide-react';

export const TrustSourcesSection: React.FC = () => {
  const sources = [
    {
      name: 'PhishTank Community Feed',
      type: 'Candidate Phishing Adapter',
      desc: 'Community-verified phishing URL clearinghouse and active fraud signatures.',
      icon: Database,
      tag: 'Phishing Feed'
    },
    {
      name: 'URLhaus Threat Repository',
      type: 'Malware & Payload Feed',
      desc: 'Open sharing project by abuse.ch tracking cyberattack infrastructure and malware hosts.',
      icon: Server,
      tag: 'Malware Feeds'
    },
    {
      name: 'Google Safe Browsing / Web Risk',
      type: 'Permitted API Adapter',
      desc: 'API service analyzing public web resources against continuously updated deceptive web lists.',
      icon: Globe,
      tag: 'Global Index'
    },
    {
      name: 'RiskShield Verified Intelligence',
      type: 'Authoritative Internal DB',
      desc: 'Cryptographically registered brand domains, reviewed community reports, and homoglyph dictionaries.',
      icon: ShieldCheck,
      tag: 'Proprietary Rules'
    }
  ];

  return (
    <section className="py-16 border-t border-border bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono uppercase font-bold text-brand-500 tracking-wider">
            Multi-Source Threat Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground mt-2">
            Intelligence Providers & Detection Sources
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            RiskShield AI cross-references technical telemetry and verified feeds. We only display actual configured data sources—never fabricated customer claims.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sources.map((src, idx) => {
            const Icon = src.icon;
            return (
              <motion.div
                key={src.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.1 }}
                whileHover={{ y: -3 }}
                className="p-5 rounded-2xl bg-card border border-border hover:border-brand-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-brand-500">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {src.tag}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-sm text-foreground mb-1">
                    {src.name}
                  </h3>
                  <div className="text-[11px] font-mono text-brand-500 mb-2">
                    {src.type}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {src.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Adapter Schema Ready</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

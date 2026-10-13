import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, MessageSquareWarning, UserX, Store, ArrowRight, Eye, Layers } from 'lucide-react';

export const CapabilitiesSection: React.FC = () => {
  const capabilities = [
    {
      title: 'Phishing & Malicious URL Checks',
      desc: 'Dissects domain entropy, homoglyph lookalike characters, SSL Certificate Transparency, and malicious redirect hops.',
      icon: ShieldCheck,
      factors: ['Levenshtein Distance', 'WHOIS Registration Age', 'Punycode Normalization']
    },
    {
      title: 'Suspicious Message Analysis',
      desc: 'Evaluates pasted SMS, WhatsApp, and email snippets for coercive urgency, unauthorized banking alerts, and rogue links.',
      icon: MessageSquareWarning,
      factors: ['PII Scrubbing', 'Linguistic Urgency Score', 'Link Extraction']
    },
    {
      title: 'Public Profile Verification',
      desc: 'Checks public social media handles against verified brand baselines to identify newly created impersonation clones.',
      icon: UserX,
      factors: ['Handle Typo-Squatting', 'Creation Recency', 'Verified Brand Match']
    },
    {
      title: 'Counterfeit Product Listings',
      desc: 'Inspects marketplace store links and checkout URLs for brand trademark infringement and unauthorized seller patterns.',
      icon: Store,
      factors: ['Authorized Seller Registry', 'Domain Trust', 'Payment Form Integrity']
    }
  ];

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <span className="text-xs font-mono uppercase font-bold text-brand-500 tracking-wider">
            Detection Vectors
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-foreground mt-2">
            Multi-Vector Risk Protection
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            A comprehensive suite of analyzers designed to catch modern scams across domains, text communications, and public profiles.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card hover:bg-muted border border-border text-xs font-bold text-brand-500 transition-all hover:border-brand-500/40 w-fit"
        >
          <span>Open Unified Scanner</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {capabilities.map((cap, idx) => {
          const Icon = cap.icon;
          return (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.1 }}
              className="p-6 rounded-3xl bg-card border border-border flex flex-col justify-between hover:border-brand-500/40 transition-all"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-brand-500 mb-5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-2">
                  {cap.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  {cap.desc}
                </p>
              </div>

              <div className="space-y-1.5 pt-4 border-t border-border">
                {cap.factors.map((f, i) => (
                  <div key={i} className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500/70" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Illustrative Interface Sandbox Preview */}
      <div className="mt-12 rounded-3xl bg-muted/40 border border-border p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
              Illustrative Heuristic UI Sandbox
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            Clearly Labelled: Illustrative Model
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground block mb-1">Vector 01: Lexical Entropy</span>
            <span className="text-foreground font-bold">Levenshtein Edit Distance: 1</span>
            <p className="text-[11px] text-muted-foreground mt-1">Detects homoglyphs like "paypa1.com" vs "paypal.com".</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground block mb-1">Vector 02: Registration Recency</span>
            <span className="text-foreground font-bold">Domain Age: &lt; 7 Days</span>
            <p className="text-[11px] text-muted-foreground mt-1">Newly spun up domains carrying elevated risk weighting.</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <span className="text-muted-foreground block mb-1">Vector 03: SSL Validity Context</span>
            <span className="text-foreground font-bold">DV Cert ≠ Business Trust</span>
            <p className="text-[11px] text-muted-foreground mt-1">Explains why HTTPS encryption alone does not prove authenticity.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
